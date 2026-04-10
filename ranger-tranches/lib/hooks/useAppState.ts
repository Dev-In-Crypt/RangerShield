'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import type { AppState, TrancheId, WaterfallResult } from '@/lib/tranche/types';
import type { ScenarioConfig } from '@/lib/tranche/types';
import type { VaultAdapter } from '@/lib/ranger/adapter';
import {
  createInitialState,
  deposit as engineDeposit,
  redeem as engineRedeem,
  DEFAULT_WATERFALL_CONFIG,
} from '@/lib/tranche/engine';
import {
  applyScenario as engineApplyScenario,
  getScenarioResult,
} from '@/lib/scenarios/simulator';
import { saveState, loadState, clearState } from '@/lib/storage';
import { mockAdapter, resetMockAdapter } from '@/lib/ranger/mockAdapter';
import { LiveAdapter } from '@/lib/ranger/liveAdapter';

const VAULT_PUBKEY =
  process.env.NEXT_PUBLIC_RANGER_VAULT_PUBKEY ?? '';

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastWaterfallResult, setLastWaterfallResult] = useState<WaterfallResult | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Ref for synchronous reads inside callbacks (avoids stale closures)
  const stateRef = useRef<AppState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Solana wallet context
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // ── Adapter selection ──────────────────────────────────────
  // Use LiveAdapter when a wallet is connected and a vault pubkey is configured.
  // Fall back to mockAdapter when not connected (preserves Playwright e2e tests).
  const activeAdapter = useMemo((): VaultAdapter => {
    if (connected && publicKey && sendTransaction && VAULT_PUBKEY) {
      return new LiveAdapter(
        connection,
        sendTransaction,
        VAULT_PUBKEY,
        publicKey.toBase58()
      );
    }
    return mockAdapter;
  }, [connected, publicKey, sendTransaction, connection]);

  // ── State initialisation ───────────────────────────────────
  const initState = useCallback(
    async (adapter: VaultAdapter) => {
      setIsLoading(true);
      try {
        // If live adapter, always fetch fresh data (don't restore stale localStorage)
        if (adapter.adapterType === 'live') {
          const vaultState = await adapter.getVaultState();
          const fresh = createInitialState(vaultState, DEFAULT_WATERFALL_CONFIG);
          const initialResult = getScenarioResult(fresh.vault, fresh.waterfallConfig, 'normal');
          saveState(fresh);
          setState(fresh);
          setLastWaterfallResult(initialResult);
          setIsLive(true);
          return;
        }

        // Mock adapter: try restoring from localStorage first
        const saved = loadState();
        if (saved) {
          const savedResult = getScenarioResult(saved.vault, saved.waterfallConfig, saved.activeScenario);
          setState(saved);
          setLastWaterfallResult(savedResult);
          setIsLive(false);
          return;
        }

        const vaultState = await adapter.getVaultState();
        const fresh = createInitialState(vaultState, DEFAULT_WATERFALL_CONFIG);
        const initialResult = getScenarioResult(fresh.vault, fresh.waterfallConfig, 'normal');
        saveState(fresh);
        setState(fresh);
        setLastWaterfallResult(initialResult);
        setIsLive(false);
      } catch (err) {
        console.error('[useAppState] init failed, falling back to mock:', err);
        // If live adapter fails, fall back to mock
        if (adapter.adapterType === 'live') {
          const vaultState = await mockAdapter.getVaultState();
          const fresh = createInitialState(vaultState, DEFAULT_WATERFALL_CONFIG);
          const initialResult = getScenarioResult(fresh.vault, fresh.waterfallConfig, 'normal');
          setState(fresh);
          setLastWaterfallResult(initialResult);
          setIsLive(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [] // no deps — initState is stable, adapter is passed as arg
  );

  // Re-initialise when the adapter changes (wallet connects / disconnects)
  useEffect(() => {
    void initState(activeAdapter);
  }, [activeAdapter, initState]);

  // ── Actions ────────────────────────────────────────────────

  const deposit = useCallback((trancheId: TrancheId, amountUsdc: number) => {
    const current = stateRef.current;
    if (!current) return;
    try {
      const next = engineDeposit(current, trancheId, amountUsdc);
      saveState(next);
      setState(next);
    } catch (err) {
      console.error('[deposit]', err);
    }
  }, []);

  const redeem = useCallback((trancheId: TrancheId, shares: number) => {
    const current = stateRef.current;
    if (!current) return;
    try {
      const next = engineRedeem(current, trancheId, shares);
      saveState(next);
      setState(next);
    } catch (err) {
      console.error('[redeem]', err);
    }
  }, []);

  const applyScenario = useCallback((scenarioId: ScenarioConfig['scenarioId']) => {
    const current = stateRef.current;
    if (!current) return;
    const next = engineApplyScenario(current, scenarioId);
    const result = getScenarioResult(current.vault, current.waterfallConfig, scenarioId);
    saveState(next);
    setState(next);
    setLastWaterfallResult(result);
  }, []);

  const reset = useCallback(async () => {
    clearState();
    resetMockAdapter();
    setIsLoading(true);
    try {
      const vaultState = await activeAdapter.getVaultState().catch(() => mockAdapter.getVaultState());
      const fresh = createInitialState(vaultState, DEFAULT_WATERFALL_CONFIG);
      const initialResult = getScenarioResult(fresh.vault, fresh.waterfallConfig, 'normal');
      saveState(fresh);
      setState(fresh);
      setLastWaterfallResult(initialResult);
    } finally {
      setIsLoading(false);
    }
  }, [activeAdapter]);

  return {
    state,
    isLoading,
    lastWaterfallResult,
    isLive,
    actions: { deposit, redeem, applyScenario, reset },
  };
}
