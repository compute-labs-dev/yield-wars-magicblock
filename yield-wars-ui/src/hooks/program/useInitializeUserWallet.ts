'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initializeUserWalletServer } from '@/app/actions/initializeUserWallet';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUserEntity } from '@/stores/features/userEntityStore';
import type { PriceComponentPdas } from '@/stores/features/userEntityStore';
import { CurrencyType } from '@/lib/constants/programEnums';

interface InitializeWalletParams {
  userPublicKey: string;
  worldPda: string;
}

interface InitializeWalletResult {
  entityPda: string;
  walletComponentPda: string;
  priceComponentPdas: PriceComponentPdas;
  initSignatures: string[];
}

export function useInitializeUserWallet() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const mutation = useMutation({
    mutationFn: async (params: InitializeWalletParams): Promise<InitializeWalletResult> => {
      const serverResult = await initializeUserWalletServer(params);
      
      // Transform the price component PDAs to match the expected format
      const transformedPdas = Object.entries(serverResult.priceComponentPdas).reduce((acc, [key, value]) => ({
        ...acc,
        [CurrencyType[key as keyof typeof CurrencyType]]: value
      }), {} as PriceComponentPdas);
      
      if (isClient) {
        dispatch(setUserEntity({
          walletAddress: params.userPublicKey,
          entityPda: serverResult.entityPda,
          walletComponentPda: serverResult.walletComponentPda,
          priceComponentPdas: transformedPdas
        }));
      }
      
      return {
        ...serverResult,
        priceComponentPdas: transformedPdas
      };
    },
    onSuccess: (data) => {
      toast.success('Wallet initialized successfully!');
      console.log('Wallet initialized with data:', {
        entityPda: data.entityPda,
        walletPda: data.walletComponentPda,
        priceComponents: data.priceComponentPdas
      });
      
      // Invalidate queries that should refetch after wallet initialization
      queryClient.invalidateQueries({ queryKey: ['userGameProfile', data.entityPda] });
      queryClient.invalidateQueries({ queryKey: ['userWalletData', data.walletComponentPda] });
      
      // Invalidate price component queries for each currency
      Object.entries(data.priceComponentPdas).forEach(([currency, pda]) => {
        queryClient.invalidateQueries({ queryKey: ['priceComponent', pda] });
      });
    },
    onError: (error: Error) => {
      toast.error(`Wallet initialization failed: ${error.message}`);
      console.error('Wallet initialization error:', error);
    },
  });

  return {
    initializeWallet: mutation.mutate,
    initializeWalletAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
} 