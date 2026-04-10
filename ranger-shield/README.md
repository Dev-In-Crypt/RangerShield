# Ranger Shield

Protected yield product built on Ranger vaults. Takes one base Ranger yield vault and splits it into two investable risk profiles:

- **Protected Position** — 70% of capital, 10% target APY, first claim on yield, last to absorb losses
- **Risk Buffer** — 30% of capital, residual/amplified yield, first loss absorber

---

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run test       # run unit tests
npm run test:watch # watch mode
```

---

## Architecture

```
lib/
  constants/index.ts       ← all named constants with rationale
  tranche/types.ts         ← domain types (VaultState, TrancheState, WaterfallResult, ...)
  ranger/
    adapter.ts             ← VaultAdapter interface
    mockAdapter.ts         ← mock implementation (used in MVP)
    liveAdapter.ts         ← live adapter (Ranger REST API + Solana wallet)
    rangerApiClient.ts     ← typed client for api.voltr.xyz
  tranche/
    engine.ts              ← waterfall + tranche accounting
    math.ts                ← NAV and share price math
  scenarios/
    presets.ts             ← scenario definitions
    simulator.ts           ← scenario runner
```

---

## Key Design Decisions

| Decision | Value |
|---|---|
| Protected Position ratio | 70% |
| Risk Buffer ratio | 30% |
| Protected target APY | 10% |
| Mock base vault APY | 12% |
| State persistence | localStorage |
| Live vault | Ranger USD — `9VTUJwN8paqF679yeMpDG6x6imtagCisYUSTCm1J8pXe` |

**Risk Buffer wipeout behavior:** When the buffer is exhausted and losses begin touching the Protected Position, the UI shows explicit warnings — never silent.

---

## Waterfall Rules

1. Underlying vault accrues yield (or loss)
2. Protocol fee deducted (0.5%)
3. Protected Position receives yield up to its 10% annual target first
4. Remaining yield goes to Risk Buffer
5. In a loss: Risk Buffer absorbs first; Protected Position is only hit after buffer is fully wiped

---

## Ranger Integration

**Live adapter:** `liveAdapter.ts` integrates with `api.voltr.xyz` REST API.
- Vault state, APY, share price from `GET /vault/{pubkey}`
- Unsigned deposit/withdraw transactions from `POST /vault/{pubkey}/deposit`
- Wallet signing via `@solana/wallet-adapter-react` (Phantom, Solflare)
- Auto-switches to mock adapter when no wallet is connected

**Vault:** `9VTUJwN8paqF679yeMpDG6x6imtagCisYUSTCm1J8pXe` (Ranger USD, Solana mainnet)

---

## Waterfall Diagram

```
Gross Vault Yield
      │
      ▼
 − Protocol Fee (0.5%, positive yield only)
      │
      ▼
 Distributable Yield
      │
   ┌──┴──────────────────────────────┐
   ▼                                 ▼
 PROTECTED (priority)             BUFFER (residual)
 Up to 10% target APY             Everything remaining
 Protected until buffer            First to absorb losses
 is fully exhausted
```

**Expected numbers (Normal scenario, $1M vault, 1 year):**

| | Amount |
|---|---|
| Gross yield | $120,000 |
| Protocol fee (0.5%) | −$600 |
| Distributable | $119,400 |
| Protected yield (10% of $700k) | $70,000 |
| Buffer yield (residual) | $49,400 |
| Protected APY | 10.00% |
| Buffer APY | ~16.47% |
