'use server';

import { getWalletBalance } from '@/hooks/program/getWalletBalance';

interface FetchWalletBalanceParams {
    worldPda: string;
    userEntityPda: string;
    userWalletPublicKey: string;
}

interface WalletBalanceResult {
    usdc: number;
    btc: number;
    eth: number;
    sol: number;
    aifi: number;
}

export async function fetchWalletBalance({
    worldPda,
    userEntityPda,
    userWalletPublicKey
}: FetchWalletBalanceParams): Promise<WalletBalanceResult> {
    try {
        // Call the program function to get wallet balances
        const balances = await getWalletBalance({
            worldPda,
            userEntityPda,
            userWalletPublicKey
        });

        return {
            usdc: balances.usdc || 0,
            btc: balances.btc || 0,
            eth: balances.eth || 0,
            sol: balances.sol || 0,
            aifi: balances.aifi || 0
        };
    } catch (error) {
        console.error('Error in fetchWalletBalance:', error);
        throw error;
    }
} 