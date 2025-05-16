import { AnchorProvider, Program, Wallet as AnchorWallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createContext, useContext, useMemo, PropsWithChildren } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';

// Create context for the Anchor wallet
const AnchorWalletContext = createContext<{
  anchorWallet: AnchorWallet | null;
  anchorProvider: AnchorProvider | null;
}>({
  anchorWallet: null,
  anchorProvider: null,
});

export const useAnchorWallet = () => {
  return useContext(AnchorWalletContext);
};

export function AnchorWalletProvider({ children }: PropsWithChildren<object>) {
  const { connection } = useConnection();

  const [anchorWallet, anchorProvider] = useMemo(() => {
    // Create a read-only wallet with a generated keypair
    const readOnlyWallet: AnchorWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async (transaction) => transaction,
      signAllTransactions: async (transactions) => transactions,
    };

    // Create the Anchor provider with the read-only wallet
    const provider = new AnchorProvider(
      connection,
      readOnlyWallet,
      { commitment: 'confirmed' }
    );

    return [readOnlyWallet, provider];
  }, [connection]);

  return (
    <AnchorWalletContext.Provider value={{ anchorWallet, anchorProvider }}>
      {children}
    </AnchorWalletContext.Provider>
  );
} 