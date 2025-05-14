'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { transferCurrency } from '@/app/actions/transferCurrency';
import { CurrencyType } from '@/lib/constants/programEnums';
import { useSignAndSendTransaction } from '../useSignAndSendTransaction';

export interface TransferCurrencyParams {
  worldPda: string;
  sourceEntityPda: string;
  destinationEntityPda: string;
  currencyType: CurrencyType;
  amount: number;
  userWalletPublicKey: PublicKey;
  privySigner: PublicKey;
}

export const useTransferCurrency = () => {
  const queryClient = useQueryClient();
  const { wallets } = useSolanaWallets();
  const { signAndSend } = useSignAndSendTransaction();
  const wallet = wallets[0];

  const mutation = useMutation({
    mutationFn: async (params: TransferCurrencyParams) => {
      if (!wallet?.address) {
        throw new Error('Wallet not connected');
      }

      try {
        // Call server action to create transaction
        const { transaction: serializedTx } = await transferCurrency({
          ...params,
          userWalletPublicKey: params.userWalletPublicKey.toBase58(),
          privySigner: params.privySigner.toBase58()
        });

        // Deserialize the transaction
        const transaction = VersionedTransaction.deserialize(
          Buffer.from(serializedTx, 'base64')
        );

        // Sign and send the transaction
        const signature = await signAndSend(transaction);

        // Show success toast with link
        toast.success('Transfer successful! View on Solana Explorer', {
          action: {
            label: 'View',
            onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank')
          }
        });

        return signature;

      } catch (error) {
        console.error('Transfer failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast.error('Transfer failed: ' + errorMessage);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerData'] });
    },
  });

  return {
    transferCurrency: mutation.mutate,
    transferCurrencyAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset
  };
}; 