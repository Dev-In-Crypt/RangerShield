// ============================================================
// RANGER VAULT ADAPTER — MOCK IMPLEMENTATION
//
// Deterministic mock of a Ranger vault. No network calls, no on-chain transactions.
//
// ASSUMPTIONS (documented per design decision):
//   - Base vault APY: 12% (MOCK_BASE_VAULT_APY)
//   - Share price starts at 1.0 and is static in mock (no time simulation)
//   - Total assets: $1,000,000 USDC
//   - Vault: "Ranger USDC Vault"
//   - Deposits and withdrawals succeed immediately, no waiting period
//   - txId is a mock UUID string
//
// HOW TO SWAP TO LIVE:
//   Replace `import { mockAdapter }` with `import { liveAdapter }`
//   in any consumer file. The VaultAdapter interface contract is identical.
// ============================================================

import type { VaultAdapter } from './adapter';
import type { VaultState } from '../tranche/types';
import {
  MOCK_BASE_VAULT_APY,
  MOCK_VAULT_NAME,
  MOCK_VAULT_ASSET,
  MOCK_VAULT_TOTAL_ASSETS,
  MOCK_VAULT_SHARE_PRICE,
} from '../constants';

// Mutable internal state — the scenario engine can override these
let _currentApy = MOCK_BASE_VAULT_APY;
let _sharePrice = MOCK_VAULT_SHARE_PRICE;
let _totalAssets = MOCK_VAULT_TOTAL_ASSETS;

function generateMockTxId(): string {
  return `mock-tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const mockAdapter: VaultAdapter = {
  adapterType: 'mock',

  async getVaultState(): Promise<VaultState> {
    return {
      vaultId: 'mock-ranger-usdc-vault-001',
      vaultName: MOCK_VAULT_NAME,
      asset: MOCK_VAULT_ASSET,
      sharePrice: _sharePrice,
      totalAssets: _totalAssets,
      currentApy: _currentApy,
      lastUpdatedAt: Date.now(),
    };
  },

  async depositToVault(amountUsdc: number): Promise<{ sharesReceived: number; txId: string }> {
    if (amountUsdc <= 0) throw new Error('Deposit amount must be positive');
    const sharesReceived = amountUsdc / _sharePrice;
    _totalAssets += amountUsdc;
    return { sharesReceived, txId: generateMockTxId() };
  },

  async withdrawFromVault(shares: number): Promise<{ amountReturned: number; txId: string }> {
    if (shares <= 0) throw new Error('Shares must be positive');
    const amountReturned = shares * _sharePrice;
    _totalAssets = Math.max(0, _totalAssets - amountReturned);
    return { amountReturned, txId: generateMockTxId() };
  },

  async getBaseApy(): Promise<number> {
    return _currentApy;
  },

  async getSharePrice(): Promise<number> {
    return _sharePrice;
  },
};

/**
 * Override the mock vault APY.
 * Called by the scenario engine when the user switches scenario presets.
 * Not part of the VaultAdapter interface — mock-specific control surface.
 *
 * @param apy - New APY as decimal (e.g., -0.05 for drawdown scenario)
 */
export function setMockApy(apy: number): void {
  _currentApy = apy;
}

/**
 * Reset mock adapter to initial state.
 * Used in tests and for demo resets.
 */
export function resetMockAdapter(): void {
  _currentApy = MOCK_BASE_VAULT_APY;
  _sharePrice = MOCK_VAULT_SHARE_PRICE;
  _totalAssets = MOCK_VAULT_TOTAL_ASSETS;
}
