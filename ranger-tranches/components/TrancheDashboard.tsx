'use client';

import { useAppState } from '@/lib/hooks/useAppState';
import { DEFAULT_WATERFALL_CONFIG } from '@/lib/tranche/engine';
import { WarningBanner } from '@/components/WarningBanner';
import { VaultOverview } from '@/components/vault/VaultOverview';
import { ScenarioSelector } from '@/components/scenarios/ScenarioSelector';
import { WaterfallBreakdown } from '@/components/scenarios/WaterfallBreakdown';
import { TrancheCard } from '@/components/tranche/TrancheCard';
import { WalletButton } from '@/components/WalletButton';
import type { ReactNode } from 'react';

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
      {children}
    </h2>
  );
}

export default function TrancheDashboard() {
  const { state, isLoading, lastWaterfallResult, isLive, actions } = useAppState();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400 text-sm animate-pulse">Initializing vault state…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-400 text-sm mb-4">Failed to load state.</p>
          <button
            onClick={() => void actions.reset()}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 transition-colors"
          >
            Reset &amp; Retry
          </button>
        </div>
      </div>
    );
  }

  const hasWarning = state.warnings.juniorExhausted || state.warnings.seniorAbsorbingLosses;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Ranger Shield</h1>
            <p className="text-xs text-zinc-500">Protected Yield Protocol · Hackathon MVP</p>
          </div>
          <div className="flex items-center gap-2">
            <WalletButton />
            <button
              onClick={() => void actions.reset()}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </header>

      {/* Warning banner — sticky below header */}
      {hasWarning && (
        <div className="sticky top-[73px] z-10 bg-zinc-950 py-2 border-b border-rose-900/30">
          <WarningBanner
            juniorExhausted={state.warnings.juniorExhausted}
            seniorAbsorbingLosses={state.warnings.seniorAbsorbingLosses}
          />
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Section 1: Base Vault */}
        <section>
          <SectionLabel>Base Vault</SectionLabel>
          <VaultOverview
            vaultName={state.vault.vaultName}
            asset={state.vault.asset}
            currentApy={state.vault.currentApy}
            totalAssets={state.vault.totalAssets}
            sharePrice={state.vault.sharePrice}
            activeScenario={state.activeScenario}
          />
        </section>

        {/* Section 2: Scenario Selector */}
        <section>
          <SectionLabel>Stress Test Scenarios</SectionLabel>
          <ScenarioSelector
            activeScenario={state.activeScenario}
            onSelect={actions.applyScenario}
          />
        </section>

        {/* Section 3: Waterfall Breakdown */}
        <section>
          <SectionLabel>Yield Waterfall</SectionLabel>
          <WaterfallBreakdown
            result={lastWaterfallResult}
            activeScenario={state.activeScenario}
          />
        </section>

        {/* Section 4: Tranche Cards */}
        <section>
          <SectionLabel>Yield Positions</SectionLabel>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TrancheCard
              tranche={state.senior}
              ratio={DEFAULT_WATERFALL_CONFIG.seniorRatio}
              targetApy={DEFAULT_WATERFALL_CONFIG.seniorTargetApy}
              onDeposit={actions.deposit}
              onRedeem={actions.redeem}
            />
            <TrancheCard
              tranche={state.junior}
              ratio={DEFAULT_WATERFALL_CONFIG.juniorRatio}
              onDeposit={actions.deposit}
              onRedeem={actions.redeem}
            />
          </div>
        </section>

        {/* Section 5: How it works */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">How Ranger Shield Works</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs text-zinc-400">
            <div>
              <span className="block font-semibold text-indigo-400 mb-1">Protected Position</span>
              Gets paid first from vault yield. Targets a fixed 10% annual APY. Shielded until the
              risk buffer is fully exhausted. Lower risk, predictable return profile.
            </div>
            <div>
              <span className="block font-semibold text-amber-400 mb-1">Risk Buffer</span>
              Receives residual yield after the protected position is paid. Absorbs ALL losses before
              protected capital is touched. Higher risk, amplified upside in healthy yield environments.
            </div>
            <div>
              <span className="block font-semibold text-zinc-300 mb-1">Waterfall Priority</span>
              Gross yield → protocol fee deduction → protected position paid up to 10% target → risk
              buffer receives remainder. In losses: buffer absorbs first, protected only at risk after
              buffer is exhausted.
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-600 space-y-1">
        <div>
          Ranger Shield · Hackathon MVP · localStorage Persistence · 98 Tests Passing
        </div>
        <div>
          {isLive ? (
            <span className="text-emerald-600">
              🟢 Live · Ranger Vault · api.voltr.xyz
            </span>
          ) : (
            <span>⚫ Demo Mode · Mock Vault Adapter</span>
          )}
        </div>
      </footer>
    </div>
  );
}
