'use server'
import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Signs and sends a VersionedTransaction using the server's keypair.
 * Throws on error. Returns the transaction hash on success.
 */
export async function signAndSendTransaction(txn: VersionedTransaction): Promise<string> {
    const endpoint = 'https://api.devnet.solana.com';
    const connection = new Connection(endpoint);

    const pk = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
    if (!pk) throw new Error('No private key provided in environment variables');
    const signer = Keypair.fromSecretKey(bs58.decode(pk));

    txn.sign([signer]);
    const txHash = await connection.sendTransaction(txn);
    return txHash;
} 