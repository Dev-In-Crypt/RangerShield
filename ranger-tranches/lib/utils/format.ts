// ============================================================
// RANGER TRANCHES — DISPLAY FORMATTING UTILITIES
// Pure functions. No project imports. No side effects.
// ============================================================

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sharesFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an APY decimal as a percentage string with sign.
 * formatApy(0.0823) → "+8.23%"
 * formatApy(-0.05)  → "-5.00%"
 * formatApy(0)      → "0.00%"
 */
export function formatApy(apy: number): string {
  if (Math.abs(apy) < 0.00005) return '0.00%';
  const pct = (apy * 100).toFixed(2);
  return apy > 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Format a USDC amount as a USD currency string.
 * formatUsdc(1000000) → "$1,000,000.00"
 */
export function formatUsdc(amount: number): string {
  return usdFormatter.format(amount);
}

/**
 * Format a NAV per share to 4 decimal places.
 * formatNav(1.0234) → "1.0234"
 */
export function formatNav(nav: number): string {
  return nav.toFixed(4);
}

/**
 * Format a share count with comma separators and 2 decimal places.
 * formatShares(700000) → "700,000.00"
 */
export function formatShares(shares: number): string {
  return sharesFormatter.format(shares);
}

/**
 * Format a ratio as a rounded percentage.
 * formatRatio(0.70) → "70%"
 */
export function formatRatio(ratio: number): string {
  return Math.round(ratio * 100) + '%';
}

/**
 * Format a yield/loss dollar amount with sign prefix.
 * formatYield(56000)  → "+$56,000.00"
 * formatYield(-15000) → "-$15,000.00"
 * formatYield(0)      → "$0.00"
 */
export function formatYield(amount: number): string {
  if (Math.abs(amount) < 0.005) return usdFormatter.format(0);
  const abs = usdFormatter.format(Math.abs(amount));
  return amount > 0 ? `+${abs}` : `-${abs}`;
}

/**
 * Format an APY as a percentage for scenario display.
 * formatScenarioApy(0.12)  → "12.00% APY"
 * formatScenarioApy(-0.05) → "-5.00% APY"
 */
export function formatScenarioApy(apy: number): string {
  return (apy * 100).toFixed(2) + '% APY';
}
