import * as React from "react";
import { Keypair } from "@solana/web3.js";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';

const SESSION_LOCAL_STORAGE = "magicblock-session-key";
const SESSION_MIN_LAMPORTS = 0.02 * 1_000_000_000;
const SESSION_MAX_LAMPORTS = 0.05 * 1_000_000_000;

const MagicBlockEngineContext = React.createContext<MagicBlockEngine>(
  {} as MagicBlockEngine
);

export function useMagicBlockEngine(): MagicBlockEngine {
  return React.useContext(MagicBlockEngineContext);
}

export function MagicBlockEngineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MagicBlockEngineProviderInner>
      {children}
    </MagicBlockEngineProviderInner>
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

  // Handle client-side initialization
  React.useEffect(() => {
    setIsClient(true);
    let key: Keypair;
    
    try {
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
  }, []);

  const engine = React.useMemo(() => {
    if (!isClient || !sessionKey) {
      return {} as MagicBlockEngine;
    }

    return new MagicBlockEngine(
      signTransaction,
      privy,
      solanaWallets,
      sessionKey,
      {
        minLamports: SESSION_MIN_LAMPORTS,
        maxLamports: SESSION_MAX_LAMPORTS,
      }
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