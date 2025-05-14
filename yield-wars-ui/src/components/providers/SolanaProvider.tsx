'use client';

import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    if (typeof window === 'undefined') {
      return clusterApiUrl(network); // Default to mainnet during SSR
    }
    
    // When testing locally with validator, use 'http://localhost:8899'
    if (process.env.NEXT_PUBLIC_USE_LOCAL_VALIDATOR === 'true') {
      return 'http://localhost:8899';
    }
    return clusterApiUrl(network);
  }, [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking
  const wallets = useMemo(
    () => {
      if (typeof window === 'undefined') {
        return []; // Return empty array during SSR
      }
      return [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ];
    },
    []
  );

  if (typeof window === 'undefined') {
    return <>{children}</>; // Return children without wallet providers during SSR
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
} 