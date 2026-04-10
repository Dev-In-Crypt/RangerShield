// ============================================================
// RANGER TRANCHES — PURE MATH PRIMITIVES
//
// No internal project imports. No side effects.
// All functions are deterministic mappings from numbers to numbers.
// Uses simple interest (days/365) — intentional for demo clarity.
// ============================================================

/**
 * Compute LP shares a depositor receives.
 * shares = amountUsdc / navPerShare
 */
export function computeSharesForDeposit(amountUsdc: number, navPerShare: number): number {
  if (navPerShare === 0) throw new Error('NAV per share cannot be zero');
  return amountUsdc / navPerShare;
}

/**
 * Compute USDC a redeemer receives.
 * assets = shares * navPerShare
 */
export function computeAssetsForRedemption(shares: number, navPerShare: number): number {
  return shares * navPerShare;
}

/**
 * Compute current NAV per share.
 * nav = currentValue / totalShares
 * GUARD: returns 1.0 when totalShares === 0 (initial state, before any depositors).
 */
export function computeNavPerShare(currentValue: number, totalShares: number): number {
  if (totalShares === 0) return 1.0;
  return currentValue / totalShares;
}

/**
 * Compute gross yield for a time period using simple interest.
 * grossYield = totalAssets * baseApy * (days / 365)
 * baseApy can be negative (drawdown scenarios).
 */
export function computeGrossYield(totalAssets: number, baseApy: number, days: number): number {
  return totalAssets * baseApy * (days / 365);
}

/**
 * Compute how much yield the senior tranche is owed over a time period.
 * seniorTargetYield = seniorValue * targetApy * (days / 365)
 */
export function computeSeniorTargetYield(
  seniorValue: number,
  targetApy: number,
  days: number
): number {
  return seniorValue * targetApy * (days / 365);
}

/**
 * Compute residual yield for junior after senior is paid.
 * juniorYield = distributableYield - seniorYield
 * Only called in positive yield scenarios — loss path uses different logic in engine.ts.
 */
export function computeJuniorResidualYield(
  distributableYield: number,
  seniorYield: number
): number {
  return distributableYield - seniorYield;
}

/**
 * Annualize a yield amount into an APY.
 * apy = (yieldAmount / principalValue) * (365 / days)
 * GUARD: returns 0 when principalValue === 0.
 */
export function computeProjectedApy(
  yieldAmount: number,
  principalValue: number,
  days: number
): number {
  if (principalValue === 0) return 0;
  return (yieldAmount / principalValue) * (365 / days);
}

/**
 * Split total vault assets into initial senior and junior tranche values.
 * seniorValue = totalVaultAssets * seniorRatio
 * juniorValue = totalVaultAssets * juniorRatio
 */
export function computeInitialTrancheValues(
  totalVaultAssets: number,
  seniorRatio: number,
  juniorRatio: number
): { seniorValue: number; juniorValue: number } {
  return {
    seniorValue: totalVaultAssets * seniorRatio,
    juniorValue: totalVaultAssets * juniorRatio,
  };
}
