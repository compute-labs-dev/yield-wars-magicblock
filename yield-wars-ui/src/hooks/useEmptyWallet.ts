import { clusterApiUrl, Connection, TransactionMessage, VersionedTransaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { useSignAndSendTransaction } from './useSignAndSendTransaction';
/**
 * Sends 0.1 SOL from the server's signer to the specified account.
 * Throws on error. Returns the transaction hash on success.
 */
export function useEmptyWallet() {
    const { signAndSend } = useSignAndSendTransaction();
    const emptyWallet = async (account: string): Promise<string> => {
        // Can also use a custom RPC here
        const endpoint = clusterApiUrl('devnet');
        const connection = new Connection(endpoint);
        const { blockhash } = await connection.getLatestBlockhash();

        console.log('account', account)
        const _signer = new PublicKey('CLgpuqkEsbpm6rUg2wtcnpyN9eUHg94J9LFEmQftWL9n')

        const accountBalance = await connection.getBalance(new PublicKey(account));
        console.log('accountBalance', accountBalance)
        console.log('signer', _signer.toBase58())
        const ix = [
            SystemProgram.transfer({
                fromPubkey: new PublicKey(account),
                toPubkey: _signer,
                lamports: (accountBalance - 5000000), // minus .005 sol for gas
            })
        ];
        const txn = new TransactionMessage({
            payerKey: new PublicKey(account),
            recentBlockhash: blockhash,
            instructions: ix,
        }).compileToV0Message();

        const versionedTxn = new VersionedTransaction(txn);
        const txHash = await signAndSend(versionedTxn);
        return txHash;
    };
    return { emptyWallet };
} 