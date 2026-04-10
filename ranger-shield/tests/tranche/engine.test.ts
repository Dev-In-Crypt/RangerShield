import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  deposit,
  redeem,
  applyWaterfall,
  DEFAULT_WATERFALL_CONFIG,
} from '../../lib/tranche/engine';
import { mockAdapter, resetMockAdapter } from '../../lib/ranger/mockAdapter';
import { MIN_DEPOSIT_AMOUNT, MOCK_VAULT_TOTAL_ASSETS } from '../../lib/constants';
import type { AppState, VaultState, WaterfallConfig } from '../../lib/tranche/types';

// ----------------------------------------------------------------
// Test setup
// ----------------------------------------------------------------
let vaultState: VaultState;
let config: WaterfallConfig;
let state: AppState;

beforeEach(async () => {
  resetMockAdapter();
  vaultState = await mockAdapter.getVaultState();
  config = DEFAULT_WATERFALL_CONFIG;
  state = createInitialState(vaultState, config);
});

// ----------------------------------------------------------------
// createInitialState
// ----------------------------------------------------------------
describe('createInitialState', () => {
  it('produces 70% senior / 30% junior split of vault assets', () => {
    expect(state.senior.currentValue).toBeCloseTo(700_000, 2);
    expect(state.junior.currentValue).toBeCloseTo(300_000, 2);
  });

  it('sets initial NAV per share to 1.0 for both tranches', () => {
    expect(state.senior.navPerShare).toBe(1.0);
    expect(state.junior.navPerShare).toBe(1.0);
  });

  it('sets totalShares equal to initial value (NAV=1.0)', () => {
    expect(state.senior.totalShares).toBeCloseTo(700_000, 2);
    expect(state.junior.totalShares).toBeCloseTo(300_000, 2);
  });

  it('starts with empty deposits and redemptions arrays', () => {
    expect(state.deposits).toHaveLength(0);
    expect(state.redemptions).toHaveLength(0);
  });

  it('starts with warnings all false', () => {
    expect(state.warnings.juniorExhausted).toBe(false);
    expect(state.warnings.seniorAbsorbingLosses).toBe(false);
  });

  it('sets activeScenario to normal', () => {
    expect(state.activeScenario).toBe('normal');
  });

  it('sets isExhausted to false for both tranches', () => {
    expect(state.senior.isExhausted).toBe(false);
    expect(state.junior.isExhausted).toBe(false);
  });
});

// ----------------------------------------------------------------
// deposit
// ----------------------------------------------------------------
describe('deposit', () => {
  it('increases senior currentValue by deposit amount', () => {
    const s = deposit(state, 'senior', 1000);
    expect(s.senior.currentValue).toBeCloseTo(701_000, 2);
  });

  it('increases totalShares proportionally at NAV 1.0', () => {
    const s = deposit(state, 'senior', 1000);
    expect(s.senior.totalShares).toBeCloseTo(701_000, 2);
  });

  it('does not affect junior tranche when depositing to senior', () => {
    const s = deposit(state, 'senior', 1000);
    expect(s.junior.currentValue).toBeCloseTo(state.junior.currentValue, 6);
  });

  it('creates a Deposit record with correct fields', () => {
    const s = deposit(state, 'junior', 500);
    expect(s.deposits).toHaveLength(1);
    expect(s.deposits[0].trancheId).toBe('junior');
    expect(s.deposits[0].amount).toBe(500);
    expect(s.deposits[0].sharesReceived).toBeCloseTo(500, 6);
    expect(s.deposits[0].navAtDeposit).toBe(1.0);
    expect(s.deposits[0].depositId).toBeTruthy();
  });

  it('does not mutate original state', () => {
    deposit(state, 'senior', 1000);
    expect(state.senior.currentValue).toBeCloseTo(700_000, 2);
  });

  it('throws when amount < MIN_DEPOSIT_AMOUNT', () => {
    expect(() => deposit(state, 'senior', MIN_DEPOSIT_AMOUNT - 1)).toThrow();
  });

  it('accepts exactly MIN_DEPOSIT_AMOUNT', () => {
    expect(() => deposit(state, 'senior', MIN_DEPOSIT_AMOUNT)).not.toThrow();
  });

  it('accumulates multiple deposits correctly', () => {
    const s1 = deposit(state, 'senior', 100);
    const s2 = deposit(s1, 'senior', 200);
    expect(s2.senior.currentValue).toBeCloseTo(700_300, 2);
    expect(s2.deposits).toHaveLength(2);
  });
});

