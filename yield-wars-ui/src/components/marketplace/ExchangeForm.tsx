import React, { useState, useEffect } from 'react';
import { CurrencyType } from '@/lib/constants/programEnums';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSelector } from 'react-redux';
import { selectIsWorldInitialized, selectWorldPda } from '@/stores/features/worldStore';
import { usePrivy } from '@privy-io/react-auth';
import { selectUserEntity, selectUserPriceComponentPdas } from '@/stores/features/userEntityStore';
import { RootState } from '@/stores/store';
import { useQuery } from '@tanstack/react-query';
import { fetchWalletBalance, fetchPriceComponent } from '@/app/actions/fetchComponents';

interface ExchangeFormProps {
    onExchange: (params: {
        sourceCurrency: CurrencyType;
        destinationCurrency: CurrencyType;
        amount: string;
    }) => Promise<void>;
    isLoading: boolean;
}

// Exchange fee percentage
const EXCHANGE_FEE = 0.01; // 1%

export const ExchangeForm = ({ onExchange, isLoading }: ExchangeFormProps) => {
    const { user } = usePrivy();
    const walletAddress = user?.wallet?.address as string;
    const isWorldInitialized = useSelector(selectIsWorldInitialized);
    const worldPda = useSelector(selectWorldPda);
    const userEntity = useSelector((state: RootState) => 
        walletAddress ? selectUserEntity(state, walletAddress) : null
    );
    const priceComponentPdas = useSelector((state: RootState) => 
        walletAddress ? selectUserPriceComponentPdas(state, walletAddress) : null
    );

    const [sourceCurrency, setSourceCurrency] = useState<CurrencyType>(CurrencyType.USDC);
    const [destinationCurrency, setDestinationCurrency] = useState<CurrencyType>(CurrencyType.BTC);
    const [sourceAmount, setSourceAmount] = useState<string>('');
    const [destinationAmount, setDestinationAmount] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'swap' | 'limit' | 'long' | 'short'>('swap');
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);

    // Fetch wallet balances
    const { data: walletData, isLoading: isLoadingWallet, refetch: refetchWallet } = useQuery({
        queryKey: ['walletBalance', walletAddress, userEntity?.walletComponentPda],
        queryFn: async () => {
            if (!userEntity?.walletComponentPda) return null;
            return fetchWalletBalance(userEntity.walletComponentPda);
        },
        enabled: !!userEntity?.walletComponentPda && !!walletAddress,
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 10000, // Consider data stale after 10 seconds
    });

    // Get user balances for each currency type
    const balances = {
        [CurrencyType.USDC]: walletData?.usdcBalance || 0,
        [CurrencyType.BTC]: walletData?.btcBalance || 0,
        [CurrencyType.ETH]: walletData?.ethBalance || 0,
        [CurrencyType.SOL]: walletData?.solBalance || 0,
        [CurrencyType.AIFI]: walletData?.aifiBalance || 0,
    };

    // Fetch source currency price
    const { data: sourcePriceData, isLoading: isLoadingSourcePrice } = useQuery({
        queryKey: ['priceComponent', sourceCurrency, priceComponentPdas?.[sourceCurrency as keyof typeof priceComponentPdas]],
        queryFn: async () => {
            if (!priceComponentPdas || !priceComponentPdas[sourceCurrency as keyof typeof priceComponentPdas]) {
                return null;
            }
            return fetchPriceComponent(priceComponentPdas[sourceCurrency as keyof typeof priceComponentPdas]);
        },
        enabled: !!priceComponentPdas && !!priceComponentPdas[sourceCurrency as keyof typeof priceComponentPdas],
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000, // Consider data stale after 30 seconds
    });

    // Fetch destination currency price
    const { data: destPriceData, isLoading: isLoadingDestPrice } = useQuery({
        queryKey: ['priceComponent', destinationCurrency, priceComponentPdas?.[destinationCurrency as keyof typeof priceComponentPdas]],
        queryFn: async () => {
            if (!priceComponentPdas || !priceComponentPdas[destinationCurrency as keyof typeof priceComponentPdas]) {
                return null;
            }
            return fetchPriceComponent(priceComponentPdas[destinationCurrency as keyof typeof priceComponentPdas]);
        },
        enabled: !!priceComponentPdas && !!priceComponentPdas[destinationCurrency as keyof typeof priceComponentPdas],
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000, // Consider data stale after 30 seconds
    });

    // Calculate and update exchange rate when price data changes
    useEffect(() => {
        if (sourcePriceData?.currentPrice && destPriceData?.currentPrice) {
            // Calculate exchange rate: price of destination / price of source
            const sourcePrice = Number(sourcePriceData.currentPrice);
            const destPrice = Number(destPriceData.currentPrice);
            
            if (sourcePrice > 0) {
                // Rate is how much destination currency you get per 1 unit of source currency
                const rate = sourcePrice / destPrice;
                setExchangeRate(rate);
                console.log(`Exchange rate: 1 ${CurrencyType[sourceCurrency]} = ${rate.toFixed(6)} ${CurrencyType[destinationCurrency]}`);
            } else {
                setExchangeRate(null);
            }
        } else {
            setExchangeRate(null);
        }
    }, [sourcePriceData, destPriceData, sourceCurrency, destinationCurrency]);

    // Update destination amount when source amount or exchange rate changes
    useEffect(() => {
        if (sourceAmount && exchangeRate !== null) {
            const sourceValue = parseFloat(sourceAmount);
            // Apply exchange rate and 1% fee
            const destValue = sourceValue * exchangeRate * (1 - EXCHANGE_FEE);
            setDestinationAmount(destValue.toFixed(6).replace(/\.?0+$/, ''));
        } else {
            setDestinationAmount('');
        }
    }, [sourceAmount, exchangeRate]);

    const handleSourceAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSourceAmount(value);
    };

    const handleDestinationAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDestinationAmount(value);
        
        // Reverse calculate the source amount including fee
        if (value && exchangeRate !== null) {
            const destValue = parseFloat(value);
            // Reverse the calculation including 1% fee
            const sourceValue = destValue / exchangeRate / (1 - EXCHANGE_FEE);
            setSourceAmount(sourceValue.toFixed(6).replace(/\.?0+$/, ''));
        } else {
            setSourceAmount('');
        }
    };

    const handleSwapDirection = () => {
        const tempCurrency = sourceCurrency;
        setSourceCurrency(destinationCurrency);
        setDestinationCurrency(tempCurrency);
        
        // Clear amounts when swapping direction as exchange rate will change
        setSourceAmount('');
        setDestinationAmount('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!sourceAmount || !worldPda || !userEntity) return;
        
        try {
            await onExchange({
                sourceCurrency,
                destinationCurrency,
                amount: sourceAmount
            });
            
            // After exchange, refetch wallet data after a short delay
            // to ensure blockchain state is updated
            setTimeout(() => {
                refetchWallet();
            }, 2000);
        } catch (error) {
            console.error("Exchange error:", error);
        }
    };

    const getTokenName = (type: CurrencyType): string => {
        return CurrencyType[type] || 'Unknown';
    };

    // Format balance to human-readable format (with 6 decimal places in the on-chain data)
    const formatBalance = (balance: number): string => {
        return (balance / 1000000).toFixed(4);
    };

    const isFormDisabled = !user?.wallet?.address || !isWorldInitialized || !userEntity;
    const hasInsufficientBalance = parseFloat(sourceAmount) > (balances[sourceCurrency] / 1000000);
    const isLoadingData = isLoadingWallet || isLoadingSourcePrice || isLoadingDestPrice;

    return (
        <div className="bg-black backdrop-blur-sm rounded-lg">
            {/* Tabs */}
            <div className="grid grid-cols-4 gap-1 mb-6 p-1">
                <Button 
                    onClick={() => setActiveTab('swap')} 
                    className={`py-2 px-4 font-mono text-base rounded-md ${activeTab === 'swap' ? 'bg-gray-800 text-green-500' : 'bg-transparent text-gray-400'}`}
                >
                    Swap
                </Button>
                <Button 
                    onClick={() => setActiveTab('limit')} 
                    className={`py-2 px-4 font-mono text-base rounded-md ${activeTab === 'limit' ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400'}`}
                    disabled={true}
                >
                    Limit
                </Button>
                <Button 
                    onClick={() => setActiveTab('long')} 
                    className={`py-2 px-4 font-mono text-base rounded-md ${activeTab === 'long' ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400'}`}
                    disabled={true}
                >
                    Long
                </Button>
                <Button 
                    onClick={() => setActiveTab('short')} 
                    className={`py-2 px-4 font-mono text-base rounded-md ${activeTab === 'short' ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400'}`}
                    disabled={true}
                >
                    Short
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 pb-6">
                {/* Source/From Section */}
                <div className="mb-4">
                    <div className="text-gray-400 text-sm font-mono mb-2">Swap from</div>
                    <div className="flex justify-between items-center">
                        <Input
                            type="number"
                            value={sourceAmount}
                            onChange={handleSourceAmountChange}
                            placeholder="0"
                            className="w-1/2 bg-transparent text-white text-2xl font-mono border-none focus:outline-none focus:ring-0 p-0"
                            min="0"
                            step="0.000001"
                            disabled={isFormDisabled || isLoading || isLoadingData}
                        />
                        <div className="relative">
                            <select
                                className="appearance-none bg-transparent text-white border border-gray-700 rounded-lg p-2 pr-8 font-mono"
                                value={sourceCurrency}
                                onChange={(e) => {
                                    setSourceCurrency(Number(e.target.value) as CurrencyType);
                                    // Clear amounts when changing currency as exchange rate will change
                                    setSourceAmount('');
                                    setDestinationAmount('');
                                }}
                                disabled={isFormDisabled || isLoading || isLoadingData}
                            >
                                {Object.entries(CurrencyType)
                                    .filter(([key, value]) => !isNaN(Number(value)))
                                    .map(([label, value]) => (
                                        <option key={value} value={value} className="bg-gray-800">{label}</option>
                                    ))
                                }
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                                <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="text-gray-500 text-xs font-mono mt-1">
                        Balance: {isLoadingWallet ? "Loading..." : formatBalance(balances[sourceCurrency] || 0)}
                    </div>
                </div>

                {/* Exchange Rate Info */}
                {isLoadingSourcePrice || isLoadingDestPrice ? (
                    <div className="flex justify-between items-center text-xs text-gray-500 font-mono mb-2 px-1">
                        <span>Loading exchange rates...</span>
                        <span>Fee: {EXCHANGE_FEE * 100}%</span>
                    </div>
                ) : exchangeRate !== null ? (
                    <div className="flex justify-between items-center text-xs text-gray-500 font-mono mb-2 px-1">
                        <span>Rate: 1 {getTokenName(sourceCurrency)} = {exchangeRate.toFixed(6)} {getTokenName(destinationCurrency)}</span>
                        <span>Fee: {EXCHANGE_FEE * 100}%</span>
                    </div>
                ) : (
                    <div className="flex justify-between items-center text-xs text-gray-500 font-mono mb-2 px-1">
                        <span>Rate: unavailable</span>
                        <span>Fee: {EXCHANGE_FEE * 100}%</span>
                    </div>
                )}

                {/* Swap Direction Button */}
                <div className="flex justify-center my-4">
                    <Button
                        type="button"
                        onClick={handleSwapDirection}
                        className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50"
                        disabled={isLoading || isLoadingData}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 10l5 5 5-5" />
                            <path d="M17 14l-5-5-5 5" />
                        </svg>
                    </Button>
                </div>

                {/* Destination/To Section */}
                <div className="mb-6">
                    <div className="text-gray-400 text-sm font-mono mb-2">Swap to</div>
                    <div className="flex justify-between items-center">
                        <Input
                            type="number"
                            value={destinationAmount}
                            onChange={handleDestinationAmountChange}
                            placeholder="0"
                            className="w-1/2 bg-transparent text-white text-2xl font-mono border-none focus:outline-none focus:ring-0 p-0"
                            min="0"
                            step="0.000001"
                            disabled={isFormDisabled || isLoading || isLoadingData}
                        />
                        <div className="relative">
                            <select
                                className="appearance-none bg-transparent text-white border border-gray-700 rounded-lg p-2 pr-8 font-mono"
                                value={destinationCurrency}
                                onChange={(e) => {
                                    setDestinationCurrency(Number(e.target.value) as CurrencyType);
                                    // Clear amounts when changing currency as exchange rate will change
                                    setSourceAmount('');
                                    setDestinationAmount('');
                                }}
                                disabled={isFormDisabled || isLoading || isLoadingData}
                            >
                                {Object.entries(CurrencyType)
                                    .filter(([key, value]) => !isNaN(Number(value)))
                                    .map(([label, value]) => (
                                        <option key={value} value={value} className="bg-gray-800">{label}</option>
                                    ))
                                }
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                                <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="text-gray-500 text-xs font-mono mt-1">
                        Balance: {isLoadingWallet ? "Loading..." : formatBalance(balances[destinationCurrency] || 0)}
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    className={`w-full py-3 rounded-md font-mono text-white ${hasInsufficientBalance ? 'bg-red-700 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    disabled={isLoading || isLoadingData || !sourceAmount || isFormDisabled || hasInsufficientBalance}
                >
                    {isLoading ? 'Processing...' : 
                     isLoadingData ? 'Loading Data...' :
                     isFormDisabled ? 'Connect Wallet' :
                     !sourceAmount ? 'Enter an Amount' : 
                     hasInsufficientBalance ? 'Insufficient Balance' :
                     `Swap ${getTokenName(sourceCurrency)} for ${getTokenName(destinationCurrency)}`}
                </Button>
            </form>
        </div>
    );
};