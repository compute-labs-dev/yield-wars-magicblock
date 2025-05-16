import { AnchorProvider, Wallet as AnchorWallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
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

class CustomNodeWallet implements AnchorWallet {
  constructor(readonly payer: Keypair) {
    this.payer = payer;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs;
  }

  get publicKey(): PublicKey {
    return this.payer.publicKey;
  }
}

export function AnchorWalletProvider({ children }: PropsWithChildren<object>) {
  const { connection } = useConnection();

  const [anchorWallet, anchorProvider] = useMemo(() => {
    // Create a keypair for the node wallet
    const keypair = Keypair.generate();
    
    // Create a custom node wallet that implements the full interface
    const nodeWallet = new CustomNodeWallet(keypair);

    // Create the Anchor provider with the node wallet
    const provider = new AnchorProvider(
      connection,
      nodeWallet,
      { commitment: 'confirmed', preflightCommitment: 'confirmed' }
    );

    // Set the default provider for any code that uses anchor.getProvider()
    if (typeof window !== 'undefined') {
      (window as any).ANCHOR_PROVIDER = provider;
    }

    return [nodeWallet, provider];
  }, [connection]);

  return (
    <AnchorWalletContext.Provider value={{ anchorWallet, anchorProvider }}>
      {children}
    </AnchorWalletContext.Provider>
  );
} 