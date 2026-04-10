// ============================================================
// RANGER TRANCHES — TRANCHE ENGINE
//
// Stateful orchestration of the tranche accounting model.
// All state updates are immutable (spread-and-replace).
// Never mutates inputs. Always returns new AppState.
//
// Imports: math.ts, types.ts, constants only.
// MUST NOT import from lib/scenarios/ — no circular deps.
// ============================================================

import type {
  AppState,
  Deposit,
  Redemption,
  TrancheId,
  TrancheState,
  VaultState,
  WaterfallConfig,
  WaterfallResult,
} from './types';
import {
  DEFAULT_PROTOCOL_FEE,
  MIN_DEPOSIT_AMOUNT,
  SENIOR_TARGET_APY,
  SENIOR_TRANCHE_RATIO,
  JUNIOR_TRANCHE_RATIO,
  STATE_SCHEMA_VERSION,
} from '../constants';
import {
  computeAssetsForRedemption,
  computeGrossYield,
  computeInitialTrancheValues,
  computeJuniorResidualYield,
  computeNavPerShare,
  computeProjectedApy,
  computeSharesForDeposit,
  computeSeniorTargetYield,
} from './math';

// ----------------------------------------------------------------
// Default waterfall config — matches all locked design decisions
// ----------------------------------------------------------------
export const DEFAULT_WATERFALL_CONFIG: WaterfallConfig = {
  seniorRatio: SENIOR_TRANCHE_RATIO,
  juniorRatio: JUNIOR_TRANCHE_RATIO,
  seniorTargetApy: SENIOR_TARGET_APY,
  protocolFee: DEFAULT_PROTOCOL_FEE,
  enableReserveBuffer: false,
  reserveFraction: 0,
};

// ----------------------------------------------------------------
// createInitialState
// ----------------------------------------------------------------

/**
 * Build the initial AppState from a vault snapshot and waterfall config.
 * Splits vault assets 70/30, sets NAV=1.0, computes initial projected APYs.
 */
export function createInitialState(
  vaultState: VaultState,
  config: WaterfallConfig
): AppState {
  const { seniorValue, juniorValue } = computeInitialTrancheValues(
    vaultState.totalAssets,
    config.seniorRatio,
    config.juniorRatio
  );

  // Compute initial projected APYs by running waterfall projection for 365 days
  const { seniorApy, juniorApy } = computeProjectedApys(
    vaultState,
    config,
    vaultState.currentApy
  );

  const senior: TrancheState = {
    trancheId: 'senior',
    totalDeposited: seniorValue,
    totalShares: seniorValue, // initial NAV = 1.0, so shares == USDC deposited
    navPerShare: 1.0,
    currentValue: seniorValue,
    projectedApy: seniorApy,
    isExhausted: false,
  };

  const junior: TrancheState = {
    trancheId: 'junior',
    totalDeposited: juniorValue,
    totalShares: juniorValue,
    navPerShare: 1.0,
    currentValue: juniorValue,
    projectedApy: juniorApy,
    isExhausted: false,
  };

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    vault: vaultState,
    senior,
    junior,
    waterfallConfig: config,
    deposits: [],
    redemptions: [],
    activeScenario: 'normal',
    warnings: {
      juniorExhausted: false,
      seniorAbsorbingLosses: false,
    },
  };
}

// ----------------------------------------------------------------
// deposit
// ----------------------------------------------------------------

/**
 * Record a user deposit into a tranche.
 * Returns a new AppState — does not mutate the input state.
 *
 * NAV stays constant on deposit: new USDC enters at current NAV,
 * minting proportional shares. Fair to existing depositors.
 */
