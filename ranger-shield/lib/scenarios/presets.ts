// ============================================================
// RANGER TRANCHES — SCENARIO PRESETS
// Pure data. No logic.
// ============================================================

import type { ScenarioConfig } from '../tranche/types';
import { SCENARIO_APYS } from '../constants';

export const SCENARIOS: Record<ScenarioConfig['scenarioId'], ScenarioConfig> = {
  normal: {
    scenarioId: 'normal',
    label: 'Normal',
    description: 'Healthy market — vault yields 12% APY. Protected position receives its full 10% target. Risk buffer captures the residual ~16% return.',
    simulatedBaseApy: SCENARIO_APYS.normal,
    projectionDays: 365,
  },
  lowYield: {
    scenarioId: 'lowYield',
    label: 'Low Yield',
    description: 'Compressed yield — vault drops to 6% APY. Protected position gets priority but falls short of target. Risk buffer receives nothing.',
    simulatedBaseApy: SCENARIO_APYS.lowYield,
    projectionDays: 365,
  },
  drawdown: {
    scenarioId: 'drawdown',
    label: 'Drawdown',
    description: 'Loss event — vault loses 5% of assets. Risk buffer absorbs the full loss first. Protected position shielded until buffer is exhausted.',
    simulatedBaseApy: SCENARIO_APYS.drawdown,
    projectionDays: 365,
  },
};

export const DEFAULT_SCENARIO: ScenarioConfig['scenarioId'] = 'normal';
