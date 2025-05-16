import * as React from "react";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { useAnchorWallet } from "@/components/providers/AnchorWalletProvider";
import { WalletProvider, useWallet, ConnectionProvider } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

const SESSION_LOCAL_STORAGE = "magicblock-session-key";
const SESSION_MIN_LAMPORTS = 0.02 * 1_000_000_000;
const SESSION_MAX_LAMPORTS = 0.05 * 1_000_000_000;
const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";

const MagicBlockEngineContext = React.createContext<MagicBlockEngine>(
  {} as MagicBlockEngine
);

export function useMagicBlockEngine(): MagicBlockEngine {
  return React.useContext(MagicBlockEngineContext);
}

// Initialize wallet adapters
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

export function MagicBlockEngineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConnectionProvider endpoint={DEFAULT_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <MagicBlockEngineProviderInner>{children}</MagicBlockEngineProviderInner>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function MagicBlockEngineProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = React.useState(false);
  const [sessionKey, setSessionKey] = React.useState<Keypair | null>(null);
  const privy = usePrivy();
  const solanaWallets = useSolanaWallets();
  const signTransaction = useSignTransaction();
  const { anchorWallet } = useAnchorWallet();
  const { wallet } = useWallet();

  // Handle client-side initialization
  React.useEffect(() => {
    if (!isClient) {
      setIsClient(true);
    }

    let key: Keypair;
    
    try {
      // If we have an anchor wallet, use its public key
      if (anchorWallet) {
        key = Keypair.generate(); // Generate a new keypair but we'll use anchor wallet for signing
        setSessionKey(key);
        return;
      }

      // Fallback to local storage if no anchor wallet
      const sessionKeyString = localStorage.getItem(SESSION_LOCAL_STORAGE);
      if (sessionKeyString) {
        key = Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(sessionKeyString))
        );
      } else {
        key = Keypair.generate();
        localStorage.setItem(
          SESSION_LOCAL_STORAGE,
          JSON.stringify(Array.from(key.secretKey))
        );
      }
      setSessionKey(key);
    } catch (error) {
      console.error("Error initializing session key:", error);
      // Fallback to a new keypair if localStorage fails
      key = Keypair.generate();
      setSessionKey(key);
    }
  }, [isClient, anchorWallet]);

  const engine = React.useMemo(() => {
    if (!isClient || !sessionKey) {
      return {} as MagicBlockEngine;
    }

    // Set the ANCHOR_WALLET environment variable
    if (typeof process !== 'undefined') {
      process.env.ANCHOR_WALLET = sessionKey.secretKey.toString();
    }

    return new MagicBlockEngine(
      signTransaction,
      privy,
      solanaWallets,
      sessionKey,
      {
        minLamports: SESSION_MIN_LAMPORTS,
        maxLamports: SESSION_MAX_LAMPORTS,
      },
      DEFAULT_ENDPOINT
    );
  }, [isClient, sessionKey, privy, solanaWallets, signTransaction]);

  if (!isClient || !sessionKey) {
    return null;
  }

  return (
    <MagicBlockEngineContext.Provider value={engine}>
      {children}
    </MagicBlockEngineContext.Provider>
  );
}