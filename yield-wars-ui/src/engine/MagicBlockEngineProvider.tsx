import * as React from "react";
import { MagicBlockEngine } from "./MagicBlockEngine";
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { useProgram } from "@/components/providers/ProgramProvider";
import { AnchorProvider } from "@coral-xyz/anchor";

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

    // If we have a program context, we don't need to manage our own session key
    if (program?.provider) {
      const dummyKey = Keypair.generate();
      setSessionKey(dummyKey);
      return;
    }

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
      key = Keypair.generate();
      setSessionKey(key);
    }
  }, [isClient, program]);

  const engine = React.useMemo(() => {
    if (!isClient || !sessionKey || !connection) {
      return {} as MagicBlockEngine;
    }

    // If we have a program context, use its provider
    if (program?.provider) {
      const provider = program.provider as AnchorProvider;
      // Set the provider globally for Anchor
      if (typeof window !== 'undefined') {
        (window as any).ANCHOR_PROVIDER = provider;
      }
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
  }, [isClient, sessionKey, privy, solanaWallets, signTransaction, connection, program]);

  if (!isClient || !sessionKey) {
    return null;
  }

  return (
    <MagicBlockEngineContext.Provider value={engine}>
      {children}
    </MagicBlockEngineContext.Provider>
  );
}