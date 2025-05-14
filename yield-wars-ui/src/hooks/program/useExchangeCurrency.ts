'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { useMagicBlockEngine } from '@/engine/MagicBlockEngineProvider';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { exchangeCurrency, ExchangeCurrencyParams } from '@/app/actions/exchangeCurrency';
import { CurrencyType } from '@/lib/constants/programEnums';
import { useSignAndSendTransaction } from '../useSignAndSendTransaction';

export const useExchangeCurrency = () => {
  const queryClient = useQueryClient();
  const engine = useMagicBlockEngine();
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
      } catch (error: any) {
        console.error("Exchange failed:", error);
        toast.error(`Exchange failed: ${error.message}`);
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