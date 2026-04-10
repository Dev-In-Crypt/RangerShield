// ============================================================
// RANGER TRANCHES — DOMAIN TYPES
// UI-agnostic and adapter-agnostic.
// ============================================================

/** Identifies which tranche a position belongs to */
export type TrancheId = 'senior' | 'junior';

/**
 * Live state of the underlying Ranger vault as exposed by the adapter.
 */
export interface VaultState {
  /** Unique identifier — on-chain address or mock ID */
  vaultId: string;
  /** Human-readable vault name for display */
  vaultName: string;
  /** Asset symbol, e.g. "USDC" */
  asset: string;
  /**
   * Current vault share price.
   * Starts at 1.0, increases as yield accrues.
   */
  sharePrice: number;
  /** Total assets under management in the vault (base asset units). */
  totalAssets: number;
  /**
   * Current annualized yield of the underlying vault as a decimal (0.12 = 12%).
   * Mock: set from scenario config or default constant.
   * Live: must be derived externally — not available from SDK directly.
   */
  currentApy: number;
  /** Unix timestamp in ms of the last state update. */
  lastUpdatedAt: number;
}

/**
 * Accounting state of a single tranche (Senior or Junior).
 */
export interface TrancheState {
  trancheId: TrancheId;
  /** Total assets allocated to this tranche (base asset, human-readable). */
  totalDeposited: number;
  /** Total shares outstanding for this tranche. */
  totalShares: number;
  /** Current Net Asset Value per share: totalCurrentValue / totalShares. */
  navPerShare: number;
  /** Total current value of tranche after yield/loss application. */
  currentValue: number;
  /** Projected annualized yield under current scenario. Computed by waterfall engine. */
  projectedApy: number;
  /**
   * Whether this tranche has been fully wiped out by losses.
   * Only relevant for Junior. When true and losses continue, Senior is hit.
   */
  isExhausted: boolean;
}

/**
 * A user deposit event. Stored in localStorage to reconstruct user positions.
 */
export interface Deposit {
  depositId: string;
  trancheId: TrancheId;
  /** Amount deposited in base asset (USDC) */
  amount: number;
  sharesReceived: number;
  navAtDeposit: number;
  depositedAt: number; // Unix ms
}

/**
 * A user redemption event.
 */
export interface Redemption {
  redemptionId: string;
  trancheId: TrancheId;
  sharesBurned: number;
  amountReturned: number;
  navAtRedemption: number;
  redeemedAt: number; // Unix ms
}

/**
 * Configuration for the yield and loss waterfall.
 * Deterministic rule set — no business logic embedded here.
 */
export interface WaterfallConfig {
  /** Senior allocation as a fraction of total (0.70 = 70%) */
  seniorRatio: number;
  /** Junior allocation as a fraction of total (0.30 = 30%) */
  juniorRatio: number;
  /**
   * Senior annual target yield as decimal (0.08 = 8%).
   * Senior receives this first from gross yield; excess goes to Junior.
   */
  seniorTargetApy: number;
  /**
   * Protocol fee taken from gross yield before tranche distribution.
   * Decimal (0.005 = 0.5%). Set to 0 to disable.
   */
  protocolFee: number;
  /** When true, a portion of yield is retained as a buffer before distribution. */
  enableReserveBuffer: boolean;
  /** Reserve fraction of gross yield (only relevant when enableReserveBuffer = true) */
  reserveFraction: number;
}

/**
 * Configuration for a simulation scenario.
 */
export interface ScenarioConfig {
  scenarioId: 'normal' | 'lowYield' | 'drawdown';
  label: string;
  description: string;
  /** Base vault APY to simulate. Negative = net loss (drawdown). */
  simulatedBaseApy: number;
  /** Days to project over. Default: 365. */
  projectionDays?: number;
}

/**
 * Complete application state persisted to localStorage.
 */
export interface AppState {
  schemaVersion: number;
  vault: VaultState;
  senior: TrancheState;
  junior: TrancheState;
  waterfallConfig: WaterfallConfig;
  deposits: Deposit[];
  redemptions: Redemption[];
  activeScenario: ScenarioConfig['scenarioId'];
  /**
   * Warning flags for UI alert display.
   * Drives explicit warnings per locked design decision:
   *   "Junior protection exhausted" and "Senior tranche is now absorbing losses"
   */
  warnings: {
    juniorExhausted: boolean;
    seniorAbsorbingLosses: boolean;
  };
}

/**
 * Result object returned by waterfall computation.
 * Used by the tranche engine to update TrancheState values.
 */
export interface WaterfallResult {
  grossYield: number;
  protocolFeeAmount: number;
  reserveAmount: number;
  distributableYield: number;
  seniorYield: number;
  juniorYield: number;
  /** Whether senior received its full 8% target yield */
  seniorTargetMet: boolean;
  juniorExhausted: boolean;
  seniorAbsorbingLosses: boolean;
}
