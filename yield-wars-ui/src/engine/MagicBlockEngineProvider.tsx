import * as React from "react";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { useProgram } from "@/components/providers/ProgramProvider";

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
  const [isClient, setIsClient] = React.useState(false);
  const [sessionKey, setSessionKey] = React.useState<Keypair | null>(null);
  const privy = usePrivy();
  const solanaWallets = useSolanaWallets();
  const signTransaction = useSignTransaction();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { program } = useProgram();

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
    if (!isClient || !sessionKey || !connection) {
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
      },
      connection.rpcEndpoint
    );
  }, [isClient, sessionKey, privy, solanaWallets, signTransaction, connection]);

  if (!isClient || !sessionKey) {
    return null;
  }

  return (
    <MagicBlockEngineContext.Provider value={engine}>
      {children}
    </MagicBlockEngineContext.Provider>
  );
}