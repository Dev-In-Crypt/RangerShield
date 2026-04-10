'use client';

/**
 * Providers — wraps the application with Solana wallet + connection context.
 *
 * WalletProvider is a client-only context. Wallet adapters are instantiated
 * lazily inside useMemo to avoid SSR issues.
 *
 * Supported wallets: Phantom, Solflare (auto-detect others via wallet standard).
 */

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
