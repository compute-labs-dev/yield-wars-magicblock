import React, { useEffect, useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CurrencyType } from '@/lib/constants/programEnums';
import { useExchangeCurrency } from '@/hooks/program/useExchangeCurrency';
import { useSelector, useDispatch } from 'react-redux';
import { selectUserEntity, setUserEntity } from '@/stores/features/userEntityStore';
import { 
    selectWorldPda, 
    selectIsWorldInitialized,
    setWorldPda,
    setCurrencyEntity,
    setInitialized,
    setGpuEntities,
} from '@/stores/features/worldStore';
import { toast } from 'sonner';
import { VersionedTransaction } from '@solana/web3.js';
import { useSignAndSendTransaction } from '@/hooks/useSignAndSendTransaction';
import Link from 'next/link';
import * as constants from '@/lib/consts';
import { ExchangeForm } from './ExchangeForm';
import { ExchangeChart } from './ExchangeChart';
import { ExchangeDebugInfo } from './ExchangeDebugInfo';
import { Button } from '@/components/ui/Button';
import { useInitializeNewWorld } from '@/hooks/program/useInitializeNewWorld';
import { useInitializeUserWallet } from '@/hooks/program/useInitializeUserWallet';
import { Connection } from '@solana/web3.js';
import { USDC_ENTITY, BTC_ENTITY, ETH_ENTITY, SOL_ENTITY, AIFI_ENTITY,
         USDC_PRICE_PDA, BTC_PRICE_PDA, ETH_PRICE_PDA, SOL_PRICE_PDA, AIFI_PRICE_PDA } from '@/lib/consts';
import { RootState } from '@/stores/store';
import { useQueryClient } from '@tanstack/react-query';
import { ExchangeCurrencyParams } from '@/app/actions/exchangeCurrency';

