'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Connection, PublicKey, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { InitializeComponent } from '@magicblock-labs/bolt-sdk';
import { componentOwnership } from '@/lib/constants/programIds';

interface CreateOwnershipComponentParams {
  userPublicKey: string;
  entityPda: string;
}

export function useCreateOwnershipComponent() {
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
  
  const mutation = useMutation({
    mutationFn: async (params: CreateOwnershipComponentParams): Promise<VersionedTransaction> => {
      if (!params.entityPda || !params.userPublicKey) {
        throw new Error('Entity PDA and user public key are required');
      }

      const userPubkey = new PublicKey(params.userPublicKey);
      const entityPubkey = new PublicKey(params.entityPda);
      
      console.log(`Creating ownership component transaction for entity: ${params.entityPda}`);
      console.log(`Using user wallet as authority: ${params.userPublicKey}`);
      
      // Based on what we've learned, in the Bolt framework ALL components are owned by
      // the World program, not by individual user wallets.
      // Instead, we need to store the user's wallet in a data field of the ownership component.
      
      // Create the ownership component transaction
      const addOwnershipResult = await InitializeComponent({
        payer: userPubkey, // User is still the payer for the transaction
        entity: entityPubkey,
        componentId: new PublicKey(componentOwnership.address),
        // We need to store the user's wallet address in the ownership component data
        // However, the InitializeComponent API doesn't let us set custom data
        // This will be stored in a separate step or handled by the program
      });
      
      // Convert legacy Transaction to VersionedTransaction
      const latestBlockhash = await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: userPubkey, // User is the payer for the versioned transaction
        recentBlockhash: latestBlockhash.blockhash,
        instructions: addOwnershipResult.transaction.instructions,
      }).compileToV0Message();

      // Create a new VersionedTransaction - don't sign it here
      // It will be signed by the user's wallet later
      return new VersionedTransaction(messageV0);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ownership component: ${error.message}`);
    },
  });

  return {
    createOwnershipComponent: mutation.mutate,
    createOwnershipComponentAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
} 