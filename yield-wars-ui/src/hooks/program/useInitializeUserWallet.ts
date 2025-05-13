'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { initializeUserWalletServer } from '@/app/actions/initializeUserWallet';
import { useCreateOwnershipComponent } from './useCreateOwnershipComponent';
import { useSignAndSendTransaction } from '@/hooks/useSignAndSendTransaction';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUserEntity } from '@/stores/features/userEntityStore';

interface InitializeWalletParams {
  userPublicKey: string;
  worldPda: string; // The PDA of the initialized game world
}

interface InitializeWalletResult {
  entityPda: string;
  walletComponentPda: string;
  usdcPriceComponentPda: string;
  ownershipTxSignature?: string;
}

export function useInitializeUserWallet() {
  // First declare all React hooks
  const [isClient, setIsClient] = useState(false);
  
  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Then declare all other hooks
  const queryClient = useQueryClient();
  const { createOwnershipComponentAsync } = useCreateOwnershipComponent();
  const { signAndSend } = useSignAndSendTransaction();
  
  // Always call hooks unconditionally - this is a requirement of React
  const dispatch = useDispatch();

  const mutation = useMutation({
    mutationFn: async (params: InitializeWalletParams): Promise<InitializeWalletResult> => {
      // Step 1: Initialize the user wallet on the server (admin-signed)
      const serverResult = await initializeUserWalletServer({ 
        userPublicKey: params.userPublicKey,
        worldPda: params.worldPda 
      });
      
      // Step 2: Create and sign the ownership component transaction (user-signed)
      try {
        const ownershipTxn = await createOwnershipComponentAsync({
          userPublicKey: params.userPublicKey,
          entityPda: serverResult.entityPda
        });
        
        // Sign and send the ownership transaction
        const ownershipTxSignature = await signAndSend(ownershipTxn);
        
        // Step 3: Store the entity-wallet mapping in the Redux store (only if on client)
        if (isClient) {
          dispatch(setUserEntity({
            walletAddress: params.userPublicKey,
            entityPda: serverResult.entityPda,
            walletComponentPda: serverResult.walletComponentPda,
            usdcPriceComponentPda: serverResult.usdcPriceComponentPda
          }));
        }
        
        return {
          ...serverResult,
          ownershipTxSignature
        };
      } catch (error) {
        console.error("Failed to create ownership component:", error);
        // We continue even if ownership component fails, as the wallet is initialized
        
        // Still store the entity mapping even if ownership component fails
        if (isClient) {
          dispatch(setUserEntity({
            walletAddress: params.userPublicKey,
            entityPda: serverResult.entityPda,
            walletComponentPda: serverResult.walletComponentPda,
            usdcPriceComponentPda: serverResult.usdcPriceComponentPda
          }));
        }
        
        return serverResult;
      }
    },
    onSuccess: (data) => {
      toast.success('Wallet initialized successfully!');
      console.log('Wallet initialized, data:', data);
      
      // Invalidate queries that should refetch after wallet initialization
      queryClient.invalidateQueries({ queryKey: ['userGameProfile', data?.entityPda] });
      queryClient.invalidateQueries({ queryKey: ['userWalletData', data?.walletComponentPda] });
      
      if (data.ownershipTxSignature) {
        toast.success('Ownership component created successfully!');
      }
    },
    onError: (error: Error) => {
      toast.error(`Wallet initialization failed: ${error.message}`);
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