'use client';

import { useState } from 'react';
import { formatApy, formatUsdc, formatNav, formatShares, formatRatio } from '@/lib/utils/format';
import type { TrancheState, TrancheId } from '@/lib/tranche/types';

interface TrancheCardProps {
  tranche: TrancheState;
  ratio: number;
  targetApy?: number;
  onDeposit: (trancheId: TrancheId, amountUsdc: number) => void;
  onRedeem: (trancheId: TrancheId, shares: number) => void;
}

const theme = {
  senior: {
    border: 'border-indigo-700/50',
    header: 'bg-indigo-900/30',
    badge: 'bg-indigo-800/50 text-indigo-300 border-indigo-700/50',
    apyText: 'text-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500/50',
    ring: 'focus:ring-indigo-500/50',
    roleBadge: 'bg-indigo-900/60 text-indigo-300 border-indigo-600/40',
  },
  junior: {
    border: 'border-amber-700/50',
    header: 'bg-amber-900/30',
    badge: 'bg-amber-800/50 text-amber-300 border-amber-700/50',
    apyText: 'text-amber-400',
    button: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/50',
    ring: 'focus:ring-amber-500/50',
    roleBadge: 'bg-amber-900/60 text-amber-300 border-amber-600/40',
  },
};

export function TrancheCard({ tranche, ratio, targetApy, onDeposit, onRedeem }: TrancheCardProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [depositError, setDepositError] = useState('');
  const [redeemShares, setRedeemShares] = useState('');
  const [redeemError, setRedeemError] = useState('');

  const t = theme[tranche.trancheId];
  const isSenior = tranche.trancheId === 'senior';
  const trancheName = isSenior ? 'Protected Position' : 'Risk Buffer';
  const roleLabel = isSenior ? 'Priority Yield' : 'Loss Reserve';

  function handleDeposit() {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) {
      setDepositError('Minimum deposit is $10 USDC');
      return;
    }
    setDepositError('');
    onDeposit(tranche.trancheId, amount);
    setDepositAmount('');
  }

  function handleRedeem() {
    const shares = parseFloat(redeemShares);
    if (isNaN(shares) || shares <= 0) {
      setRedeemError('Enter a positive share amount');
      return;
    }
    if (shares > tranche.totalShares) {
      setRedeemError(`Max redeemable: ${formatShares(tranche.totalShares)} shares`);
      return;
    }
    setRedeemError('');
    onRedeem(tranche.trancheId, shares);
    setRedeemShares('');
  }

  const inputClass = `w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${t.ring} transition-colors`;
  const buttonClass = `w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed ${t.button}`;

  return (
    <div className={`rounded-xl border ${t.border} bg-zinc-900 overflow-hidden`}>
      {/* Header */}
      <div className={`${t.header} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-white">{trancheName}</span>
          <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${t.badge}`}>
            {formatRatio(ratio)} of capital
          </span>
        </div>
        <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${t.roleBadge}`}>
          {roleLabel}
        </span>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-2xl font-bold font-mono ${t.apyText}`}>
              {formatApy(tranche.projectedApy)}
            </p>
            <p className="text-xs uppercase tracking-widest text-zinc-400 mt-0.5">Projected APY</p>
            {isSenior && targetApy !== undefined && (
              <p className="text-xs text-zinc-500 mt-0.5">Target: {formatApy(targetApy)}</p>
            )}
            {!isSenior && (
              <p className="text-xs text-zinc-500 mt-0.5">Residual after Protected</p>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-white font-mono">{formatUsdc(tranche.currentValue)}</p>
            <p className="text-xs uppercase tracking-widest text-zinc-400 mt-0.5">Current Value</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono">{formatNav(tranche.navPerShare)}</p>
            <p className="text-xs uppercase tracking-widest text-zinc-400 mt-0.5">NAV Per Share</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white font-mono">{formatShares(tranche.totalShares)}</p>
            <p className="text-xs uppercase tracking-widest text-zinc-400 mt-0.5">Outstanding Shares</p>
          </div>
        </div>

        <div className="border-t border-zinc-800" />

        {tranche.isExhausted ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300 text-center">
            This tranche has been fully wiped out by losses.
          </div>
        ) : (
          <>
            {/* Deposit form */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                Deposit USDC
              </label>
              <input
                type="number"
                min="10"
                step="any"
                placeholder="Min $10 USDC"
                value={depositAmount}
                onChange={(e) => { setDepositAmount(e.target.value); setDepositError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleDeposit()}
                className={inputClass}
              />
              {depositError && <p className="text-xs text-rose-400">{depositError}</p>}
              <button onClick={handleDeposit} className={buttonClass}>
                Deposit
              </button>
            </div>

            {/* Redeem form */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                Redeem Shares
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Number of shares"
                value={redeemShares}
                onChange={(e) => { setRedeemShares(e.target.value); setRedeemError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                className={inputClass}
              />
              <p className="text-xs text-zinc-500">
                Available: {formatShares(tranche.totalShares)} shares
              </p>
              {redeemError && <p className="text-xs text-rose-400">{redeemError}</p>}
              <button onClick={handleRedeem} className={buttonClass}>
                Redeem
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
