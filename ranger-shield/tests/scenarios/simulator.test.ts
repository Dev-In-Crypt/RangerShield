import { describe, it, expect, beforeEach } from 'vitest';
import { applyScenario, getScenarioResult } from '../../lib/scenarios/simulator';
import { createInitialState, DEFAULT_WATERFALL_CONFIG } from '../../lib/tranche/engine';
import { mockAdapter, resetMockAdapter } from '../../lib/ranger/mockAdapter';
import { MOCK_VAULT_TOTAL_ASSETS } from '../../lib/constants';
import type { AppState, VaultState, WaterfallConfig } from '../../lib/tranche/types';

let vaultState: VaultState;
let config: WaterfallConfig;
let initialState: AppState;

beforeEach(async () => {
  resetMockAdapter();
  vaultState = await mockAdapter.getVaultState();
  config = DEFAULT_WATERFALL_CONFIG;
  initialState = createInitialState(vaultState, config);
});

// ----------------------------------------------------------------
// applyScenario
// ----------------------------------------------------------------
describe('applyScenario', () => {
  describe("'normal' scenario", () => {
    it('sets activeScenario to normal', () => {
      const s = applyScenario(initialState, 'normal');
      expect(s.activeScenario).toBe('normal');
    });

    it('senior projectedApy is approximately 10%', () => {
      // Senior gets 70,000 from 700,000 → 10%
      const s = applyScenario(initialState, 'normal');
      expect(s.senior.projectedApy).toBeCloseTo(0.10, 3);
    });

    it('junior projectedApy is greater than 10% (amplified residual)', () => {
      // Junior gets 49,400 from 300,000 → ~16.5%
      const s = applyScenario(initialState, 'normal');
      expect(s.junior.projectedApy).toBeGreaterThan(0.10);
    });

    it('both tranches increase in value', () => {
      const s = applyScenario(initialState, 'normal');
      expect(s.senior.currentValue).toBeGreaterThan(700_000);
      expect(s.junior.currentValue).toBeGreaterThan(300_000);
    });

    it('warnings remain false', () => {
      const s = applyScenario(initialState, 'normal');
      expect(s.warnings.juniorExhausted).toBe(false);
      expect(s.warnings.seniorAbsorbingLosses).toBe(false);
    });
  });

  describe("'lowYield' scenario", () => {
    it('sets activeScenario to lowYield', () => {
      const s = applyScenario(initialState, 'lowYield');
      expect(s.activeScenario).toBe('lowYield');
    });

    it('senior projectedApy is below 10% target (gets all distributable, ~8.5%)', () => {
      // distributable = 59,700 < seniorTarget 70,000 → senior gets all 59,700 / 700,000 ≈ 8.53%
      const s = applyScenario(initialState, 'lowYield');
      expect(s.senior.projectedApy).toBeGreaterThan(0.08);
      expect(s.senior.projectedApy).toBeLessThan(0.10);
    });

    it('junior projectedApy is 0 (no residual — all distributable goes to senior)', () => {
      const s = applyScenario(initialState, 'lowYield');
      expect(s.junior.projectedApy).toBeCloseTo(0, 6);
      expect(s.junior.projectedApy).toBeLessThan(s.senior.projectedApy);
    });
  });

  describe("'drawdown' scenario", () => {
    it('sets activeScenario to drawdown', () => {
      const s = applyScenario(initialState, 'drawdown');
      expect(s.activeScenario).toBe('drawdown');
    });

    it('senior projectedApy is 0 (fully protected at -5%)', () => {
      const s = applyScenario(initialState, 'drawdown');
      expect(s.senior.projectedApy).toBeCloseTo(0, 6);
    });

    it('junior projectedApy is negative (absorbed losses)', () => {
      const s = applyScenario(initialState, 'drawdown');
      expect(s.junior.projectedApy).toBeLessThan(0);
    });

    it('junior currentValue decreases, senior unchanged', () => {
      const s = applyScenario(initialState, 'drawdown');
      expect(s.junior.currentValue).toBeLessThan(300_000);
      expect(s.senior.currentValue).toBeCloseTo(700_000, 2);
    });

    it('warnings false when loss is contained by junior capital', () => {
      // 50,000 loss < 300,000 junior — junior not exhausted
      const s = applyScenario(initialState, 'drawdown');
      expect(s.warnings.juniorExhausted).toBe(false);
      expect(s.warnings.seniorAbsorbingLosses).toBe(false);
    });
  });
});

// ----------------------------------------------------------------
// getScenarioResult
// ----------------------------------------------------------------
describe('getScenarioResult', () => {
  it('returns correct WaterfallResult for normal scenario', () => {
    const result = getScenarioResult(vaultState, config, 'normal');
    expect(result.seniorTargetMet).toBe(true);
    expect(result.grossYield).toBeCloseTo(120_000, 2);
    expect(result.seniorYield).toBeCloseTo(70_000, 2);
    expect(result.juniorYield).toBeCloseTo(49_400, 2);
  });

  it('does not mutate vaultState when computing result', () => {
    const originalAssets = vaultState.totalAssets;
    getScenarioResult(vaultState, config, 'normal');
    expect(vaultState.totalAssets).toBe(originalAssets);
  });

  it('returns correct loss allocation for drawdown scenario', () => {
    const result = getScenarioResult(vaultState, config, 'drawdown');
    expect(result.distributableYield).toBeCloseTo(-50_000, 2);
    expect(result.juniorYield).toBeCloseTo(-50_000, 2);
    expect(result.seniorYield).toBeCloseTo(0, 6);
    expect(result.juniorExhausted).toBe(false);
    expect(result.seniorAbsorbingLosses).toBe(false);
  });

  it('returns different results for each scenario', () => {
    const normal = getScenarioResult(vaultState, config, 'normal');
    const drawdown = getScenarioResult(vaultState, config, 'drawdown');
    expect(normal.grossYield).not.toBe(drawdown.grossYield);
    expect(normal.juniorYield).toBeGreaterThan(0);
    expect(drawdown.juniorYield).toBeLessThan(0);
  });
});
