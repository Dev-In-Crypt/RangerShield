# Ranger Shield — Demo Script

**Duration:** ~5 minutes  
**Audience:** Hackathon judges  
**Goal:** Show that one Ranger vault can be split into two structured yield products with deterministic risk/return separation.

---

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. The dashboard loads with $1M seeded in the vault, split 70/30 between Senior and Junior.

---

## Step 1 — Product Intro (30s)

> "Most yield vaults give everyone the same undifferentiated risk. This product splits one Ranger vault into two structured products — Senior and Junior tranches — with different risk/return profiles baked in by math, not marketing."

Point to the dashboard header and the two tranche cards.

---

## Step 2 — Normal Scenario (60s)

The app loads in Normal scenario (12% base APY). Point to the Yield Waterfall section:

- **Gross yield:** $119,400
- **Protocol fee:** −$597
- **Senior receives:** $55,762 → 8.00% APY (target met)
- **Junior receives:** $63,041 → ~21% APY (amplified upside)

> "Junior investors get ~21% here because they agreed to absorb losses first. That's the structured yield trade-off."

---

## Step 3 — Low Yield Scenario (45s)

Click **Low Yield** button (6% base APY).

- Senior yield: ~$55,762 (still met — barely)
- Junior yield: ~$3,641 → ~1.2% APY

> "Yield compression hits junior first. Senior investors still receive close to their 8% target because they have priority. Junior takes the squeeze."

---

## Step 4 — Drawdown Scenario (60s)

Click **Drawdown** button (−5% APY).

- Gross yield: −$49,750 (a loss)
- No protocol fee charged on losses
- Junior absorbs the full −$49,750
- Warning banner appears: **"Junior Protection Exhausted"**
- Senior NAV is unchanged — protected

> "This is the core promise. Junior investors absorb all losses before senior is touched. Senior is only at risk after the entire junior buffer is gone. The warning banner makes this explicit — never silent about loss conditions."

---

## Step 5 — Deposit Demo (45s)

Switch back to **Normal** scenario. In the Senior tranche card:

1. Type `10000` in the deposit field
2. Click **Deposit**
3. Show that Senior shares increase, NAV stays at 1.0

> "Deposits mint tranche shares at current NAV, just like a real vault. Redemptions burn shares and return assets."

Optionally deposit into Junior and show different APY projection.

---

## Step 6 — Persistence Demo (15s)

Click **Reset Demo** to restore initial state. Then refresh the page.

> "State survives page refresh via localStorage. In a real integration this would be on-chain position accounting."

---

## Architecture in 30 Seconds

```
Ranger Vault (mock)
      │
      ▼
 Vault Adapter (interface — swappable to live)
      │
      ▼
 Tranche Engine (deterministic TypeScript)
      │
 ┌────┴────┐
 ▼         ▼
Senior    Junior
```

- **98 tests** covering all waterfall math and edge cases
- **Mock adapter** — live integration path documented in `RESEARCH.md`
- **TypeScript throughout** — no hidden magic

---

## Key Numbers to Remember

| Metric | Value |
|---|---|
| Total vault TVL | $1,000,000 |
| Senior allocation | 70% ($700,000) |
| Junior allocation | 30% ($300,000) |
| Senior target APY | 8% |
| Protocol fee | 0.5% |
| Normal scenario junior APY | ~21% |
| Drawdown junior loss | −$49,750 |
