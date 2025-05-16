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
  ownershipComponentPda: string;
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
      
      console.log("Server returned price component PDAs:", serverResult.priceComponentPdas);
      
      // Transform the price component PDAs to match the expected format
      const transformedPdas = {} as PriceComponentPdas;
      
      // Define the required currency types
      const requiredCurrencyTypes = [
        CurrencyType.USDC,
        CurrencyType.BTC,
        CurrencyType.ETH,
        CurrencyType.SOL,
        CurrencyType.AIFI
      ] as const;
      
      // Map each currency type to its PDA
      for (const type of requiredCurrencyTypes) {
        //@ts-expect-error - this is a workaround to fix the type error
        const pda = serverResult.priceComponentPdas[type as keyof PriceComponentPdas]; 
        if (!pda) {
          console.error(`Missing PDA for currency type ${CurrencyType[type]} (${type})`);
          continue;
        }
        
        // Verify the PDA format
        if (typeof pda !== 'string' || !pda.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
          console.error(`Invalid PDA format for currency ${CurrencyType[type]}: ${pda}`);
          continue;
        }
        
        // Safe assignment since we've verified the type
        transformedPdas[type] = pda;
      }
      
      // Check for missing PDAs
      const missingTypes = requiredCurrencyTypes.filter(type => !(type in transformedPdas));
      if (missingTypes.length > 0) {
        const error = `Missing price component PDAs for currencies: ${missingTypes.map(type => CurrencyType[type]).join(', ')}`;
        console.error(error);
        throw new Error(error);
      }
      
      // Log the transformed PDAs for debugging
      console.log('Transformed price component PDAs:', {
        original: serverResult.priceComponentPdas,
        transformed: transformedPdas,
        mapping: Object.entries(transformedPdas).reduce((acc, [key, value]) => ({
          ...acc,
          [CurrencyType[Number(key)]]: value
        }), {} as Record<string, string>)
      });
      
      if (isClient) {
        dispatch(setUserEntity({
          walletAddress: params.userPublicKey,
          entityPda: serverResult.entityPda,
          walletComponentPda: serverResult.walletComponentPda,
          ownershipComponentPda: serverResult.ownershipComponentPda,
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