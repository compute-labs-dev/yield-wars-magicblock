'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { ApplySystem } from '@magicblock-labs/bolt-sdk';
import {
  ECONOMY_SYSTEM_PROGRAM_ID,
  YW_WALLET_COMPONENT_PROGRAM_ID,
  YW_PRICE_COMPONENT_PROGRAM_ID,
} from '@/lib/constants/programIds';
import { EconomyTransactionType, CurrencyType } from '@/lib/constants/programEnums';

// --- Constants ---
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
// const TRANSACTION_TYPE_TRANSFER = 0; // Now using enum

// Interface for the object returned by Privy's useSignTransaction hook
interface PrivySignTransaction {
  signTransaction: (options: {
    transaction: Transaction; // Or VersionedTransaction
    connection: Connection;
    uiOptions?: { title?: string; description?: string; buttonText?: string };
  }) => Promise<void>; // Returns Promise<void> as it signs in-place
  // Include other properties from useSignTransaction if needed by the hook, e.g., `signingInProcess`
}

interface TransferCurrencyParams {
  worldPda: string;
  sourceEntityPda: string;
  destinationEntityPda: string;
  currencyType: CurrencyType; // Use enum
  amount: number; // In the currency's smallest unit
  userWalletPublicKey: PublicKey; // Pass PublicKey directly
  privySigner: PrivySignTransaction; // Pass the signer object from Privy's hook
}

interface TransferCurrencyResult {
  signature: string;
}

export function useTransferCurrency() {
  const queryClient = useQueryClient();
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const mutation = useMutation<TransferCurrencyResult, Error, TransferCurrencyParams>(
    {
      mutationFn: async (params: TransferCurrencyParams): Promise<TransferCurrencyResult> => {
        const { 
          worldPda, 
          sourceEntityPda, 
          destinationEntityPda, 
          currencyType, 
          amount, 
          userWalletPublicKey, // Changed from userSignerWallet
          privySigner // Changed from userSignerWallet
        } = params;

        // if (!userSignerWallet.publicKey) { // publicKey is now passed directly
        //   throw new Error('Wallet not connected or public key not available.');
        // }

        const authorityPublicKey = userWalletPublicKey; // Use the passed public key

        const transferArgs = {
          transaction_type: EconomyTransactionType.Transfer, // Use enum
          currency_type: currencyType,
          destination_currency_type: currencyType, // For direct transfer, source and dest currency are the same
          amount: amount,
        };

        const entitiesForSystem = [
          {
            entity: new PublicKey(sourceEntityPda),
            components: [{ componentId: YW_WALLET_COMPONENT_PROGRAM_ID }],
          },
          {
            entity: new PublicKey(destinationEntityPda),
            components: [{ componentId: YW_WALLET_COMPONENT_PROGRAM_ID }],
          },
          {
            // Based on test structure, source entity provides price components
            entity: new PublicKey(sourceEntityPda),
            components: [
              { componentId: YW_PRICE_COMPONENT_PROGRAM_ID }, // Source price
              { componentId: YW_PRICE_COMPONENT_PROGRAM_ID }, // Destination price (system might use currency_type to differentiate)
            ],
          },
        ];

        console.log('Preparing currency transfer with params:', params);
        console.log('Args for ApplySystem:', transferArgs);
        console.log('Entities for ApplySystem:', entitiesForSystem);

        // 1. ApplySystem to get the transaction instruction(s)
        // ApplySystem is expected to return an object with a `transaction` property
        const systemTxDetails = await ApplySystem({
          authority: authorityPublicKey,
          systemId: ECONOMY_SYSTEM_PROGRAM_ID,
          world: new PublicKey(worldPda),
          entities: entitiesForSystem,
          args: transferArgs,
          // connection: connection, // Pass if SDK requires it for client-side transaction building
        });

        if (!systemTxDetails.transaction) {
          throw new Error('Failed to prepare transaction details from ApplySystem.');
        }

        const transaction = systemTxDetails.transaction as Transaction; // Cast if necessary

        // 2. Prepare the transaction for signing
        transaction.feePayer = authorityPublicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

        // 3. Sign the transaction with the user's Privy wallet
        console.log('Requesting user signature for transaction...');
        // const signedTransaction = await userSignerWallet.signTransaction(transaction);
        await privySigner.signTransaction({
          transaction: transaction, // This is the Transaction object
          connection: connection,
          uiOptions: {
            description: 'Please approve the currency transfer.'
          }
        });
        // After this, `transaction` is now signed in-place.

        // 4. Send the signed transaction
        console.log('Sending signed transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize()); // Use the mutated transaction object

        // 5. Confirm the transaction
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('Transaction confirmed with signature:', signature);

        return { signature };
      },
      onSuccess: (data, variables) => {
        toast.success(`Currency transfer successful! Signature: ${data.signature.substring(0, 10)}...`);
        // Invalidate queries that should refetch after transfer
        // e.g., user's balance, recipient's balance, transaction history
        // if (variables.userSignerWallet.publicKey) { // Now variables.userWalletPublicKey
        queryClient.invalidateQueries({ queryKey: ['userWalletBalance', variables.userWalletPublicKey.toBase58(), variables.currencyType] });
        // }
        // Potentially invalidate recipient's balance if known how to query it
        queryClient.invalidateQueries({ queryKey: ['entityWalletBalance', variables.destinationEntityPda, variables.currencyType] });
        queryClient.invalidateQueries({ queryKey: ['transactionHistory'] }); 
      },
      onError: (error: Error) => {
        console.error('Currency transfer failed:', error);
        toast.error(`Currency transfer failed: ${error.message}`);
      },
    }
  );

  return {
    transferCurrency: mutation.mutate,
    transferCurrencyAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
} 