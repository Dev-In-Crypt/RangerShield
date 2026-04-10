// ============================================================
// RANGER VAULT ADAPTER — LIVE IMPLEMENTATION
//
// Implements VaultAdapter using the Ranger/Voltr REST API
// (https://api.voltr.xyz) and a connected Solana wallet.
//
// USAGE:
//   import { LiveAdapter } from './liveAdapter';
//   const adapter = new LiveAdapter(connection, sendTransaction, vaultPubkey, userPubkey);
//
// The adapter is constructed fresh whenever the wallet connection
// changes (managed by useAppState via useMemo).
//
// TRANSACTION FLOW:
//   1. POST to Ranger API → receives base64 unsigned Solana tx
//   2. Deserialize to VersionedTransaction
//   3. sendTransaction(tx, connection) — wallet signs + broadcasts
//   4. Await confirmation on-chain
//
// FALLBACK:
//   If the API call fails, methods throw — callers (useAppState)
//   catch and fall back to mockAdapter.
// ============================================================

import type { Connection, VersionedTransaction, Transaction } from '@solana/web3.js';
import type { VaultAdapter } from './adapter';
import type { VaultState } from '../tranche/types';
import { rangerApi } from './rangerApiClient';

// sendTransaction signature matches useWallet().sendTransaction
type SendTransactionFn = (
  tx: VersionedTransaction | Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean }
) => Promise<string>;

export class LiveAdapter implements VaultAdapter {
  readonly adapterType = 'live' as const;

  private _decimals = 6;

  constructor(
    private connection: Connection,
    private sendTransaction: SendTransactionFn,
    private vaultPubkey: string,
    private userPubkey: string
  ) {}

  async getVaultState(): Promise<VaultState> {
    const [vault, sharePrice] = await Promise.all([
      rangerApi.getVault(this.vaultPubkey),
      rangerApi.getSharePrice(this.vaultPubkey),
    ]);
    this._decimals = vault.decimals;
    return {
      vaultId: vault.pubkey,
      vaultName: vault.name || 'Ranger USDC Vault',
      asset: 'USDC',
      sharePrice: sharePrice,
      totalAssets: vault.totalValueUsd,
      currentApy: vault.apy,
      lastUpdatedAt: Date.now(),
    };
  }

  async getBaseApy(): Promise<number> {
    const vault = await rangerApi.getVault(this.vaultPubkey);
    this._decimals = vault.decimals;
    return vault.apy;
  }

  async getSharePrice(): Promise<number> {
    return rangerApi.getSharePrice(this.vaultPubkey);
  }

  async depositToVault(amountUsdc: number): Promise<{ sharesReceived: number; txId: string }> {
    // 1. Create unsigned transaction via Ranger API
    const txEncoded = await rangerApi.createDepositTx(
      this.vaultPubkey,
      this.userPubkey,
      amountUsdc,
      this._decimals
    );

    // 2. Deserialize — try VersionedTransaction, fall back to legacy Transaction
    const txBytes = this._decodeTransaction(txEncoded);
    const tx = await this._deserializeTransaction(txBytes);

    // 3. Sign + broadcast via connected wallet
    const sig = await this.sendTransaction(tx, this.connection, {
      skipPreflight: false,
    });

    // 4. Await confirmation
    await this.connection.confirmTransaction(sig, 'confirmed');

    // 5. Compute shares received (approximation: amount / sharePrice)
    const sharePrice = await rangerApi.getSharePrice(this.vaultPubkey);
    const sharesReceived = amountUsdc / sharePrice;

    return { sharesReceived, txId: sig };
  }

  async withdrawFromVault(shares: number): Promise<{ amountReturned: number; txId: string }> {
    // Compute USDC value of shares at current share price
    const sharePrice = await rangerApi.getSharePrice(this.vaultPubkey);
    const amountUsdc = shares * sharePrice;

    // 1. Create unsigned withdrawal transaction
    const txEncoded = await rangerApi.createWithdrawTx(
      this.vaultPubkey,
      this.userPubkey,
      amountUsdc,
      this._decimals
    );

    // 2. Deserialize
    const txBytes = this._decodeTransaction(txEncoded);
    const tx = await this._deserializeTransaction(txBytes);

    // 3. Sign + broadcast
    const sig = await this.sendTransaction(tx, this.connection, {
      skipPreflight: false,
    });

    // 4. Await confirmation
    await this.connection.confirmTransaction(sig, 'confirmed');

    return { amountReturned: amountUsdc, txId: sig };
  }

  // ── Private helpers ──────────────────────────────────────────

  /** Decode a base64 or base58 transaction string to bytes */
  private _decodeTransaction(encoded: string): Uint8Array {
    // Try base64 first (standard for REST APIs)
    try {
      return Buffer.from(encoded, 'base64');
    } catch {
      // Fall back: attempt raw binary interpretation
      return Buffer.from(encoded, 'binary');
    }
  }

  /** Deserialize bytes to VersionedTransaction or legacy Transaction */
  private async _deserializeTransaction(
    bytes: Uint8Array
  ): Promise<VersionedTransaction | Transaction> {
    const { VersionedTransaction, Transaction } = await import('@solana/web3.js');
    try {
      return VersionedTransaction.deserialize(bytes);
    } catch {
      // Fall back to legacy transaction format
      return Transaction.from(bytes);
    }
  }
}
