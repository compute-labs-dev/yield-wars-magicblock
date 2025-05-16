import { useState } from "react";
import { useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection, VersionedTransaction } from '@solana/web3.js';

/**
 * Client-side hook for signing and sending a VersionedTransaction using the user's wallet.
 * Only supports client-side signing. For server-side, use the server utility.
 */
export function useSignAndSendTransaction() {
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState("");
  const { signTransaction } = useSignTransaction();
  const connection = new Connection('https://api.devnet.solana.com');

  /**
   * Signs and sends a VersionedTransaction using the user's wallet.
   * @param txn The VersionedTransaction to sign and send
   * @returns The transaction hash as a string
   */
  const signAndSend = async (txn: VersionedTransaction): Promise<string> => {
    setProcessing(true);
    try {
      // User must sign
      await signTransaction({
        transaction: txn,
        connection,
        uiOptions: {
          description: "Please sign the transaction to continue",
        }
      });
      const txHash = await connection.sendTransaction(txn);
      setReceipt(txHash);
      return txHash;
    } catch (e) {
      setReceipt("");
      throw e;
    } finally {
      setProcessing(false);
    }
  };

  return { signAndSend, processing, receipt };
} 