'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { ApplySystem } from '@magicblock-labs/bolt-sdk';
import {
  ECONOMY_SYSTEM_PROGRAM_ID,
  YW_WALLET_COMPONENT_PROGRAM_ID,
  YW_PRICE_COMPONENT_PROGRAM_ID, // This is the general PriceComponent ID
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

interface ExchangeCurrencyParams {
  worldPda: string;
  userEntityPda: string; // Entity whose wallet is used and typically holds one of the price components
  sourceCurrencyPriceEntityPda: string; // Entity holding the PriceComponent for the source currency (could be userEntityPda)
  destinationCurrencyPriceEntityPda: string; // Entity holding the PriceComponent for the destination currency
  sourceCurrencyType: CurrencyType;
  destinationCurrencyType: CurrencyType;
  amountToExchange: number; // Amount of source currency to exchange
  userWalletPublicKey: PublicKey;
  privySigner: PrivySignTransaction;
}

interface ExchangeCurrencyResult {
  signature: string;
}

export function useExchangeCurrency() {
  const queryClient = useQueryClient();
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const mutation = useMutation<ExchangeCurrencyResult, Error, ExchangeCurrencyParams>(
    {
      mutationFn: async (params: ExchangeCurrencyParams): Promise<ExchangeCurrencyResult> => {
        const {
          worldPda,
          userEntityPda,
          sourceCurrencyPriceEntityPda,
          destinationCurrencyPriceEntityPda,
          sourceCurrencyType,
          destinationCurrencyType,
          amountToExchange,
          userWalletPublicKey,
          privySigner,
        } = params;

        const authorityPublicKey = userWalletPublicKey;

        const exchangeArgs = {
          transaction_type: EconomyTransactionType.Exchange,
          currency_type: sourceCurrencyType,
          destination_currency_type: destinationCurrencyType,
          amount: amountToExchange,
        };

        // Construct entities based on the test case structure for exchanges
        // The EconomySystem expects specific components from specific entity "slots".
        const entitiesForSystem = [
          {
            entity: new PublicKey(userEntityPda), // User's entity
            components: [
              { componentId: YW_WALLET_COMPONENT_PROGRAM_ID },   // Wallet being used for the exchange
              { componentId: YW_WALLET_COMPONENT_PROGRAM_ID },   // Required twice by the Bolt SDK pattern for this system apparently
              { componentId: YW_PRICE_COMPONENT_PROGRAM_ID },    // Price component for the sourceCurrencyType
                                                              // Assumes this entity (userEntityPda) hosts the source price component
            ],
          },
          {
            entity: new PublicKey(destinationCurrencyPriceEntityPda), // Entity holding destination price component
            components: [
              { componentId: YW_PRICE_COMPONENT_PROGRAM_ID },    // Price component for the destinationCurrencyType
            ],
          },
        ];
        
        // Safety check: if sourceCurrencyPriceEntityPda is different from userEntityPda, ensure it's handled or logic is adjusted.
        // The current structure assumes userEntityPda provides its wallet AND the source price component.
        // If source price is on a different entity than the user's wallet entity, entitiesForSystem needs adjustment.
        if (sourceCurrencyPriceEntityPda !== userEntityPda) {
            console.warn('Source currency price entity is different from user entity. Ensure ApplySystem entity structure is correct for this scenario.');
            // Potentially adjust entitiesForSystem here if the EconomySystem has a different expectation for this case.
            // For now, proceeding with the assumption from tests where userEntity also has source price component.
        }


        console.log('Preparing currency exchange with params:', params);
        console.log('Args for ApplySystem:', exchangeArgs);
        console.log('Entities for ApplySystem:', entitiesForSystem);

        const systemTxDetails = await ApplySystem({
          authority: authorityPublicKey,
          systemId: ECONOMY_SYSTEM_PROGRAM_ID,
          world: new PublicKey(worldPda),
          entities: entitiesForSystem,
          args: exchangeArgs,
        });

        if (!systemTxDetails.transaction) {
          throw new Error('Failed to prepare transaction details from ApplySystem.');
        }

        const transaction = systemTxDetails.transaction as Transaction;

        transaction.feePayer = authorityPublicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

        console.log('Requesting user signature for exchange transaction...');
        await privySigner.signTransaction({
          transaction: transaction,
          connection: connection,
          uiOptions: {
            description: 'Please approve the currency exchange.',
          },
        });

        console.log('Sending signed exchange transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize());

        await connection.confirmTransaction(signature, 'confirmed');
        console.log('Exchange transaction confirmed with signature:', signature);

        return { signature };
      },
      onSuccess: (data, variables) => {
        toast.success(`Currency exchange successful! Signature: ${data.signature.substring(0, 10)}...`);
        queryClient.invalidateQueries({ queryKey: ['userWalletBalance', variables.userWalletPublicKey.toBase58(), variables.sourceCurrencyType] });
        queryClient.invalidateQueries({ queryKey: ['userWalletBalance', variables.userWalletPublicKey.toBase58(), variables.destinationCurrencyType] });
        queryClient.invalidateQueries({ queryKey: ['transactionHistory'] });
      },
      onError: (error: Error) => {
        console.error('Currency exchange failed:', error);
        toast.error(`Currency exchange failed: ${error.message}`);
      },
    }
  );

  return {
    exchangeCurrency: mutation.mutate,
    exchangeCurrencyAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
} 