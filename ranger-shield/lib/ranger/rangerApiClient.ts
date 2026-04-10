// ============================================================
// RANGER / VOLTR REST API CLIENT
//
// Typed fetch wrapper for https://api.voltr.xyz
// No auth required — permissionless REST API.
//
// All monetary values returned from the API are in raw token units
// (e.g., USDC has 6 decimals). Human-readable conversion is done here.
// All APY values from the API are percentages (e.g., 3.82 = 3.82%).
// This client normalises them to decimals (e.g., 0.0382).
// ============================================================

const BASE_URL =
  process.env.NEXT_PUBLIC_RANGER_API_URL ?? 'https://api.voltr.xyz';

// ── Raw API shapes ────────────────────────────────────────────

interface RawVaultApy {
  oneDay: number;
  sevenDays: number;
  thirtyDays: number;
  allTime: number;
}

interface RawVaultToken {
  name: string;
  decimals: number;
  icon: string;
  mint: string;
  programId: string;
  price: number;
}

interface RawVaultFees {
  performanceFee: number;
  managementFee: number;
  issuanceFee: number;
  redemptionFee: number;
}

interface RawVault {
  pubkey: string;
  name: string;
  description: string;
  totalValue: number;     // raw token units (divide by 10^decimals)
  apy: RawVaultApy;       // percentage values, e.g. 3.82 = 3.82%
  token: RawVaultToken;
  feeConfiguration: RawVaultFees;
}

interface RawSharePriceData {
  sharePrice: number;
  totalValue: number;   // raw token units
}

interface RawUserBalance {
  balance: number;      // raw token units
}

// ── Normalised types ──────────────────────────────────────────

export interface RangerVault {
  pubkey: string;
  name: string;
  description: string;
  /** Human-readable total value (already divided by token decimals) */
  totalValueUsd: number;
  /** APY as decimal, e.g. 0.0382 for 3.82%. Uses 7-day window. */
  apy: number;
  decimals: number;
  managementFeeBps: number;
}

// ── Helpers ───────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ranger API ${res.status} at ${path}: ${text}`);
  }
  const json = (await res.json()) as { success?: boolean } & T;
  return json;
}

function toHuman(rawAmount: number, decimals: number): number {
  return rawAmount / 10 ** decimals;
}

function toDecimalApy(pctApy: number): number {
  return pctApy / 100;
}

// ── Public API ────────────────────────────────────────────────

export const rangerApi = {
  /**
   * Fetch full vault details.
   * Returns normalised values (human-readable USDC, decimal APY).
   */
  async getVault(pubkey: string): Promise<RangerVault> {
    const data = await apiFetch<{ vault: RawVault }>(`/vault/${pubkey}`);
    const raw = data.vault;
    const decimals = raw.token?.decimals ?? 6;
    // Use 7-day APY as the primary metric; fall back through windows
    const rawApy =
      raw.apy?.sevenDays ??
      raw.apy?.thirtyDays ??
      raw.apy?.oneDay ??
      raw.apy?.allTime ??
      0;
    return {
      pubkey: raw.pubkey,
      name: raw.name,
      description: raw.description,
      totalValueUsd: toHuman(raw.totalValue, decimals),
      apy: toDecimalApy(rawApy),
      decimals,
      managementFeeBps: Math.round((raw.feeConfiguration?.managementFee ?? 0) * 10_000),
    };
  },

  /**
   * Fetch current LP share price.
   * Returns share price as a scalar (e.g., 1.023).
   */
  async getSharePrice(pubkey: string): Promise<number> {
    const data = await apiFetch<{ data: RawSharePriceData }>(
      `/vault/${pubkey}/share-price`
    );
    return data.data.sharePrice;
  },

  /**
   * Fetch the user's balance in the vault (in human-readable USDC).
   */
  async getUserBalance(vaultPubkey: string, userPubkey: string): Promise<number> {
    const data = await apiFetch<{ balance?: number } & RawUserBalance>(
      `/vault/${vaultPubkey}/user/${userPubkey}/balance`
    );
    // Balance might already be human-readable — use as-is if small, else divide
    // The API spec isn't explicit; we use the raw value and divide by 1e6
    const raw = data.balance ?? 0;
    // Heuristic: if value > 1e9 it's likely in lamports
    return raw > 1_000_000_000 ? raw / 1e6 : raw;
  },

  /**
   * Create a deposit transaction. Returns a base64-encoded unsigned Solana tx.
   */
  async createDepositTx(
    vaultPubkey: string,
    userPubkey: string,
    amountUsdc: number,
    decimals = 6
  ): Promise<string> {
    const lamportAmount = Math.floor(amountUsdc * 10 ** decimals);
    const data = await apiFetch<{ transaction?: string; tx?: string }>(
      `/vault/${vaultPubkey}/deposit`,
      {
        method: 'POST',
        body: JSON.stringify({ userPubkey, lamportAmount }),
      }
    );
    const tx = data.transaction ?? data.tx;
    if (!tx) throw new Error('Deposit API response missing transaction field');
    return tx;
  },

  /**
   * Create a withdrawal request transaction. Returns base64-encoded unsigned tx.
   * Uses request-withdrawal for vaults with a waiting period.
   */
  async createWithdrawTx(
    vaultPubkey: string,
    userPubkey: string,
    amountUsdc: number,
    decimals = 6
  ): Promise<string> {
    const lamportAmount = Math.floor(amountUsdc * 10 ** decimals);
    // Try direct-withdraw first (no waiting period), fall back to request-withdrawal
    try {
      const data = await apiFetch<{ transaction?: string; tx?: string }>(
        `/vault/${vaultPubkey}/direct-withdraw`,
        {
          method: 'POST',
          body: JSON.stringify({ userPubkey, lamportAmount }),
        }
      );
      const tx = data.transaction ?? data.tx;
      if (tx) return tx;
    } catch {
      // Fall through to request-withdrawal
    }
    const data = await apiFetch<{ transaction?: string; tx?: string }>(
      `/vault/${vaultPubkey}/request-withdrawal`,
      {
        method: 'POST',
        body: JSON.stringify({ userPubkey, lamportAmount }),
      }
    );
    const tx = data.transaction ?? data.tx;
    if (!tx) throw new Error('Withdrawal API response missing transaction field');
    return tx;
  },
};
