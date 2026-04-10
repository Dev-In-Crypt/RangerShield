import { SCENARIOS } from '@/lib/scenarios/presets';
import { formatScenarioApy } from '@/lib/utils/format';
import type { ScenarioConfig } from '@/lib/tranche/types';

interface ScenarioSelectorProps {
  activeScenario: ScenarioConfig['scenarioId'];
  onSelect: (scenarioId: ScenarioConfig['scenarioId']) => void;
}

const scenarioIds: ScenarioConfig['scenarioId'][] = ['normal', 'lowYield', 'drawdown'];

const activeStyles: Record<ScenarioConfig['scenarioId'], string> = {
  normal: 'bg-emerald-900/50 border-emerald-500 text-emerald-300',
  lowYield: 'bg-amber-900/50 border-amber-500 text-amber-300',
  drawdown: 'bg-rose-900/50 border-rose-500 text-rose-300',
};

const inactiveStyle =
  'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600';

export function ScenarioSelector({ activeScenario, onSelect }: ScenarioSelectorProps) {
  const active = SCENARIOS[activeScenario];

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <p className="text-xs text-zinc-400 mb-4">
        Select a scenario to simulate how the waterfall distributes yield or absorbs losses.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        {scenarioIds.map((id) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-left sm:text-center ${
              activeScenario === id ? activeStyles[id] : inactiveStyle
            }`}
          >
            {SCENARIOS[id].label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-zinc-800/50 border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
        <p className="font-medium text-white mb-1">{active.label}</p>
        <p className="text-zinc-400 text-xs leading-relaxed">{active.description}</p>
        <p className="text-zinc-500 text-xs mt-2 font-mono">
          Base APY: {formatScenarioApy(active.simulatedBaseApy)}
        </p>
      </div>
    </div>
  );
}
