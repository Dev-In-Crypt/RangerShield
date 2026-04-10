// ============================================================
// RANGER VAULT ADAPTER — INTERFACE
//
// Abstracts all interaction with the underlying Ranger vault.
// Two implementations exist:
//   - mockAdapter.ts: deterministic mock, used in MVP demo
//   - liveAdapter.ts: stub only, documents the live integration path
//
// The rest of the application ONLY depends on this interface.
// Swapping mock for live requires replacing one import.
// ============================================================

import type { VaultState } from '../tranche/types';

export interface VaultAdapter {
  /**
   * Returns the current state of the Ranger vault.
   *
   * Mock: returns a static VaultState constructed from constants.
   * Live: would fetch on-chain account data via @voltr/vault-sdk VoltrClient,
   *       read the Vault struct fields (totalAssets, totalShares),
   *       compute sharePrice = totalAssets / totalShares,
   *       and estimate APY from historical share price snapshots (external indexer required).
   */
  getVaultState(): Promise<VaultState>;

  /**
   * Records a deposit into the vault. Returns shares received.
   *
   * Mock: computes shares = amount / currentSharePrice, no on-chain call.
   * Live: would call VoltrClient.createDepositVaultIx() and submit a signed transaction
   *       via Solana wallet adapter (@solana/wallet-adapter-react).
   *
   * @param amountUsdc - Amount to deposit in USDC (human-readable, not lamports)
   */
  depositToVault(amountUsdc: number): Promise<{ sharesReceived: number; txId: string }>;

  /**
   * Records a withdrawal from the vault. Returns base asset amount.
   *
   * Mock: computes assets = shares * currentSharePrice, no on-chain call.
   * Live: for vaults with waiting period = 0, calls createInstantWithdrawVaultIx().
   *       For vaults with a withdrawal queue: createRequestWithdrawVaultIx() first,
   *       then createWithdrawVaultIx() after the waiting period elapses.
   *
   * @param shares - Number of LP shares to redeem
   */
  withdrawFromVault(shares: number): Promise<{ amountReturned: number; txId: string }>;

  /**
   * Returns the current base vault APY as a decimal (e.g., 0.12 = 12%).
   *
   * Mock: returns MOCK_BASE_VAULT_APY or scenario-overridden APY.
   * Live: NOT directly available from @voltr/vault-sdk.
   *       Must be derived by snapshotting share price over time:
   *         apy = ((currentSharePrice - pastSharePrice) / pastSharePrice) * (365 / days)
   *       Requires an off-chain indexer or cron snapshot job.
   *       This is the primary blocker for live integration — see RESEARCH.md.
   */
  getBaseApy(): Promise<number>;

  /**
   * Returns the current LP share price of the vault.
   *
   * Mock: returns MOCK_VAULT_SHARE_PRICE (1.0 at start).
   * Live: read from on-chain Vault struct via:
   *         client.vaultProgram.account.vault.fetch(vaultPublicKey)
   *       then compute: sharePrice = vault.totalAssets / vault.totalShares
   *       (BN arithmetic with decimal.js for precision).
   */
  getSharePrice(): Promise<number>;

  /** Identifies the adapter implementation. Shown in UI footer and research notes. */
  readonly adapterType: 'mock' | 'live';
}