// ----------------------------------------------------------------
// redeem
// ----------------------------------------------------------------
describe('redeem', () => {
  it('decreases junior currentValue by redemption amount', () => {
    const s = redeem(state, 'junior', 1000);
    expect(s.junior.currentValue).toBeCloseTo(299_000, 2);
  });

  it('decreases totalShares by redeemed shares', () => {
    const s = redeem(state, 'junior', 1000);
    expect(s.junior.totalShares).toBeCloseTo(299_000, 2);
  });

  it('creates a Redemption record with correct fields', () => {
    const s = redeem(state, 'senior', 500);
    expect(s.redemptions).toHaveLength(1);
    expect(s.redemptions[0].sharesBurned).toBe(500);
    expect(s.redemptions[0].amountReturned).toBeCloseTo(500, 6);
    expect(s.redemptions[0].navAtRedemption).toBe(1.0);
    expect(s.redemptions[0].redemptionId).toBeTruthy();
  });

  it('does not mutate original state', () => {
    redeem(state, 'junior', 1000);
    expect(state.junior.currentValue).toBeCloseTo(300_000, 2);
  });

  it('throws when shares <= 0', () => {
    expect(() => redeem(state, 'senior', 0)).toThrow();
    expect(() => redeem(state, 'senior', -1)).toThrow();
  });

  it('throws when shares exceed totalShares', () => {
    expect(() => redeem(state, 'senior', 800_000)).toThrow();
  });

  it('can fully redeem all shares', () => {
    const s = redeem(state, 'junior', state.junior.totalShares);
    expect(s.junior.currentValue).toBeCloseTo(0, 6);
    expect(s.junior.isExhausted).toBe(true);
  });
});

// ----------------------------------------------------------------
// applyWaterfall — normal scenario (12% base APY)
// Math:
//   totalAssets = 1_000_000
//   grossYield = 1_000_000 * 0.12 * 1 = 120_000
//   protocolFee = 120_000 * 0.005 = 600
//   distributable = 120_000 - 600 = 119_400
//   seniorTarget = 700_000 * 0.10 = 70_000
//   seniorYield = min(119_400, 70_000) = 70_000
//   juniorYield = 119_400 - 70_000 = 49_400
// ----------------------------------------------------------------
describe('applyWaterfall — normal scenario (12% base APY)', () => {
  let result: ReturnType<typeof applyWaterfall>;

  beforeEach(() => {
    result = applyWaterfall(state, 0.12, 365);
  });

  it('grossYield is 120,000', () => {
    expect(result.result.grossYield).toBeCloseTo(120_000, 2);
  });

  it('protocolFeeAmount is 600', () => {
    expect(result.result.protocolFeeAmount).toBeCloseTo(600, 2);
  });

  it('seniorYield is 70,000 (exact 10% target on 700k)', () => {
    expect(result.result.seniorYield).toBeCloseTo(70_000, 2);
  });

  it('juniorYield is 49,400 (residual after protected position)', () => {
    expect(result.result.juniorYield).toBeCloseTo(49_400, 2);
  });

  it('seniorTargetMet is true', () => {
    expect(result.result.seniorTargetMet).toBe(true);
  });

  it('neither tranche is exhausted or absorbing losses', () => {
    expect(result.result.juniorExhausted).toBe(false);
    expect(result.result.seniorAbsorbingLosses).toBe(false);
  });

  it('both tranche currentValues increase', () => {
    expect(result.newState.senior.currentValue).toBeGreaterThan(700_000);
    expect(result.newState.junior.currentValue).toBeGreaterThan(300_000);
  });

  it('NAV per share increases after yield', () => {
    expect(result.newState.senior.navPerShare).toBeGreaterThan(1.0);
    expect(result.newState.junior.navPerShare).toBeGreaterThan(1.0);
  });

  it('warnings remain false', () => {
    expect(result.newState.warnings.juniorExhausted).toBe(false);
    expect(result.newState.warnings.seniorAbsorbingLosses).toBe(false);
  });
});

