'use client';

import { useState, useEffect } from 'react';
import { BorderBeam } from '../ui/BorderBeam';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletBalance } from '@/hooks/program/useWalletBalance';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';

interface ResourcesCardProps {
    appearDelay?: number;
    className?: string;
}

export const ResourcesCard = ({ appearDelay = 0, className }: ResourcesCardProps) => {
    const [isVisible, setIsVisible] = useState(true);
    const { user } = usePrivy();
    const walletAddress = user?.wallet?.address;
    const { balances, isLoading, error, refetch } = useWalletBalance(walletAddress);
    const router = useRouter();
    
    // Add delay effect like SquadsReferralsCard
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, appearDelay);

        return () => clearTimeout(timer);
    }, [appearDelay]);
    
    // Format values - note that values from useWalletBalance are already converted
    const formatValue = (value: number) => {
        if (isNaN(value) || value === undefined || value === 0) return '0.00000';
        // Values are already converted in the hook, just format to 5 decimal places
        return value.toFixed(5);
    };

    // Retry on error but with a delay to avoid hammering the API
    useEffect(() => {
        if (error) {
            const retryTimer = setTimeout(() => {
                console.log('Retrying wallet balance fetch after error...');
                refetch();
            }, 10000); // Wait 10 seconds before retrying
            
            return () => clearTimeout(retryTimer);
        }
    }, [error, refetch]);

    return (
        <div className={`bg-black transition-opacity duration-1000 
            ${isVisible ? 'opacity-100' : 'opacity-0'}
            w-full
            ${className}`}>
            <div className="text-center border-b border-green-500 py-3 lg:py-4">
                <h2 className="text-green-500 text-lg lg:text-xl font-bold">RESOURCES</h2>
            </div>
            
            <div className="p-3 lg:p-4 space-y-4 lg:space-y-6">
                <div className="space-y-3 lg:space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">USDC</span>
                        {isLoading ? (
                            <Skeleton className="h-6 w-20 bg-green-900/20" />
                        ) : (
                            <span className="text-green-500 font-bold text-lg lg:text-xl">{formatValue(balances.usdc)}</span>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">BTC</span>
                        {isLoading ? (
                            <Skeleton className="h-6 w-20 bg-green-900/20" />
                        ) : (
                            <span className="text-green-500 font-bold text-lg lg:text-xl">{formatValue(balances.btc)}</span>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">ETH</span>
                        {isLoading ? (
                            <Skeleton className="h-6 w-20 bg-green-900/20" />
                        ) : (
                            <span className="text-green-500 font-bold text-lg lg:text-xl">{formatValue(balances.eth)}</span>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">SOL ◎</span>
                        {isLoading ? (
                            <Skeleton className="h-6 w-20 bg-green-900/20" />
                        ) : (
                            <span className="text-green-500 font-bold text-lg lg:text-xl">{formatValue(balances.sol)}</span>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">AIFI</span>
                        {isLoading ? (
                            <Skeleton className="h-6 w-20 bg-green-900/20" />
                        ) : (
                            <span className="text-green-500 font-bold text-lg lg:text-xl">{formatValue(balances.aifi)}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full grid grid-cols-3 lg:grid-cols-1">
                <button 
                    onClick={() => router.push('/marketplace')}
                    className="text-center py-2 text-green-500 font-bold text-lg lg:text-xl uppercase border-t border-green-500 bg-gradient-to-r from-black via-gray-950 to-black hover:bg-gradient-to-r hover:from-green-950 hover:to-black transition-colors">
                    Exchange
                </button>
                <button 
                    onClick={() => router.push('/supply-shack?tab=store')}
                    className="text-center py-2 text-green-500 font-bold text-lg lg:text-xl uppercase border-t border-l border-r lg:border-l-0 lg:border-r-0 border-green-500 bg-gradient-to-r from-black via-gray-950 to-black hover:bg-gradient-to-r hover:from-green-950 hover:to-black transition-colors">
                    Supply
                </button>
                <button 
                    onClick={() => router.push('/supply-shack?tab=inventory')}
                    className="text-center py-2 text-green-500 font-bold text-lg lg:text-xl uppercase border-t border-green-500 bg-gradient-to-r from-black via-gray-950 to-black hover:bg-gradient-to-r hover:from-green-950 hover:to-black transition-colors">
                    Inventory
                </button>
            </div>
            <BorderBeam
                duration={6}
                size={400}
                className="from-transparent via-green-500 to-transparent"
            />
        </div>
    );
};

export default ResourcesCard;