export function deposit(
  state: AppState,
  trancheId: TrancheId,
  amountUsdc: number
): AppState {
  if (amountUsdc < MIN_DEPOSIT_AMOUNT) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT_AMOUNT} USDC`);
  }

  const tranche = state[trancheId];
  const shares = computeSharesForDeposit(amountUsdc, tranche.navPerShare);

  const updatedTranche: TrancheState = {
    ...tranche,
    totalDeposited: tranche.totalDeposited + amountUsdc,
    totalShares: tranche.totalShares + shares,
    currentValue: tranche.currentValue + amountUsdc,
    // navPerShare unchanged — new capital enters at current NAV
  };

  const record: Deposit = {
    depositId: crypto.randomUUID(),
    trancheId,
    amount: amountUsdc,
    sharesReceived: shares,
    navAtDeposit: tranche.navPerShare,
    depositedAt: Date.now(),
  };

  return {
    ...state,
    [trancheId]: updatedTranche,
    deposits: [...state.deposits, record],
  };
}

// ----------------------------------------------------------------
// redeem
// ----------------------------------------------------------------

/**
 * Record a user redemption from a tranche.
 * Returns a new AppState — does not mutate the input state.
 *
 * totalDeposited is a historical accounting field and is not decremented.
 */
export function redeem(
  state: AppState,
  trancheId: TrancheId,
  shares: number
): AppState {
  if (shares <= 0) throw new Error('Shares must be positive');

  const tranche = state[trancheId];
  if (shares > tranche.totalShares) {
    throw new Error(
      `Cannot redeem ${shares} shares — tranche only has ${tranche.totalShares}`
    );
  }

  const amountReturned = computeAssetsForRedemption(shares, tranche.navPerShare);
  const newTotalShares = tranche.totalShares - shares;
  const newCurrentValue = tranche.currentValue - amountReturned;

  const updatedTranche: TrancheState = {
    ...tranche,
    totalShares: newTotalShares,
    currentValue: newCurrentValue,
    navPerShare: computeNavPerShare(newCurrentValue, newTotalShares),
    isExhausted: newCurrentValue <= 0,
  };

  const record: Redemption = {
    redemptionId: crypto.randomUUID(),
    trancheId,
    sharesBurned: shares,
    amountReturned,
    navAtRedemption: tranche.navPerShare,
    redeemedAt: Date.now(),
  };

  return {
    ...state,
    [trancheId]: updatedTranche,
    redemptions: [...state.redemptions, record],
  };
}

// ----------------------------------------------------------------
// applyWaterfall
// ----------------------------------------------------------------

/**
 * Apply the yield or loss waterfall to the current state.
 * Returns a new AppState and the WaterfallResult breakdown.
 *
 * Waterfall order (yield scenario):
 *   1. Gross yield from vault
 *   2. Protocol fee deducted (only on positive yield)
 *   3. Reserve buffer (if enabled)
 *   4. Senior paid up to its target APY first
 *   5. Remaining yield goes to junior
 *
 * Loss scenario:
 *   1. Junior absorbs losses first
 *   2. Senior absorbs only after junior is exhausted
 */
export function applyWaterfall(
  state: AppState,
  baseApy: number,
  days: number
): { newState: AppState; result: WaterfallResult } {
  const { senior, junior, waterfallConfig: config } = state;

  const totalAssets = senior.currentValue + junior.currentValue;

  // Step 1: Gross yield
  const grossYield = computeGrossYield(totalAssets, baseApy, days);

  // Step 2: Protocol fee — only on positive yield
  const protocolFeeAmount = grossYield > 0 ? grossYield * config.protocolFee : 0;

  // Step 3: Reserve buffer (MVP default: disabled)
  const reserveAmount =
    config.enableReserveBuffer && grossYield > 0
      ? (grossYield - protocolFeeAmount) * config.reserveFraction
      : 0;

  // Step 4: Distributable yield
  const distributableYield = grossYield - protocolFeeAmount - reserveAmount;

  // Step 5: Senior target yield
  const seniorTargetYield = computeSeniorTargetYield(
    senior.currentValue,
    config.seniorTargetApy,
    days
  );

  // Step 6: Branch — yield vs loss
  let seniorYield: number;
  let juniorYield: number;
  let seniorTargetMet: boolean;
  let juniorExhausted: boolean;
  let seniorAbsorbingLosses: boolean;

  if (distributableYield >= 0) {
    // Yield scenario
    seniorYield = Math.min(distributableYield, seniorTargetYield);
    juniorYield = computeJuniorResidualYield(distributableYield, seniorYield);
    seniorTargetMet = distributableYield >= seniorTargetYield;
    juniorExhausted = false;
    seniorAbsorbingLosses = false;
  } else {
    // Loss scenario
    const loss = Math.abs(distributableYield);
    const juniorAbsorbs = Math.min(loss, junior.currentValue);
    const seniorAbsorbs = loss - juniorAbsorbs;
    seniorYield = -seniorAbsorbs;
    juniorYield = -juniorAbsorbs;
    seniorTargetMet = false;
    juniorExhausted = junior.currentValue - juniorAbsorbs <= 0;
    seniorAbsorbingLosses = seniorAbsorbs > 0;
  }

  // Step 7: Update values (clamp to 0)
  const newSeniorValue = Math.max(0, senior.currentValue + seniorYield);
  const newJuniorValue = Math.max(0, junior.currentValue + juniorYield);

  // Step 8: Recompute NAV
  const newSeniorNav = computeNavPerShare(newSeniorValue, senior.totalShares);
  const newJuniorNav = computeNavPerShare(newJuniorValue, junior.totalShares);

  // Step 9: Recompute projected APY for display
  const newSeniorApy = computeProjectedApy(seniorYield, senior.currentValue, days);
  const newJuniorApy = computeProjectedApy(juniorYield, junior.currentValue, days);

  // Step 10: Updated TrancheState objects
  const updatedSenior: TrancheState = {
    ...senior,
    currentValue: newSeniorValue,
    navPerShare: newSeniorNav,
    projectedApy: newSeniorApy,
    isExhausted: newSeniorValue <= 0,
  };

  const updatedJunior: TrancheState = {
    ...junior,
    currentValue: newJuniorValue,
    navPerShare: newJuniorNav,
    projectedApy: newJuniorApy,
    isExhausted: newJuniorValue <= 0,
  };

  // Step 11: WaterfallResult
  const result: WaterfallResult = {
    grossYield,
    protocolFeeAmount,
    reserveAmount,
    distributableYield,
    seniorYield,
    juniorYield,
    seniorTargetMet,
    juniorExhausted,
    seniorAbsorbingLosses,
  };

  // Step 12: New state
  const newState: AppState = {
    ...state,
    senior: updatedSenior,
    junior: updatedJunior,
    warnings: {
      juniorExhausted,
      seniorAbsorbingLosses,
    },
  };

  return { newState, result };
}

// ----------------------------------------------------------------
// computeProjectedApys
// ----------------------------------------------------------------

/**
 * Pure projection: given a scenario APY, compute what senior and junior
 * would earn annualized over 365 days. Does not mutate state.
 * Used for the UI APY display panel and initial state seeding.
 */
export function computeProjectedApys(
  vaultState: VaultState,
  config: WaterfallConfig,
  scenarioApy: number
): { seniorApy: number; juniorApy: number } {
  const days = 365;
  const { seniorValue, juniorValue } = computeInitialTrancheValues(
    vaultState.totalAssets,
    config.seniorRatio,
    config.juniorRatio
  );
  const totalAssets = vaultState.totalAssets;

  const grossYield = computeGrossYield(totalAssets, scenarioApy, days);
  const protocolFeeAmount = grossYield > 0 ? grossYield * config.protocolFee : 0;
  const reserveAmount =
    config.enableReserveBuffer && grossYield > 0
      ? (grossYield - protocolFeeAmount) * config.reserveFraction
      : 0;
  const distributableYield = grossYield - protocolFeeAmount - reserveAmount;
  const seniorTargetYield = computeSeniorTargetYield(seniorValue, config.seniorTargetApy, days);

  let seniorYield: number;
  let juniorYield: number;

  if (distributableYield >= 0) {
    seniorYield = Math.min(distributableYield, seniorTargetYield);
    juniorYield = computeJuniorResidualYield(distributableYield, seniorYield);
  } else {
    const loss = Math.abs(distributableYield);
    const juniorAbsorbs = Math.min(loss, juniorValue);
    const seniorAbsorbs = loss - juniorAbsorbs;
    seniorYield = -seniorAbsorbs;
    juniorYield = -juniorAbsorbs;
  }

  return {
    seniorApy: computeProjectedApy(seniorYield, seniorValue, days),
    juniorApy: computeProjectedApy(juniorYield, juniorValue, days),
  };
}
