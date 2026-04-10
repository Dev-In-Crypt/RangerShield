# Ranger Shield — Hackathon Submission Checklist

## Product

**Ranger Shield** is a protected yield product built on top of Ranger Earn vault infrastructure.
It takes one Ranger base vault and creates two differentiated risk profiles:

- **Protected Position (70%)** — priority yield, targets 10% APY, shielded from losses
- **Risk Buffer (30%)** — residual yield (~16% in normal conditions), absorbs all losses first

## On-Chain Vault Address

The Ranger vault being composed on:

```
9VTUJwN8paqF679yeMpDG6x6imtagCisYUSTCm1J8pXe
```

Vault: **Ranger USD** on Solana mainnet (Voltr/Ranger infrastructure)
API: `https://api.voltr.xyz/vault/9VTUJwN8paqF679yeMpDG6x6imtagCisYUSTCm1J8pXe`

## Submission Requirements

- [ ] **Demo video** (max 3 minutes) — record screen walkthrough using DEMO_SCRIPT.md
- [ ] **Code repository** — public GitHub or grant @jakeyvee access if private
- [ ] **Deployed URL** — deploy to Vercel: `npx vercel --prod` from `ranger-tranches/` dir
- [ ] **Submit form** — https://superteam.fun/earn/listing/ranger-build-a-bear-hackathon-main-track
- [ ] **Deadline** — April 17, 2026, 15:59 UTC

## Strategy Documentation

See `ARCHITECTURE.md` for full technical write-up.

**Yield source:** Ranger Earn vault (lending optimization, APY maximization across Solend, Drift, Marginfi, Kamino)
**Strategy APY target:** 12% base vault → 10% protected / ~16% buffer
**Risk management:** Deterministic waterfall, 30% loss buffer, explicit exhaustion alerts
**Minimum APY met:** Yes — vault base targets 12%, above the 10% minimum requirement
**Base asset:** USDC ✓

## Technical Implementation

- Next.js 16 + TypeScript + Tailwind CSS
- Ranger REST API integration (`api.voltr.xyz`) via live adapter
- Solana wallet connection (Phantom, Solflare) via `@solana/wallet-adapter-react`
- Unsigned transaction flow: Ranger API → wallet signs → Solana broadcast
- 98 unit tests + 53 Playwright e2e tests
- localStorage persistence for demo stability
