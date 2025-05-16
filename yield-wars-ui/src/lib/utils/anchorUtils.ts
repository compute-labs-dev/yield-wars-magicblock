import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, setProvider } from "@coral-xyz/anchor";
import bs58 from 'bs58';

export function createKeypairFromBase58(base58PrivateKey: string): Keypair {
  const decodedKey = bs58.decode(base58PrivateKey);
  return Keypair.fromSecretKey(decodedKey);
}

export function createAnchorProvider(connection: Connection, keypair: Keypair): AnchorProvider {
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map(tx => {
        tx.sign(keypair);
        return tx;
      });
    },
  };

  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

export function setupAnchorProvider(connection: Connection, base58PrivateKey: string): { provider: AnchorProvider, keypair: Keypair } {
  const keypair = createKeypairFromBase58(base58PrivateKey);
  const provider = createAnchorProvider(connection, keypair);
  setProvider(provider);
  return { provider, keypair };
} 