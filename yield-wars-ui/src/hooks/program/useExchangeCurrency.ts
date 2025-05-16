'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { VersionedTransaction, Connection } from '@solana/web3.js';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { exchangeCurrency, ExchangeCurrencyParams } from '@/app/actions/exchangeCurrency';
import { useSignAndSendTransaction } from '../useSignAndSendTransaction';

export const useExchangeCurrency = () => {
  const queryClient = useQueryClient();
  const { wallets } = useSolanaWallets();
  const { signAndSend } = useSignAndSendTransaction();
  const wallet = wallets[0];

  const mutation = useMutation({
    mutationFn: async (params: ExchangeCurrencyParams): Promise<string> => {
      if (!wallet?.address) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log("Exchange params:", params);
        
        // Get the transaction signature from the server
        const signature = await exchangeCurrency(params);
        
        // Show success toast with link to explorer
        toast.success('Exchange completed successfully!', {
          description: `Transaction sent with signature: ${signature.slice(0, 8)}...`,
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
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
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