import * as React from "react";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { MagicBlockEngine } from "./MagicBlockEngine";

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
    <WalletProvider wallets={[]} autoConnect>
      <MagicBlockEngineProviderInner>{children}</MagicBlockEngineProviderInner>
    </WalletProvider>
  );
}

function MagicBlockEngineProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const walletContext = useWallet();

  const engine = React.useMemo(() => {
    let sessionKey;

    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      const sessionKeyString = localStorage.getItem(SESSION_LOCAL_STORAGE);
      if (sessionKeyString) {
        try {
          sessionKey = Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(sessionKeyString))
          );
        } catch (e) {
          console.warn('Failed to load session key from localStorage:', e);
          sessionKey = Keypair.generate();
          localStorage.setItem(
            SESSION_LOCAL_STORAGE,
            JSON.stringify(Array.from(sessionKey.secretKey))
          );
        }
      } else {
        sessionKey = Keypair.generate();
        localStorage.setItem(
          SESSION_LOCAL_STORAGE,
          JSON.stringify(Array.from(sessionKey.secretKey))
        );
      }
    } else {
      // In non-browser environment (SSR), use a temporary keypair
      sessionKey = Keypair.generate();
    }

    return new MagicBlockEngine(
      walletContext,
      sessionKey,
      {
        minLamports: SESSION_MIN_LAMPORTS,
        maxLamports: SESSION_MAX_LAMPORTS,
      }
    );
  }, [walletContext]);

  return (
    <MagicBlockEngineContext.Provider value={engine}>
      {children}
    </MagicBlockEngineContext.Provider>
  );
}