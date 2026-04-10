'use client';

/**
 * WalletButton — Solana wallet connect/disconnect control.
 *
 * Shows a "Connect Wallet" button when disconnected.
 * Shows a truncated address + "Disconnect" when connected.
 *
 * Styled to match the dashboard's zinc/dark palette.
 */

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';

function truncatePubkey(pk: string): string {
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

export function WalletButton() {
  const { connected, publicKey, connect, disconnect, wallets, select } = useWallet();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    if (connected) return;
    setConnecting(true);
    try {
      // Auto-select Phantom if available, otherwise first detected wallet
      const phantom = wallets.find((w) => w.adapter.name === 'Phantom');
      const target = phantom ?? wallets[0];
      if (target) {
        select(target.adapter.name);
        await connect();
      }
    } catch (err) {
      // User rejected or wallet not installed — silently ignore
      console.warn('[WalletButton] connect failed:', err);
    } finally {
      setConnecting(false);
    }
  }, [connected, wallets, select, connect]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch (err) {
      console.warn('[WalletButton] disconnect failed:', err);
    }
  }, [disconnect]);

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-emerald-400 font-mono">
          {truncatePubkey(publicKey.toBase58())}
        </span>
        <button
          onClick={() => void handleDisconnect()}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => void handleConnect()}
      disabled={connecting}
      className="rounded-lg border border-indigo-700 bg-indigo-900/40 px-3 py-1.5 text-xs text-indigo-300 hover:bg-indigo-800/60 hover:text-white transition-colors disabled:opacity-50"
    >
      {connecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
