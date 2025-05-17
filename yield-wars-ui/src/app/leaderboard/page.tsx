'use client';

import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import Leaderboard from '@/components/waitlist/Leaderboard';
import '@solana/wallet-adapter-react-ui/styles.css';

const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Initialize wallet adapters
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

export default function LeaderboardPage() {
  return (
    <ConnectionProvider endpoint={DEFAULT_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <main className="min-h-screen flex flex-col items-center pt-12 pb-24">
            <Leaderboard />
          </main>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}