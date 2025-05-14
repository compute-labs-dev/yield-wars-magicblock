'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { VersionedTransaction } from '@solana/web3.js';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { exchangeCurrency, ExchangeCurrencyParams } from '@/app/actions/exchangeCurrency';
import { useSignAndSendTransaction } from '../useSignAndSendTransaction';

export const useExchangeCurrency = () => {
  const queryClient = useQueryClient();
  const { wallets } = useSolanaWallets();
  const { signAndSend } = useSignAndSendTransaction();
  const wallet = wallets[0];

  const mutation = useMutation({
    mutationFn: async (params: ExchangeCurrencyParams) => {
      if (!wallet?.address) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log("Exchange params:", params);
        
        // Get the serialized transaction from the server
        const serializedTx = await exchangeCurrency(params);
        
        // Deserialize the transaction
        const transaction = VersionedTransaction.deserialize(
          Buffer.from(serializedTx, 'base64')
        );

        // Sign and send the transaction
        const signature = await signAndSend(transaction);
        
        // Show success toast with link to explorer
        toast.success('Exchange successful! View on Solana Explorer', {
          action: {
            label: 'View',
            onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank')
          }
        });

        return signature;
      } catch (error) {
        console.error("Exchange failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error(`Exchange failed: ${errorMessage}`);
        throw error;
      }
    },
    onSuccess: (signature, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['playerData'] });
      queryClient.invalidateQueries({ 
        queryKey: ['userWalletBalance', variables.userWalletPublicKey, variables.currency_type] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['userWalletBalance', variables.userWalletPublicKey, variables.destination_currency_type] 
      });
      
      console.log("Exchange transaction signature:", signature);
    },
  });

  return {
    exchangeCurrency: mutation.mutate,
    exchangeCurrencyAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset
  };
}; 