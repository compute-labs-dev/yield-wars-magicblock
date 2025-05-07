'use server'
import { clusterApiUrl, Connection, Keypair, TransactionMessage, VersionedTransaction, SystemProgram, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Sends 0.1 SOL from the server's signer to the specified account.
 * Throws on error. Returns the transaction hash on success.
 */
export async function sendFreeGas(account: string): Promise<string> {
    // Can also use a custom RPC here
    const endpoint = clusterApiUrl('devnet');
    const connection = new Connection(endpoint);

    const { blockhash } = await connection.getLatestBlockhash();
    const pk = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;

    if (!pk) {
        throw new Error('No private key provided in environment variables');
    }
    console.log('account', account)
    const _signer = Keypair.fromSecretKey(bs58.decode(pk));
    const ix = [
        SystemProgram.transfer({
            fromPubkey: _signer.publicKey,
            toPubkey: new PublicKey(account),
            lamports: 100000000, // 0.1 SOL
        })
    ];
    const txn = new TransactionMessage({
        payerKey: _signer.publicKey,
        recentBlockhash: blockhash,
        instructions: ix,
    }).compileToV0Message();

    const versionedTxn = new VersionedTransaction(txn);
    versionedTxn.sign([_signer]);

    const txHash = await connection.sendTransaction(versionedTxn);
    return txHash;
} 