export const ExchangeContainer = () => {
    const { user } = usePrivy();
    const { signAndSend } = useSignAndSendTransaction();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const [lastExchangeDetails, setLastExchangeDetails] = useState<{
        source: CurrencyType;
        destination: CurrencyType;
        amount: string;
        status: 'pending' | 'success' | 'error';
        signature?: string;
    } | null>(null);
    
    const worldPda = useSelector(selectWorldPda);
    const isWorldInitialized = useSelector(selectIsWorldInitialized);
    const userEntity = useSelector((state: RootState) => 
        user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
    );

    const { exchangeCurrencyAsync, isLoading: isLoadingExchange } = useExchangeCurrency();
    const { initializeWorld, isLoading: isLoadingWorldInit } = useInitializeNewWorld();
    const { initializeWalletAsync, isLoading: isLoadingWalletInit } = useInitializeUserWallet();

    // Add loadWorldFromConstants function
    const loadWorldFromConstants = useCallback(() => {
        // Helper function to safely check if a property exists
        const hasProperty = (obj: Record<string, unknown>, prop: string): boolean => {
            return obj && prop in obj && obj[prop] !== undefined;
        };
        
        // Helper function to safely get PublicKey as string
        const getKeyString = (obj: Record<string, unknown>, prop: string): string | null => {
            if (hasProperty(obj, prop) && obj[prop] && typeof obj[prop].toString === 'function') {
                return obj[prop].toString();
            }
            return null;
        };
        
        // Check if world constants exist
        if (!hasProperty(constants, 'WORLD_ADDRESS')) {
            console.log("No world constants found in consts.ts");
            return false;
        }

        try {
            console.log("Loading world from constants...");
            
            const worldAddress = getKeyString(constants, 'WORLD_ADDRESS');
            if (!worldAddress) {
                throw new Error("WORLD_ADDRESS is invalid");
            }
            
            // Set world PDA
            dispatch(setWorldPda(worldAddress));
            
            // Set currency entities
            const currencies = [
                { type: CurrencyType.USDC, entity: 'USDC_ENTITY', price: 'USDC_PRICE_PDA' },
                { type: CurrencyType.BTC, entity: 'BTC_ENTITY', price: 'BTC_PRICE_PDA' },
                { type: CurrencyType.ETH, entity: 'ETH_ENTITY', price: 'ETH_PRICE_PDA' },
                { type: CurrencyType.SOL, entity: 'SOL_ENTITY', price: 'SOL_PRICE_PDA' },
                { type: CurrencyType.AIFI, entity: 'AIFI_ENTITY', price: 'AIFI_PRICE_PDA' },
            ];
            
            currencies.forEach(currency => {
                const entityPda = getKeyString(constants, currency.entity);
                const pricePda = getKeyString(constants, currency.price);
                
                if (entityPda && pricePda) {
                    dispatch(setCurrencyEntity({
                        currencyType: currency.type,
                        entityPda: entityPda,
                        pricePda: pricePda
                    }));
                }
            });
            
            // Set world as initialized
            dispatch(setInitialized(true));
            console.log("World loaded from constants successfully");
            return true;
        } catch (error) {
            console.error("Error loading world from constants:", error);
            return false;
        }
    }, [dispatch]);

    // Add effect to check constants on mount
    useEffect(() => {
        if (!isWorldInitialized) {
            const loaded = loadWorldFromConstants();
            if (loaded) {
                console.log("World loaded from constants. No need to initialize a new world.");
            } else {
                console.log("No world constants found or loading failed. You'll need to initialize a new world.");
            }
        }
    }, [isWorldInitialized, loadWorldFromConstants]);

    const handleInitializeWorld = async () => {
        if (!user?.wallet?.address) {
            toast.error("Please connect your wallet first");
            return;
        }
        try {
            await initializeWorld();
            toast.success("World initialized successfully!");
        } catch (error) {
            console.error("Failed to initialize world:", error);
            toast.error("Failed to initialize world");
        }
    };

    const handleInitializeWallet = async () => {
        if (!user?.wallet?.address || !worldPda) {
            toast.error("Please connect wallet and initialize world first");
            return;
        }
        try {
            const result = await initializeWalletAsync({
                userPublicKey: user.wallet.address,
                worldPda
            });

            if (result) {
                dispatch(setUserEntity({
                    walletAddress: user.wallet.address,
                    entityPda: result.entityPda,
                    walletComponentPda: result.walletComponentPda,
                    ownershipComponentPda: result.ownershipComponentPda,
                    priceComponentPdas: result.priceComponentPdas
                }));
                toast.success("Wallet initialized successfully!");
            }
        } catch (error) {
            console.error("Failed to initialize wallet:", error);
            toast.error("Failed to initialize wallet");
        }
    };

    const handleExchange = async (params: {
        sourceCurrency: CurrencyType;
        destinationCurrency: CurrencyType;
        amount: string;
    }) => {
        try {
            if (!user?.wallet?.address || !worldPda || !userEntity?.entityPda) {
                toast.error("Please initialize your wallet first");
                return;
            }

            setTransactionInProgress(true);
            setLastExchangeDetails({
                source: params.sourceCurrency,
                destination: params.destinationCurrency,
                amount: params.amount,
                status: 'pending'
            });

            const { sourceCurrency, destinationCurrency, amount } = params;

            // Get price PDAs from userEntity
            let sourcePricePda = userEntity.priceComponentPdas[sourceCurrency];
            let destPricePda = userEntity.priceComponentPdas[destinationCurrency];
            let sourceCurrencyEntity = sourceCurrency === CurrencyType.USDC ? USDC_ENTITY.toBase58() :
                                     sourceCurrency === CurrencyType.BTC ? BTC_ENTITY.toBase58() :
                                     sourceCurrency === CurrencyType.ETH ? ETH_ENTITY.toBase58() :
                                     sourceCurrency === CurrencyType.SOL ? SOL_ENTITY.toBase58() :
                                     sourceCurrency === CurrencyType.AIFI ? AIFI_ENTITY.toBase58() : null;
            let destCurrencyEntity = destinationCurrency === CurrencyType.USDC ? USDC_ENTITY.toBase58() :
                                   destinationCurrency === CurrencyType.BTC ? BTC_ENTITY.toBase58() :
                                   destinationCurrency === CurrencyType.ETH ? ETH_ENTITY.toBase58() :
                                   destinationCurrency === CurrencyType.SOL ? SOL_ENTITY.toBase58() :
                                   destinationCurrency === CurrencyType.AIFI ? AIFI_ENTITY.toBase58() : null;

            // Fallback to constants if needed
            if (!sourcePricePda) {
                sourcePricePda = sourceCurrency === CurrencyType.USDC ? USDC_PRICE_PDA.toBase58() :
                                sourceCurrency === CurrencyType.BTC ? BTC_PRICE_PDA.toBase58() :
                                sourceCurrency === CurrencyType.ETH ? ETH_PRICE_PDA.toBase58() :
                                sourceCurrency === CurrencyType.SOL ? SOL_PRICE_PDA.toBase58() :
                                sourceCurrency === CurrencyType.AIFI ? AIFI_PRICE_PDA.toBase58() : '';
            }
            if (!destPricePda) {
                destPricePda = destinationCurrency === CurrencyType.USDC ? USDC_PRICE_PDA.toBase58() :
                              destinationCurrency === CurrencyType.BTC ? BTC_PRICE_PDA.toBase58() :
                              destinationCurrency === CurrencyType.ETH ? ETH_PRICE_PDA.toBase58() :
                              destinationCurrency === CurrencyType.SOL ? SOL_PRICE_PDA.toBase58() :
                              destinationCurrency === CurrencyType.AIFI ? AIFI_PRICE_PDA.toBase58() : '';
            }

            if (!sourcePricePda || !destPricePda || !sourceCurrencyEntity || !destCurrencyEntity) {
                toast.error("Missing required PDAs for exchange");
                setLastExchangeDetails(prev => prev ? { ...prev, status: 'error' } : null);
                setTransactionInProgress(false);
                return;
            }

            console.log("Exchange Parameters:", {
                worldPda,
                userEntityPda: userEntity.entityPda,
                sourceCurrency: CurrencyType[sourceCurrency],
                destinationCurrency: CurrencyType[destinationCurrency],
                amount,
                sourcePricePda,
                destPricePda,
                sourceCurrencyEntity,
                destCurrencyEntity
            });

            const amountInLamports = parseInt(amount) * (10**6);
            
            const exchangeParams = {
                worldPda,
                userEntityPda: userEntity.entityPda,
                transaction_type: 1, // EXCHANGE
                currency_type: sourceCurrency,
                destination_currency_type: destinationCurrency,
                amount: amountInLamports,
                userWalletPublicKey: user.wallet.address,
                privySigner: user.wallet.address,
                sourcePricePda,
                destinationPricePda: destPricePda,
                sourceCurrencyEntityPda: sourceCurrencyEntity,
                destinationCurrencyEntityPda: destCurrencyEntity
            };

            // Call the exchange function and get the transaction signature
            const signature = await exchangeCurrencyAsync(exchangeParams);
            console.log("Exchange transaction signature:", signature);
            
            // Update last exchange details with success status and signature
            setLastExchangeDetails(prev => prev ? { 
                ...prev, 
                status: 'success', 
                signature 
            } : null);
            
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['walletBalance'] });

        } catch (error) {
            console.error("Exchange failed:", error);
            setLastExchangeDetails(prev => prev ? { ...prev, status: 'error' } : null);
            toast.error(`Exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setTransactionInProgress(false);
        }
    };

    const renderInitializationStatus = () => {
        if (!user?.wallet?.address) {
            return (
                <div className="bg-red-900/20 p-4 rounded-lg mb-4">
                    <p className="text-red-400">Please connect your wallet to continue</p>
                </div>
            );
        }

        if (!isWorldInitialized) {
            return (
                <div className="bg-yellow-900/20 p-4 rounded-lg mb-4">
                    <p className="text-yellow-400 mb-2">World needs to be initialized first</p>
                    <Button
                        onClick={handleInitializeWorld}
                        disabled={isLoadingWorldInit}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                        {isLoadingWorldInit ? "Initializing World..." : "Initialize World"}
                    </Button>
                </div>
            );
        }

        if (!userEntity) {
            return (
                <div className="bg-blue-900/20 p-4 rounded-lg mb-4">
                    <p className="text-blue-400 mb-2">Initialize your wallet to start trading</p>
                    <Button
                        onClick={handleInitializeWallet}
                        disabled={isLoadingWalletInit}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoadingWalletInit ? "Initializing Wallet..." : "Initialize Wallet"}
                    </Button>
                </div>
            );
        }

        return null;
    };

    // Render last exchange details
    const renderLastExchangeDetails = () => {
        if (!lastExchangeDetails) return null;
        
        const { source, destination, amount, status, signature } = lastExchangeDetails;
        
        let statusColor = 'text-yellow-400';
        let statusBg = 'bg-yellow-900/20';
        let statusText = 'pending';
        
        if (status === 'success') {
            statusColor = 'text-green-400';
            statusBg = 'bg-green-900/20';
            statusText = 'completed';
        } else if (status === 'error') {
            statusColor = 'text-red-400';
            statusBg = 'bg-red-900/20';
            statusText = 'failed';
        }
        
        return (
            <div className={`${statusBg} p-4 rounded-lg mb-4 font-mono`}>
                <div className="flex justify-between items-center">
                    <h3 className={`${statusColor} text-sm font-semibold`}>Last Exchange</h3>
                    <span className={`${statusColor} text-xs px-2 py-1 rounded-full border border-current`}>
                        {statusText}
                    </span>
                </div>
                <p className="text-gray-300 text-sm mt-2">
                    {amount} {CurrencyType[source]} → {CurrencyType[destination]}
                </p>
                {signature && (
                    <a 
                        href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs underline mt-1 block"
                    >
                        View transaction
                    </a>
                )}
            </div>
        );
    };

    return (
        <div className="w-full p-4">
            {renderInitializationStatus()}
            {renderLastExchangeDetails()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full justify-between">
                <div className="order-2 lg:order-1">
                    <ExchangeChart />
                </div>
                <div className="order-1 lg:order-2">
                    <ExchangeForm 
                        onExchange={handleExchange}
                        isLoading={isLoadingExchange || transactionInProgress}
                    />
                    {/* <ExchangeDebugInfo 
                        worldPda={worldPda || ''}
                        userEntity={userEntity}
                        priceComponentPdas={userEntity?.priceComponentPdas}
                    /> */}
                </div>
            </div>
        </div>
    );
}; 