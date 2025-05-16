import { useState, useEffect } from 'react';
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

    const worldPda = useSelector(selectWorldPda);
    const userEntity = useSelector((state: RootState) => 
        walletAddress ? selectUserEntity(state, walletAddress) : null
    );

    const fetchBalances = async () => {
        if (!walletAddress || !userEntity?.entityPda || !worldPda) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const balanceData = await getWalletBalance({
                worldPda,
                userEntityPda: userEntity.entityPda,
                userWalletPublicKey: walletAddress
            });

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
    };

    // Fetch balances on mount and when dependencies change
    useEffect(() => {
        fetchBalances();
    }, [walletAddress, userEntity?.entityPda, worldPda, fetchBalances]);

    return {
        balances,
        isLoading,
        error,
        refetch: fetchBalances
    };
} 