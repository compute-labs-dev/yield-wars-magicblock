import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectWorldPda } from '@/stores/features/worldStore';
import { selectUserEntity } from '@/stores/features/userEntityStore';
import { getWalletBalance } from './getWalletBalance';
import type { RootState } from '@/stores/store';

interface WalletBalances {
    usdc: number;
    btc: number;
    eth: number;
    sol: number;
    aifi: number;
}

interface UseWalletBalanceResult {
    balances: WalletBalances;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useWalletBalance(walletAddress: string | undefined): UseWalletBalanceResult {
    const [balances, setBalances] = useState<WalletBalances>({
        usdc: 0,
        btc: 0,
        eth: 0,
        sol: 0,
        aifi: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const lastFetchTime = useRef<number>(0);
    const minimumFetchInterval = 5000; // 5 seconds between requests to avoid rate limiting

    const worldPda = useSelector(selectWorldPda);
    const userEntity = useSelector((state: RootState) => 
        walletAddress ? selectUserEntity(state, walletAddress) : null
    );

    const fetchBalances = useCallback(async () => {
        if (!walletAddress || !userEntity?.walletComponentPda || !worldPda) {
            return;
        }

        // Check if enough time has passed since the last fetch
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime.current;
        
        if (timeSinceLastFetch < minimumFetchInterval && lastFetchTime.current !== 0) {
            const waitTime = minimumFetchInterval - timeSinceLastFetch;
            console.log(`Throttling wallet balance request. Waiting ${waitTime}ms before fetching.`);
            
            // Wait for the remaining time before fetching
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        try {
            setIsLoading(true);
            setError(null);
            lastFetchTime.current = Date.now();

            const balanceData = await getWalletBalance({
                worldPda,
                userEntityPda: userEntity.walletComponentPda,
                userWalletPublicKey: walletAddress
            });

            console.log('💰 balanceData', balanceData);

            if (balanceData) {
                setBalances({
                    usdc: balanceData.usdc || 0,
                    btc: balanceData.btc || 0,
                    eth: balanceData.eth || 0,
                    sol: balanceData.sol || 0,
                    aifi: balanceData.aifi || 0
                });
            }
        } catch (err) {
            console.error('Error fetching wallet balances:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch wallet balances'));
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress, userEntity?.walletComponentPda, worldPda]);

    // Fetch balances on mount and when dependencies change
    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

    return {
        balances,
        isLoading,
        error,
        refetch: fetchBalances
    };
} 