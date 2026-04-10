import { describe, it, expect, beforeEach } from 'vitest';
import {
  SENIOR_TRANCHE_RATIO,
  JUNIOR_TRANCHE_RATIO,
  SENIOR_TARGET_APY,
  MOCK_BASE_VAULT_APY,
  MOCK_VAULT_SHARE_PRICE,
  MOCK_VAULT_TOTAL_ASSETS,
} from '../../lib/constants';
import { mockAdapter, resetMockAdapter } from '../../lib/ranger/mockAdapter';

describe('Constants', () => {
  it('senior + junior ratios sum to 1', () => {
    expect(SENIOR_TRANCHE_RATIO + JUNIOR_TRANCHE_RATIO).toBeCloseTo(1.0);
  });

  it('senior target APY is 10%', () => {
    expect(SENIOR_TARGET_APY).toBe(0.10);
  });

  it('mock base APY exceeds senior target (required for normal scenario)', () => {
    expect(MOCK_BASE_VAULT_APY).toBeGreaterThan(SENIOR_TARGET_APY);
  });

  it('senior ratio is 70%', () => {
    expect(SENIOR_TRANCHE_RATIO).toBe(0.70);
  });

  it('junior ratio is 30%', () => {
    expect(JUNIOR_TRANCHE_RATIO).toBe(0.30);
  });
});

describe('Mock Adapter', () => {
  beforeEach(() => resetMockAdapter());

  it('adapter type is mock', () => {
    expect(mockAdapter.adapterType).toBe('mock');
  });

  it('getVaultState returns valid structure', async () => {
    const state = await mockAdapter.getVaultState();
    expect(state.vaultId).toBeTruthy();
    expect(state.vaultName).toBeTruthy();
    expect(state.asset).toBe('USDC');
    expect(state.currentApy).toBeGreaterThan(0);
    expect(state.sharePrice).toBe(MOCK_VAULT_SHARE_PRICE);
    expect(state.totalAssets).toBe(MOCK_VAULT_TOTAL_ASSETS);
    expect(state.lastUpdatedAt).toBeGreaterThan(0);
  });

  it('depositToVault returns correct shares at share price 1.0', async () => {
    const { sharesReceived } = await mockAdapter.depositToVault(1000);
    expect(sharesReceived).toBeCloseTo(1000); // 1000 / 1.0
  });

  it('depositToVault increases totalAssets', async () => {
    const before = (await mockAdapter.getVaultState()).totalAssets;
    await mockAdapter.depositToVault(500);
    const after = (await mockAdapter.getVaultState()).totalAssets;
    expect(after).toBeCloseTo(before + 500);
  });

  it('withdrawFromVault returns correct assets at share price 1.0', async () => {
    const { amountReturned } = await mockAdapter.withdrawFromVault(500);
    expect(amountReturned).toBeCloseTo(500); // 500 * 1.0
  });

  it('depositToVault throws on non-positive amount', async () => {
    await expect(mockAdapter.depositToVault(0)).rejects.toThrow();
    await expect(mockAdapter.depositToVault(-100)).rejects.toThrow();
  });

  it('withdrawFromVault throws on non-positive shares', async () => {
    await expect(mockAdapter.withdrawFromVault(0)).rejects.toThrow();
    await expect(mockAdapter.withdrawFromVault(-1)).rejects.toThrow();
  });

  it('getBaseApy returns mock APY', async () => {
    const apy = await mockAdapter.getBaseApy();
    expect(apy).toBe(MOCK_BASE_VAULT_APY);
  });

  it('getSharePrice returns initial share price', async () => {
    const price = await mockAdapter.getSharePrice();
    expect(price).toBe(MOCK_VAULT_SHARE_PRICE);
  });

  it('resetMockAdapter restores initial state', async () => {
    await mockAdapter.depositToVault(50000);
    resetMockAdapter();
    const state = await mockAdapter.getVaultState();
    expect(state.totalAssets).toBe(MOCK_VAULT_TOTAL_ASSETS);
    expect(state.currentApy).toBe(MOCK_BASE_VAULT_APY);
  });
});
