# Ranger Shield — Architecture

## Component Tree

```
app/page.tsx                           ← Server Component (thin shell)
  └── components/TrancheDashboard.tsx  ← 'use client', owns all state via useAppState
        ├── components/WarningBanner.tsx              (props: juniorExhausted, seniorAbsorbingLosses)
        ├── components/vault/VaultOverview.tsx         (props: vault fields, activeScenario)
        ├── components/scenarios/ScenarioSelector.tsx  (props: activeScenario, onSelect)
        ├── components/scenarios/WaterfallBreakdown.tsx (props: result, activeScenario)
        └── components/tranche/TrancheCard.tsx         (props: tranche, ratio, onDeposit, onRedeem)
              └── 'use client' (local deposit/redeem form state only)
```

All state lives in `useAppState`. Components receive props only — no prop drilling bypassed with context.

---

## Data Flow

```
mockAdapter.getVaultState()
      │
      ▼
createInitialState(vaultState, waterfallConfig)
      │
      ▼
AppState ──────────────────────────────────────────┐
      │                                             │
  useAppState()                              saveState() → localStorage
      │
      ├── deposit(trancheId, amount)
      │     └── engine.deposit() → new AppState
      │
      ├── redeem(trancheId, shares)
      │     └── engine.redeem() → new AppState
      │
      ├── applyScenario(scenarioId)
      │     ├── simulator.applyScenario() → new AppState
      │     └── simulator.getScenarioResult() → WaterfallResult
      │
      └── reset()
            └── clearState() + mockAdapter reset + createInitialState()
```

---

## AppState Shape

```typescript
AppState {
  schemaVersion: 1,
  vault: VaultState {
    vaultId, vaultName, asset,
    totalAssets,   // total capital in the vault
    sharePrice,    // mock: 1.0
    currentApy,    // set by active scenario
    lastUpdatedAt
  },
  senior: TrancheState {
    trancheId: 'senior',
    totalDeposited,   // historical, never decremented
    totalShares,      // currently outstanding
    navPerShare,      // currentValue / totalShares
    currentValue,     // adjusted by waterfall
    projectedApy,     // recomputed after each waterfall
    isExhausted
  },
  junior: TrancheState { ... },  // same shape
  waterfallConfig: WaterfallConfig {
    seniorRatio: 0.70,
    juniorRatio: 0.30,
    seniorTargetApy: 0.08,
    protocolFee: 0.005,
    enableReserveBuffer: false
  },
  deposits: Deposit[],       // full history, append-only
  redemptions: Redemption[], // full history, append-only
  activeScenario: 'normal' | 'lowYield' | 'drawdown',
  warnings: {
    juniorExhausted: boolean,
    seniorAbsorbingLosses: boolean
  }
}
```

---

## Waterfall Engine (`lib/tranche/engine.ts`)

**Yield scenario (positive base APY):**
1. `grossYield = totalAssets × baseApy × (days / 365)`
2. `protocolFee = grossYield × 0.005`
3. `distributable = grossYield − protocolFee`
4. `seniorTarget = seniorValue × 0.08 × (days / 365)`
5. `seniorYield = min(distributable, seniorTarget)`
6. `juniorYield = distributable − seniorYield`
7. Apply to `senior.currentValue` and `junior.currentValue`

**Loss scenario (negative base APY):**
1. `loss = abs(grossYield)` (no fee on losses)
2. `juniorAbsorbs = min(loss, junior.currentValue)`
3. `juniorYield = −juniorAbsorbs`
4. `remainingLoss = loss − juniorAbsorbs`
5. `seniorYield = −remainingLoss` (only if junior exhausted)
6. Set `warnings.juniorExhausted` and `warnings.seniorAbsorbingLosses` if applicable

---

## Vault Adapter (`lib/ranger/`)

```typescript
interface VaultAdapter {
  getVaultState(): Promise<VaultState>;
  depositToVault(amountUsdc: number): Promise<void>;
  withdrawFromVault(shares: number): Promise<void>;
  getBaseApy(): Promise<number>;
  getSharePrice(): Promise<number>;
  readonly adapterType: 'mock' | 'live';
}
```

**Mock** (`mockAdapter.ts`): deterministic, mutable internal state. `setMockApy()` used by scenario engine.

**Live stub** (`liveAdapter.ts`): all methods throw `NotImplementedError`. To integrate live Ranger:
1. Install `@solana/web3.js` + wallet adapter
2. Replace `getVaultState()` to read on-chain vault account
3. Replace `depositToVault()` / `withdrawFromVault()` to build + submit Solana instructions via `@voltr/vault-sdk`
4. APY requires an off-chain indexer (no direct endpoint in SDK v1.0.21)

See `RESEARCH.md` for full analysis.

---

## Test Coverage

| File | Tests | Coverage |
|---|---|---|
| `tests/tranche/math.test.ts` | 13 | NAV, share math, yield calculations |
| `tests/tranche/types.test.ts` | 15 | Type structure smoke tests |
| `tests/tranche/engine.test.ts` | 35 | Deposit, redeem, waterfall, warnings, edge cases |
| `tests/scenarios/simulator.test.ts` | 15 | Scenario application, APY projection |
| **Total** | **98** | All passing |

```bash
npm run test        # run all
npm run test:watch  # watch mode
npx tsc --noEmit    # type check
```

---

## State Persistence

- **Key:** `ranger_tranches_state` (localStorage)
- **Schema version:** `1` — on mismatch, stored state is discarded and reinitialized
- **SSR guard:** all storage reads wrapped in `typeof window === 'undefined'` check
- **Trigger:** every action (`deposit`, `redeem`, `applyScenario`, `reset`) calls `saveState()`
