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

// Interface for the object returned by Privy's useSignTransaction hook
interface PrivySignTransaction {
  signTransaction: (options: {
    transaction: Transaction; // Or VersionedTransaction
    connection: Connection;
    uiOptions?: { title?: string; description?: string; buttonText?: string };
  }) => Promise<void>; 
}

export interface TransferCurrencyParams {
  worldPda: string;
  sourceEntityPda: string;
  destinationEntityPda: string;
  currencyType: CurrencyType; 
  amount: number; 
  userWalletPublicKey: PublicKey;
  privySigner: PrivySignTransaction; 
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
          userWalletPublicKey, 
          privySigner 
        } = params;

        const authorityPublicKey = userWalletPublicKey;

        const transferArgs = {
          transaction_type: EconomyTransactionType.Transfer,
          currency_type: currencyType,
          destination_currency_type: currencyType, 
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
            entity: new PublicKey(sourceEntityPda),
            components: [
              { componentId: YW_PRICE_COMPONENT_PROGRAM_ID }, 
              { componentId: YW_PRICE_COMPONENT_PROGRAM_ID }, 
            ],
          },
        ];

        console.log('Preparing currency transfer with params:', params);
        console.log('Args for ApplySystem:', transferArgs);
        console.log('Entities for ApplySystem:', entitiesForSystem);

        const systemTxDetails = await ApplySystem({
          authority: authorityPublicKey,
          systemId: ECONOMY_SYSTEM_PROGRAM_ID,
          world: new PublicKey(worldPda),
          entities: entitiesForSystem,
          args: transferArgs,
        });

        if (!systemTxDetails.transaction) {
          throw new Error('Failed to prepare transaction details from ApplySystem.');
        }

        const transaction = systemTxDetails.transaction as Transaction;

        transaction.feePayer = authorityPublicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

        console.log('Requesting user signature for transaction...');
        await privySigner.signTransaction({
          transaction: transaction, 
          connection: connection,
          uiOptions: {
            description: 'Please approve the currency transfer.'
          }
        });

        console.log('Sending signed transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize());

        await connection.confirmTransaction(signature, 'confirmed');
        console.log('Transaction confirmed with signature:', signature);

        return { signature };
      },
      onSuccess: (data, variables) => {
        toast.success(`Currency transfer successful! Signature: ${data.signature.substring(0, 10)}...`);
        queryClient.invalidateQueries({ queryKey: ['userWalletBalance', variables.userWalletPublicKey.toBase58(), variables.currencyType] });
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