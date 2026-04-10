// ============================================================
// RANGER TRANCHES — SCENARIO SIMULATOR
//
// Connects scenario selection to the mock adapter and waterfall engine.
// This is the only file that calls setMockApy() from the mock adapter.
// ============================================================

import type { AppState, ScenarioConfig, VaultState, WaterfallConfig, WaterfallResult } from '../tranche/types';
import { applyWaterfall, createInitialState } from '../tranche/engine';
import { setMockApy } from '../ranger/mockAdapter';
import { SCENARIOS } from './presets';

/**
 * Apply a scenario to the current state.
 * - Updates the mock adapter's APY (for consistency with any direct adapter reads)
 * - Runs the waterfall with the scenario APY
 * - Returns updated state with activeScenario set
 */
export function applyScenario(
  state: AppState,
  scenarioId: ScenarioConfig['scenarioId']
): AppState {
  const scenario = SCENARIOS[scenarioId];
  const days = scenario.projectionDays ?? 365;

  // Keep mock adapter consistent with the active scenario
  setMockApy(scenario.simulatedBaseApy);

  const { newState } = applyWaterfall(state, scenario.simulatedBaseApy, days);

  return {
    ...newState,
    // Update vault APY so VaultOverview reflects the active scenario
    vault: { ...newState.vault, currentApy: scenario.simulatedBaseApy },
    activeScenario: scenarioId,
  };
}

/**
 * Compute a WaterfallResult for a scenario without mutating any state.
 * Used for side-by-side scenario comparison in UI.
 */
export function getScenarioResult(
  vaultState: VaultState,
  waterfallConfig: WaterfallConfig,
  scenarioId: ScenarioConfig['scenarioId']
): WaterfallResult {
  const scenario = SCENARIOS[scenarioId];
  const days = scenario.projectionDays ?? 365;

  // Build a temporary state to run the waterfall against
  const tempState = createInitialState(vaultState, waterfallConfig);
  const { result } = applyWaterfall(tempState, scenario.simulatedBaseApy, days);

  return result;
}
