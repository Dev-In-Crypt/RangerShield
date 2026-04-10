# Ranger Shield

Protected yield product built on [Ranger](https://ranger.finance) vaults.

**[Watch Demo](https://youtu.be/NZ4xLvSIBA8)**

Takes one base Ranger yield vault and splits it into two investable risk profiles:

| Position | Capital | Target APY | Role |
|---|---|---|---|
| **Protected Position** | 70% | 10% | Priority yield, shielded from losses |
| **Risk Buffer** | 30% | Residual (~16%) | Amplified upside, first loss absorber |

## How it works

```
Gross Vault Yield
      │
      ▼
 − Protocol Fee (0.5%)
      │
      ▼
 Distributable Yield
      │
   ┌──┴──────────────────────────────┐
   ▼                                 ▼
 PROTECTED (priority)             BUFFER (residual)
 Up to 10% target APY             Everything remaining
 Shielded until buffer            First to absorb losses
 is fully exhausted
```

**Normal scenario ($1M vault, 12% APY, 1 year):**
- Gross yield: $120,000 → fee: −$600 → distributable: $119,400
- Protected gets: $70,000 → **10.00% APY**
- Buffer gets: $49,400 → **~16.47% APY**

## Stack

- Next.js 16 · TypeScript · Tailwind CSS
- Ranger REST API (`api.voltr.xyz`) for live vault data
- Solana wallet adapter (Phantom, Solflare) for transaction signing
- 98 unit tests · 53 Playwright e2e tests

## Vault

`9VTUJwN8paqF679yeMpDG6x6imtagCisYUSTCm1J8pXe` — Ranger USD, Solana mainnet

## Setup

```bash
cd ranger-shield
npm install
npm run dev        # http://localhost:3000
npm run test       # 98 unit tests
npx playwright test # 53 e2e tests
```
