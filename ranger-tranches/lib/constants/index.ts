// ============================================================
// RANGER TRANCHES — CORE CONSTANTS
// All constants are documented with their rationale.
// Do not change without updating RESEARCH.md.
// ============================================================

/** Senior tranche receives 70% of total deposited capital */
export const SENIOR_TRANCHE_RATIO = 0.70;

/** Junior tranche receives the remaining 30% of deposited capital */
export const JUNIOR_TRANCHE_RATIO = 0.30;

/**
 * Annual target yield for the Protected Position.
 * Expressed as a decimal (0.10 = 10%).
 * This is a priority target, not a guaranteed rate.
 * Meets the hackathon minimum APY requirement of 10%.
 * If base vault APY < 10%, protected position still gets priority but may receive less.
 */
export const SENIOR_TARGET_APY = 0.10;

/**
 * Protocol management fee applied to gross yield before waterfall distribution.
 * Expressed as a decimal (0.005 = 0.5%).
 */
export const DEFAULT_PROTOCOL_FEE = 0.005;

/**
 * Mock base vault APY used in the normal scenario.
 * Representative Ranger vault yield estimate.
 */
export const MOCK_BASE_VAULT_APY = 0.12; // 12%

/** Mock vault name — matches what would appear on Ranger vault UI. */
export const MOCK_VAULT_NAME = 'Ranger USDC Vault';

/** Mock vault asset symbol. All accounting is denominated in this asset. */
export const MOCK_VAULT_ASSET = 'USDC';

/**
 * Mock vault total assets (USD-denominated).
 * Represents a plausible vault TVL for demo purposes.
 */
export const MOCK_VAULT_TOTAL_ASSETS = 1_000_000; // $1,000,000 USDC

/** Mock initial share price — starts at 1.0, grows over time as yield accrues. */
export const MOCK_VAULT_SHARE_PRICE = 1.0;

/** Minimum deposit amount in USDC (human-readable). Prevents dust deposits. */
export const MIN_DEPOSIT_AMOUNT = 10;

/**
 * localStorage key for persisting application state across page refreshes.
 * localStorage is mandatory per locked design decision for demo stability.
 */
export const LOCAL_STORAGE_KEY = 'ranger_tranches_state';

/** Number of decimal places used in all display formatting. */
export const DISPLAY_DECIMALS = 4;

/**
 * Scenario APY overrides for the three preset scenarios.
 * Fed directly to the scenario engine.
 */
export const SCENARIO_APYS = {
  normal: 0.12,    // 12% — healthy base vault
  lowYield: 0.06,  // 6%  — compressed yield, below senior 8% target
  drawdown: -0.05, // -5% — net loss, junior absorbs first
} as const;

/**
 * Schema version for localStorage state.
 * Increment if the persisted state shape changes.
 */
export const STATE_SCHEMA_VERSION = 1;
