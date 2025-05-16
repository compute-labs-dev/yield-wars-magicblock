'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  ownershipComponentPda: string;
  priceComponentPdas: PriceComponentPdas;
  initSignatures: string[];
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function initializeWalletWithRetry(params: InitializeWalletParams): Promise<InitializeWalletResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('/api/wallet/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to initialize wallet');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error as Error;
      
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}

export function useInitializeUserWallet() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const mutation = useMutation({
    mutationFn: initializeWalletWithRetry,
    onSuccess: (data, variables) => {
      toast.success('Wallet initialized successfully!');
      console.log('Wallet initialized with data:', {
        entityPda: data.entityPda,
        walletPda: data.walletComponentPda,
        ownershipPda: data.ownershipComponentPda,
        priceComponents: data.priceComponentPdas
      });
      
      // Invalidate queries that should refetch after wallet initialization
      queryClient.invalidateQueries({ queryKey: ['userGameProfile', data.entityPda] });
      queryClient.invalidateQueries({ queryKey: ['userWalletData', data.walletComponentPda] });
      queryClient.invalidateQueries({ queryKey: ['userOwnership', data.ownershipComponentPda] });
      
      // Invalidate price component queries for each currency
      Object.entries(data.priceComponentPdas).forEach(([, pda]) => {
        queryClient.invalidateQueries({ queryKey: ['priceComponent', pda] });
      });

      // Update Redux store with the new entity
      if (data.entityPda) {
        dispatch(setUserEntity({
          walletAddress: variables.userPublicKey,
          entityPda: data.entityPda,
          walletComponentPda: data.walletComponentPda,
          ownershipComponentPda: data.ownershipComponentPda,
          priceComponentPdas: data.priceComponentPdas
        }));
      }
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