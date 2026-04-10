import { describe, it, expect } from 'vitest';
import {
  computeSharesForDeposit,
  computeAssetsForRedemption,
  computeNavPerShare,
  computeGrossYield,
  computeSeniorTargetYield,
  computeJuniorResidualYield,
  computeProjectedApy,
  computeInitialTrancheValues,
} from '../../lib/tranche/math';

describe('math.ts — pure math primitives', () => {
  describe('computeSharesForDeposit', () => {
    it('1000 USDC at NAV 1.0 → 1000 shares', () => {
      expect(computeSharesForDeposit(1000, 1.0)).toBeCloseTo(1000, 6);
    });

    it('1000 USDC at NAV 2.0 → 500 shares', () => {
      expect(computeSharesForDeposit(1000, 2.0)).toBeCloseTo(500, 6);
    });

    it('throws when navPerShare is 0', () => {
      expect(() => computeSharesForDeposit(1000, 0)).toThrow();
    });
  });

  describe('computeAssetsForRedemption', () => {
    it('500 shares at NAV 1.5 → 750 USDC', () => {
      expect(computeAssetsForRedemption(500, 1.5)).toBeCloseTo(750, 6);
    });

    it('1000 shares at NAV 1.0 → 1000 USDC', () => {
      expect(computeAssetsForRedemption(1000, 1.0)).toBeCloseTo(1000, 6);
    });
  });

  describe('computeNavPerShare', () => {
    it('returns 1.0 when totalShares is 0 (initial state guard)', () => {
      expect(computeNavPerShare(0, 0)).toBe(1.0);
    });

    it('returns 1.0 when value equals shares', () => {
      expect(computeNavPerShare(700_000, 700_000)).toBeCloseTo(1.0, 6);
    });

    it('returns correct NAV when value exceeds shares (yield accrued)', () => {
      expect(computeNavPerShare(770_000, 700_000)).toBeCloseTo(1.1, 6);
    });
  });

  describe('computeGrossYield', () => {
    it('$1M at 12% for 365 days → $120,000', () => {
      expect(computeGrossYield(1_000_000, 0.12, 365)).toBeCloseTo(120_000, 2);
    });

    it('$1M at -5% for 365 days → -$50,000', () => {
      expect(computeGrossYield(1_000_000, -0.05, 365)).toBeCloseTo(-50_000, 2);
    });

    it('$1M at 0% → 0', () => {
      expect(computeGrossYield(1_000_000, 0, 365)).toBe(0);
    });
  });

  describe('computeSeniorTargetYield', () => {
    it('$700k at 8% for 365 days → $56,000', () => {
      expect(computeSeniorTargetYield(700_000, 0.08, 365)).toBeCloseTo(56_000, 2);
    });
  });

  describe('computeJuniorResidualYield', () => {
    it('$120k distributable, $56k to senior → $64k to junior', () => {
      expect(computeJuniorResidualYield(120_000, 56_000)).toBeCloseTo(64_000, 2);
    });

    it('returns 0 when senior takes all distributable yield', () => {
      expect(computeJuniorResidualYield(56_000, 56_000)).toBeCloseTo(0, 6);
    });
  });

  describe('computeProjectedApy', () => {
    it('$56k yield on $700k over 365 days → 8%', () => {
      expect(computeProjectedApy(56_000, 700_000, 365)).toBeCloseTo(0.08, 6);
    });

    it('returns 0 when principalValue is 0', () => {
      expect(computeProjectedApy(56_000, 0, 365)).toBe(0);
    });

    it('returns negative APY for losses', () => {
      expect(computeProjectedApy(-50_000, 300_000, 365)).toBeCloseTo(-0.1667, 3);
    });
  });

  describe('computeInitialTrancheValues', () => {
    it('$1M total with 70/30 → { seniorValue: 700k, juniorValue: 300k }', () => {
      const result = computeInitialTrancheValues(1_000_000, 0.70, 0.30);
      expect(result.seniorValue).toBeCloseTo(700_000, 2);
      expect(result.juniorValue).toBeCloseTo(300_000, 2);
    });

    it('senior + junior values sum to total assets', () => {
      const result = computeInitialTrancheValues(1_000_000, 0.70, 0.30);
      expect(result.seniorValue + result.juniorValue).toBeCloseTo(1_000_000, 2);
    });
  });
});
