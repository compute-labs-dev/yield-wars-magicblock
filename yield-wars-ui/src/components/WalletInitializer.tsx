'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSelector } from 'react-redux';
import { selectWorldPda, selectIsWorldInitialized } from '@/stores/features/worldStore';
import { selectUserEntity } from '@/stores/features/userEntityStore';
import { useInitializeUserWallet } from '@/hooks/program/useInitializeUserWallet';
import { toast } from 'sonner';

export default function WalletInitializer({ children }: { children: React.ReactNode }) {
  const { user, authenticated, ready } = usePrivy();
  const worldPda = useSelector(selectWorldPda);
  const isWorldInitialized = useSelector(selectIsWorldInitialized);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [initializationHandled, setInitializationHandled] = useState(false);
  const [lastCheckedWallet, setLastCheckedWallet] = useState<string | null>(null);
  
  // Get the user entity from Redux store
  const userEntity = useSelector((state: any) => 
    user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
  );
  
  // Get the wallet initialization hook
  const { 
    initializeWalletAsync, 
    isLoading: isInitializing, 
    isSuccess: isInitializeSuccess,
    error: initializeError
  } = useInitializeUserWallet();

  // Function to check and initialize wallet
  const checkAndInitializeWallet = useCallback(async () => {
    // Skip if not authenticated, world not ready, or already checking
    if (
      !authenticated || 
      !user?.wallet?.address || 
      !isWorldInitialized || 
      !worldPda || 
      isCheckingWallet ||
      isInitializing
    ) {
      return;
    }

    // Skip if this wallet has already been checked and handled
    if (lastCheckedWallet === user.wallet.address && initializationHandled) {
      return;
    }

    try {
      setIsCheckingWallet(true);
      setLastCheckedWallet(user.wallet.address);
      
      // If user entity doesn't exist, we need to initialize
      if (!userEntity?.entityPda) {
        console.log('Wallet needs initialization, starting process...', {
          walletAddress: user.wallet.address,
          worldPda,
          userEntity
        });
        
        toast.info('Initializing your wallet...', {
          duration: 3000,
        });
        
        // Trigger wallet initialization
        await initializeWalletAsync({
          userPublicKey: user.wallet.address,
          worldPda: worldPda
        });
        
        toast.success('Wallet initialized successfully! Now you can use game features like purchasing GPUs.', {
          duration: 5000,
        });
      } else {
        console.log('Wallet already initialized:', userEntity.entityPda);
      }
      
      // Mark as handled to prevent multiple initialization attempts
      setInitializationHandled(true);
    } catch (error) {
      console.error('Error during wallet initialization check:', error);
      toast.error(`Wallet initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCheckingWallet(false);
    }
  }, [
    authenticated, 
    user?.wallet?.address, 
    worldPda, 
    isWorldInitialized, 
    userEntity?.entityPda,
    initializeWalletAsync,
    isInitializing,
    isCheckingWallet,
    lastCheckedWallet,
    initializationHandled
  ]);

  // Check immediately when auth state changes
  useEffect(() => {
    if (ready && authenticated && user?.wallet?.address) {
      // Small timeout to ensure Redux state is updated
      const timer = setTimeout(() => {
        checkAndInitializeWallet();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [ready, authenticated, user?.wallet?.address, checkAndInitializeWallet]);
  
  // Also check when world state or entity data changes
  useEffect(() => {
    if (ready && authenticated && user?.wallet?.address && isWorldInitialized && worldPda) {
      checkAndInitializeWallet();
    }
  }, [
    ready,
    isWorldInitialized, 
    worldPda, 
    userEntity?.entityPda,
    checkAndInitializeWallet
  ]);
  
  // Reset handled state when wallet changes
  useEffect(() => {
    if (user?.wallet?.address && lastCheckedWallet !== user.wallet.address) {
      setInitializationHandled(false);
      setLastCheckedWallet(null);
    }
  }, [user?.wallet?.address, lastCheckedWallet]);

  // Show initialization in progress overlay
  const showInitOverlay = isInitializing || isCheckingWallet;

  return (
    <>
      {children}
      
      {/* Loading Overlay */}
      {showInitOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col items-center justify-center">
          <div className="bg-gray-900 border border-green-500 p-6 rounded-lg shadow-lg max-w-md text-center">
            <div className="w-16 h-16 mb-4 mx-auto border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-xl font-medium text-green-500 mb-2">Initializing Wallet</h3>
            <p className="text-gray-300 mb-4">
              Setting up your in-game wallet and initializing your player entity...
            </p>
            <p className="text-gray-400 text-sm">
              This process may take up to 30 seconds to complete.
            </p>
          </div>
        </div>
      )}
    </>
  );
} 