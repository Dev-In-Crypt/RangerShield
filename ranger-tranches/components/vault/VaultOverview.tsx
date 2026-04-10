import { formatApy, formatUsdc, formatNav } from '@/lib/utils/format';

interface VaultOverviewProps {
  vaultName: string;
  asset: string;
  currentApy: number;
  totalAssets: number;
  sharePrice: number;
  activeScenario: 'normal' | 'lowYield' | 'drawdown';
}

const apyColor: Record<string, string> = {
  normal: 'text-emerald-400',
  lowYield: 'text-amber-400',
  drawdown: 'text-rose-400',
};

export function VaultOverview({
  vaultName,
  asset,
  currentApy,
  totalAssets,
  sharePrice,
  activeScenario,
}: VaultOverviewProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">{vaultName}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Denomination: {asset}</p>
        </div>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded font-mono border border-zinc-700">
          Mock Adapter
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col">
          <span className={`text-2xl font-bold font-mono ${apyColor[activeScenario]}`}>
            {formatApy(currentApy)}
          </span>
          <span className="text-xs uppercase tracking-widest text-zinc-400 mt-1">Base Vault APY</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white font-mono">{formatUsdc(totalAssets)}</span>
          <span className="text-xs uppercase tracking-widest text-zinc-400 mt-1">Total Assets Under Management</span>
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-white font-mono">{formatNav(sharePrice)}</span>
          <span className="text-xs uppercase tracking-widest text-zinc-400 mt-1">Vault Share Price</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-zinc-800/50 border border-zinc-700 px-4 py-3 text-zinc-400 text-sm leading-relaxed">
        This vault&apos;s yield is split into two structured products:{' '}
        <span className="text-indigo-400 font-medium">Protected Position</span> (priority, shielded) and{' '}
        <span className="text-amber-400 font-medium">Risk Buffer</span> (amplified upside, first loss). Your return
        depends on which position you hold.
      </div>
    </div>
  );
}