// ----------------------------------------------------------------
// applyWaterfall — lowYield scenario (6% base APY)
// Math:
//   grossYield = 1_000_000 * 0.06 = 60_000
//   protocolFee = 60_000 * 0.005 = 300
//   distributable = 60_000 - 300 = 59_700
//   seniorTarget = 700_000 * 0.10 = 70_000
//   seniorYield = min(59_700, 70_000) = 59_700  (all distributable, target not met)
//   juniorYield = 59_700 - 59_700 = 0
//   seniorTargetMet = false (59_700 < 70_000)
// ----------------------------------------------------------------
describe('applyWaterfall — lowYield scenario (6% base APY)', () => {
  let result: ReturnType<typeof applyWaterfall>;

  beforeEach(() => {
    result = applyWaterfall(state, 0.06, 365);
  });

  it('senior receives all distributable yield (59,700) — target not met at 6%', () => {
    expect(result.result.seniorYield).toBeCloseTo(59_700, 2);
  });

  it('junior receives nothing (0) — all distributable goes to senior priority', () => {
    expect(result.result.juniorYield).toBeCloseTo(0, 2);
  });

  it('seniorTargetMet is false at 6% base (distributable 59,700 < target 70,000)', () => {
    expect(result.result.seniorTargetMet).toBe(false);
  });

  it('junior projected APY is lower than senior projected APY', () => {
    // senior: 59_700 / 700_000 ≈ 8.53%; junior: 0 / 300_000 = 0%
    expect(result.newState.junior.projectedApy).toBeLessThan(result.newState.senior.projectedApy);
  });
});

// ----------------------------------------------------------------
// applyWaterfall — drawdown scenario (-5% base APY)
// Math:
//   grossYield = 1_000_000 * (-0.05) = -50_000
//   distributable = -50_000
//   loss = 50_000
//   juniorAbsorbs = min(50_000, 300_000) = 50_000
//   seniorAbsorbs = 0
//   juniorExhausted = (300_000 - 50_000) <= 0 → false
// ----------------------------------------------------------------
describe('applyWaterfall — drawdown scenario (-5% base APY)', () => {
  let result: ReturnType<typeof applyWaterfall>;

  beforeEach(() => {
    result = applyWaterfall(state, -0.05, 365);
  });

  it('junior absorbs the full loss', () => {
    expect(result.result.juniorYield).toBeCloseTo(-50_000, 2);
  });

  it('senior is fully protected (no loss)', () => {
    expect(result.result.seniorYield).toBeCloseTo(0, 6);
    expect(result.newState.senior.currentValue).toBeCloseTo(700_000, 2);
  });

  it('junior currentValue decreases by 50,000', () => {
    expect(result.newState.junior.currentValue).toBeCloseTo(250_000, 2);
  });

  it('juniorExhausted is false (junior has 250k remaining)', () => {
    expect(result.result.juniorExhausted).toBe(false);
  });

  it('seniorAbsorbingLosses is false', () => {
    expect(result.result.seniorAbsorbingLosses).toBe(false);
  });

  it('no fees taken on losses', () => {
    expect(result.result.protocolFeeAmount).toBe(0);
  });

  it('warnings remain false', () => {
    expect(result.newState.warnings.juniorExhausted).toBe(false);
    expect(result.newState.warnings.seniorAbsorbingLosses).toBe(false);
  });
});

// ----------------------------------------------------------------
// applyWaterfall — extreme drawdown (-40% base APY)
// Math:
//   grossYield = 1_000_000 * (-0.40) = -400_000
//   loss = 400_000
//   juniorAbsorbs = min(400_000, 300_000) = 300_000
//   seniorAbsorbs = 400_000 - 300_000 = 100_000
//   juniorExhausted = (300_000 - 300_000) <= 0 → true
//   seniorAbsorbingLosses = 100_000 > 0 → true
// ----------------------------------------------------------------
describe('applyWaterfall — extreme drawdown (-40% base APY)', () => {
  let result: ReturnType<typeof applyWaterfall>;

  beforeEach(() => {
    result = applyWaterfall(state, -0.40, 365);
  });

  it('junior is fully wiped out (300,000 absorbed)', () => {
    expect(result.result.juniorYield).toBeCloseTo(-300_000, 2);
    expect(result.newState.junior.currentValue).toBeCloseTo(0, 2);
  });

  it('senior absorbs remaining loss (100,000)', () => {
    expect(result.result.seniorYield).toBeCloseTo(-100_000, 2);
    expect(result.newState.senior.currentValue).toBeCloseTo(600_000, 2);
  });

  it('juniorExhausted is true', () => {
    expect(result.result.juniorExhausted).toBe(true);
    expect(result.newState.junior.isExhausted).toBe(true);
  });

  it('seniorAbsorbingLosses is true', () => {
    expect(result.result.seniorAbsorbingLosses).toBe(true);
  });

  it('warnings reflect exhaustion flags', () => {
    expect(result.newState.warnings.juniorExhausted).toBe(true);
    expect(result.newState.warnings.seniorAbsorbingLosses).toBe(true);
  });
});
