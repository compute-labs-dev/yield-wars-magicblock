"use client";
import { ScratchToReveal } from "@/components/ui/ScratchToReveal";
import { Keypair, PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { BorderBeam } from "@/components/ui/BorderBeam";
import { TransactionRequestQR } from "@/components/ui/SendTransactionRequest";
import LoginContainer from "@/components/layout/LoginContainer";
import { usePrivy } from "@privy-io/react-auth";
import { useSignTransaction } from '@privy-io/react-auth/solana';
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import GasContainer from "@/components/layout/GasContainer";
import { useEmptyWallet } from "@/hooks/useEmptyWallet";
import React, { useState, useEffect, useCallback } from "react";
import { useInitializeUserWallet } from "@/hooks/program/useInitializeUserWallet";
import { useTransferCurrency } from "@/hooks/program/useTransferCurrency";
import { useExchangeCurrency } from "@/hooks/program/useExchangeCurrency";
import { CurrencyType } from "@/lib/constants/programEnums";
import { useSignAndSendTransaction } from "@/hooks/useSignAndSendTransaction";
import {
    FindComponentPda,
    FindEntityPda,
    World,
} from "@magicblock-labs/bolt-sdk";
import { useMagicBlockEngine } from "@/engine/MagicBlockEngineProvider";
import { 
    componentOwnership,
    getComponentOwnershipOnChain
} from "@/lib/constants/programIds";
import { useDispatch, useSelector } from 'react-redux';
import { useInitializeNewWorld } from '@/hooks/program/useInitializeNewWorld';
import { selectIsWorldInitialized, selectWorldPda, resetWorld, selectGpuEntities, setWorldPda, setCurrencyEntity, setGpuEntities, setInitialized, GpuEntityDetails } from '@/stores/features/worldStore';
import { useOwnedAssets, AssetDetails } from "@/hooks/program/useOwnedAssets";
import { useAssetProduction } from "@/hooks/program/useAssetProduction";
import { useAssetUpgrade } from "@/hooks/program/useAssetUpgrade";
import { useAssetStaking } from "@/hooks/program/useAssetStaking";
import { usePurchaseGpu } from "@/hooks/program/usePurchaseGpu";
import * as constants from '@/lib/consts';
import { 
    setUserEntity, 
    selectUserEntity, 
    setCurrentEntity, 
} from '@/stores/features/userEntityStore';
import { RootState } from '@/stores/store';
import { useWalletGpus } from "@/hooks/useWalletGpus";

export default function ScratchPage() {
    const [initializedUserEntityPda, setInitializedUserEntityPda] = useState<string>("");
    const [worldPdaInit, setWorldPdaInit] = useState<string>("75qtZMpupUEjtkkL8XXniCHCYwSdJMa9Wa5ukGYinUk");
    const [lastKnownEntityPda, setLastKnownEntityPda] = useState<string>("FRm2rhCgrTMEvS7xjYNca4aTXNEFf2mZhnvgqBhVEaYn");
    const [transferSourceEntity, setTransferSourceEntity] = useState<string>("");
    const [transferDestEntity, setTransferDestEntity] = useState<string>("");
    const [transferCurrencyType, setTransferCurrencyType] = useState<CurrencyType>(CurrencyType.USDC);
    const [transferAmount, setTransferAmount] = useState<string>("1");
    const [exchangeUserEntity, setExchangeUserEntity] = useState<string>("");
    const [exchangeSourceCurrency, setExchangeSourceCurrency] = useState<CurrencyType>(CurrencyType.USDC);
    const [exchangeDestCurrency, setExchangeDestCurrency] = useState<CurrencyType>(CurrencyType.BTC);
    const [exchangeAmount, setExchangeAmount] = useState<string>("10");
    const [priceComponentPdas, setPriceComponentPdas] = useState<{[key in CurrencyType]?: string}>({});

    // Add inventory state and hooks
    const [selectedAsset, setSelectedAsset] = useState<AssetDetails | null>(null);
    const { ownedAssets, isLoading: isLoadingAssets, error: assetsError, fetchOwnedAssets, refreshAssetDetails } = useOwnedAssets();
    const { collectResources, toggleProduction, calculateCollectableResources, isLoading: isLoadingProduction } = useAssetProduction();
    const { upgradeAsset, canUpgrade, isLoading: isLoadingUpgrade } = useAssetUpgrade();
    const { stakeAsset, unstakeAsset, collectStakingRewards, calculatePenalty, isLoading: isLoadingStaking } = useAssetStaking();
    const { purchaseGpu, isLoading: isLoadingPurchase } = usePurchaseGpu();
    
    // Get available GPUs from Redux store
    const availableGpus = useSelector(selectGpuEntities);
    
    // Add selected GPU state
    const [selectedGpu, setSelectedGpu] = useState<string | null>(null);

    // Component hooks that don't depend on React-Redux
    const engine = useMagicBlockEngine();
    const { user, ready, authenticated } = usePrivy();
    const { signTransaction: privySignTransactionDirect } = useSignTransaction();
    const { signAndSend } = useSignAndSendTransaction();
    const reference = Keypair.generate().publicKey;
    const { emptyWallet } = useEmptyWallet();
    
    // React-Redux hooks that should only be used on the client
    const dispatch = useDispatch();
    
    // Get the user entity from Redux if it exists
    const userEntity = useSelector((state: RootState) => 
        user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
    );

    // Hooks for wallet operations
    const { 
        initializeWalletAsync,
        isLoading: isLoadingInitWallet, 
        data: initWalletData 
    } = useInitializeUserWallet();
    const { 
        transferCurrency, 
        isLoading: isLoadingTransfer,
    } = useTransferCurrency();
    const { 
        exchangeCurrency, 
        isLoading: isLoadingExchange 
    } = useExchangeCurrency();

    // Add world initialization hook
    const { 
        initializeWorld, 
        isLoading: isLoadingWorldInit,
        error: worldInitError,
        data: worldData
    } = useInitializeNewWorld();
    
    // Add world state from Redux
    const isWorldInitialized = useSelector(selectIsWorldInitialized);
    const worldPda = useSelector(selectWorldPda);

    // Replace the old GPU fetching hook with our new one
    const { gpus, isLoading: isLoadingGpus, error: gpusError, fetchWalletGpus } = useWalletGpus(initializedUserEntityPda);

    // Load user entity from Redux when available
    useEffect(() => {
        if (user?.wallet?.address && userEntity) {
            console.log("Loading user entity from Redux:", userEntity);
            setInitializedUserEntityPda(userEntity.entityPda);
            setTransferSourceEntity(userEntity.entityPda);
            setExchangeUserEntity(userEntity.entityPda);
            setLastKnownEntityPda(userEntity.entityPda);
            
            // Set current entity in Redux
            dispatch(setCurrentEntity(userEntity.entityPda));
            
            // Set price component PDAs
            setPriceComponentPdas(userEntity.priceComponentPdas);
            
            // Debug: Log price component PDAs
            console.log("PRICE COMPONENT PDAs from Redux:", userEntity.priceComponentPdas);
            console.log("USDC Price PDA:", userEntity.priceComponentPdas[CurrencyType.USDC]);
        }
    }, [user?.wallet?.address, userEntity, dispatch]);

    // Update Redux when wallet is initialized
    useEffect(() => {
        if (initWalletData?.entityPda && user?.wallet?.address) {
            setInitializedUserEntityPda(initWalletData.entityPda);
            setTransferSourceEntity(initWalletData.entityPda);
            setExchangeUserEntity(initWalletData.entityPda);
            
            // Store in Redux with ownership component PDA
            dispatch(setUserEntity({
                walletAddress: user.wallet.address,
                entityPda: initWalletData.entityPda,
                walletComponentPda: initWalletData.walletComponentPda,
                ownershipComponentPda: initWalletData.ownershipComponentPda,
                priceComponentPdas: initWalletData.priceComponentPdas
            }));
            
            // Set as current entity
            dispatch(setCurrentEntity(initWalletData.entityPda));
            
            // Set price component PDAs using the stored data
            setPriceComponentPdas(initWalletData.priceComponentPdas);
            
            // Debug: Log component PDAs
            console.log("User Entity Initialized:", {
                entityPda: initWalletData.entityPda,
                walletComponentPda: initWalletData.walletComponentPda,
                ownershipComponentPda: initWalletData.ownershipComponentPda,
                priceComponentPdas: initWalletData.priceComponentPdas
            });
            
            toast.info(`User Entity PDA Initialized: ${initWalletData.entityPda}`);
        }
    }, [initWalletData, user?.wallet?.address, dispatch]);

    // Wrap getWorldData in useCallback
    const getWorldData = useCallback(async () => {
        try {
            const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
            
            console.log("Starting ownership check with params:", {
                userWallet: user?.wallet?.address,
                worldPda: worldPdaInit,
                lastKnownEntity: lastKnownEntityPda
            });
            
            if (!user?.wallet?.address) {
                console.warn("User wallet address is undefined! Cannot check ownership.");
                return;
            }

            // First, verify the last known entity directly
            if (lastKnownEntityPda) {
                try {
                    console.log("\nDirectly checking last known entity:", lastKnownEntityPda);
                    const entityPda = new PublicKey(lastKnownEntityPda);
                    
                    // Find and check the ownership component
                    const ownershipPda = FindComponentPda({
                        componentId: new PublicKey(componentOwnership.address),
                        entity: entityPda,
                    });
                    console.log("Looking for ownership at:", ownershipPda.toBase58());

                    const ownershipInfo = await connection.getAccountInfo(ownershipPda);
                    if (ownershipInfo) {
                        console.log("Found ownership account:", {
                            address: ownershipPda.toBase58(),
                            size: ownershipInfo.data.length,
                            owner: ownershipInfo.owner.toBase58()
                        });

                        const ownershipCoder = getComponentOwnershipOnChain(engine).coder;
                        const ownership = ownershipCoder.accounts.decode("ownership", ownershipInfo.data);
                        
                        console.log("Decoded ownership data:", {
                            ownerType: ownership.owner_type,
                            ownerEntity: ownership.owner_entity?.toBase58(),
                            ownedEntities: ownership.owned_entities?.map((e: PublicKey) => e.toBase58()),
                            userWallet: user?.wallet?.address
                        });

                        // Check both owner_entity and owned_entities
                        const isOwner = ownership.owner_entity?.toBase58() === user?.wallet?.address ||
                                      ownership.owned_entities?.some((e: PublicKey) => e.toBase58() === user?.wallet?.address);

                        if (isOwner) {
                            console.log("✅ Verified ownership of entity:", lastKnownEntityPda);
                            setInitializedUserEntityPda(lastKnownEntityPda);
                            setTransferSourceEntity(lastKnownEntityPda);
                            setExchangeUserEntity(lastKnownEntityPda);
                            return;
                        }
                    }
                } catch (error) {
                    console.error("Error checking last known entity:", error);
                }
            }

            // If direct check failed, fetch world and search all entities
            console.log("\nFetching world data to search all entities...");
            const world = await World.fromAccountAddress(
                connection,
                new PublicKey(worldPdaInit),
                "confirmed"
            );
            console.log("World data fetched. Total entities:", Number(world.entities));
            
            let entityId = world.entities;
            let found = false;
            
            while (!entityId.isNeg() && !found) {
                const entityPda = FindEntityPda({
                    worldId: world.id,
                    entityId: entityId
                });
                
                try {
                    const ownershipPda = FindComponentPda({
                        componentId: new PublicKey(componentOwnership.address),
                        entity: entityPda,
                    });
                    
                    const ownershipInfo = await connection.getAccountInfo(ownershipPda);
                    if (ownershipInfo) {
                        const ownershipCoder = getComponentOwnershipOnChain(engine).coder;
                        const ownership = ownershipCoder.accounts.decode("ownership", ownershipInfo.data);

                        // Check both owner_entity and owned_entities
                        const isOwner = ownership.owner_entity?.toBase58() === user?.wallet?.address ||
                                      ownership.owned_entities?.some((e: PublicKey) => e.toBase58() === user?.wallet?.address);

                        if (isOwner) {
                            console.log("✅ Found matching entity:", entityPda.toBase58());
                            setInitializedUserEntityPda(entityPda.toBase58());
                            setTransferSourceEntity(entityPda.toBase58());
                            setExchangeUserEntity(entityPda.toBase58());
                            setLastKnownEntityPda(entityPda.toBase58());
                            found = true;
                            break;
                        }
                    }
                } catch (error) {
                    console.error("Error checking entity:", error);
                }
                
                entityId = entityId.subn(1);
            }

        } catch (error) {
            console.error("Error in getWorldData:", error);
        }
    }, [user?.wallet?.address, worldPdaInit, engine, lastKnownEntityPda]);

    // Update useEffect to run when component mounts and when dependencies change
    useEffect(() => {
        if (user?.wallet?.address && worldPdaInit) {
            console.log("Running getWorldData with:", {
                userWallet: user.wallet.address,
                worldPda: worldPdaInit,
                lastKnownEntity: lastKnownEntityPda
            });
            getWorldData();
        }
    }, [user?.wallet?.address, worldPdaInit, getWorldData]);

    // Add effect to persist entity PDA when found
    useEffect(() => {
        if (initializedUserEntityPda) {
            setLastKnownEntityPda(initializedUserEntityPda);
        }
    }, [initializedUserEntityPda]);

    const handleClaimWinnings = async () => {
        const txn = await fetch(`/api/transaction?network=devnet&reference=${reference.toBase58()}`, {
            method: 'POST',
            body: JSON.stringify({ account: user?.wallet?.address }),
        });
        const txnData = await txn.json();
        const claimRes = await fetch('/api/claim-winnings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: txnData.transaction }),
        });
        const claimData = await claimRes.json();
        if (!claimRes.ok) {
            toast.error(claimData.error || 'Failed to claim winnings');
            return;
        }
        const receipt = claimData.txHash;
        toast.success(
            <div>
                <p>Winnings Claimed.</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        )
    }
    

    const handleEmptyWallet = async () => {
        const receipt = await emptyWallet(user?.wallet?.address as string)
        toast.success(
            <div>
                <p>Wallet Emptied.</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        )
    }

    const handleInitializeWorld = async () => {
        if (!user?.wallet?.address) {
            toast.error("User wallet not connected.");
            return;
        }
        try {
            console.log("Starting world initialization...");
            await initializeWorld();
            
            // The hook will automatically update worldData
            if (worldData) {
                console.log("World initialization completed:", worldData);
                console.log("New world PDA:", worldData.worldPda);
                console.log("Currency entities:", worldData.currencyEntities);
                setWorldPdaInit(worldData.worldPda);
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.error("Failed to initialize world:", e.message);
            } else {
                console.error("Failed to initialize world:", e);
            }
        }
    };

    const handleInitializeWallet = async () => {
        if (!user?.wallet?.address) {
            toast.error("User wallet not connected.");
            return;
        }
        try {
            console.log("Starting wallet initialization with params:", {
                userPublicKey: user.wallet.address,
                worldPda: worldPdaInit
            });
            
            const result = await initializeWalletAsync({ 
                userPublicKey: user.wallet.address, 
                worldPda: worldPdaInit 
            });
            
            if (result) {
                console.log("Wallet initialization completed:", {
                    entityPda: result.entityPda,
                    walletComponentPda: result.walletComponentPda,
                    priceComponentPdas: result.priceComponentPdas
                });
                
                setInitializedUserEntityPda(result.entityPda);
                setTransferSourceEntity(result.entityPda);
                setExchangeUserEntity(result.entityPda);
                toast.success(`Entity initialized: ${result.entityPda}`);
                
                // Trigger an immediate ownership check
                await getWorldData();
            }
        } catch (error) { 
            console.error("Init wallet failed:", error);
            toast.error(`Init wallet failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleTransfer = async () => {
        if (!user?.wallet?.address || !privySignTransactionDirect) {
            toast.error("User wallet not connected or Privy signer not available.");
            return;
        }
        if (!transferSourceEntity || !transferDestEntity || !transferAmount) {
            toast.error("Please fill all transfer fields.");
            return;
        }
        try {
            const params = {
                worldPda: worldPdaInit,
                sourceEntityPda: transferSourceEntity,
                destinationEntityPda: transferDestEntity,
                currencyType: Number(transferCurrencyType) as CurrencyType,
                amount: parseInt(transferAmount) * (10**6),
                userWalletPublicKey: new PublicKey(user.wallet.address),
                privySigner: new PublicKey(user.wallet.address),
            };

            console.log("Transfer params: ", params);
            await transferCurrency(params);
        } catch (error) { 
            console.error("Transfer failed:", error);
            toast.error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleExchange = async () => {
        try {
            if (!user?.wallet?.address || !worldPdaInit || !exchangeUserEntity) {
                toast.error("Missing required data for exchange");
                return;
            }

            // Try getting price PDAs from state first
            let sourcePricePda = priceComponentPdas[exchangeSourceCurrency];
            let destPricePda = priceComponentPdas[exchangeDestCurrency];
            let sourceCurrencyEntity = worldData?.currencyEntities[exchangeSourceCurrency]?.entityPda;
            let destCurrencyEntity = worldData?.currencyEntities[exchangeDestCurrency]?.entityPda;

            // If any values are missing, use the userEntity loaded at component level
            if (!sourcePricePda && userEntity?.priceComponentPdas) {
                sourcePricePda = userEntity.priceComponentPdas[exchangeSourceCurrency];
                console.log("Using source price PDA from Redux:", sourcePricePda);
            }

            if (!destPricePda && userEntity?.priceComponentPdas) {
                destPricePda = userEntity.priceComponentPdas[exchangeDestCurrency];
                console.log("Using destination price PDA from Redux:", destPricePda);
            }

            // If still missing, fallback to constants
            if (!sourcePricePda) {
                if (exchangeSourceCurrency === CurrencyType.USDC) {
                    sourcePricePda = constants.USDC_PRICE_PDA.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.BTC) {
                    sourcePricePda = constants.BTC_PRICE_PDA.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.ETH) {
                    sourcePricePda = constants.ETH_PRICE_PDA.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.SOL) {
                    sourcePricePda = constants.SOL_PRICE_PDA.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.AIFI) {
                    sourcePricePda = constants.AIFI_PRICE_PDA.toBase58();
                }
                console.log("Using source price PDA from constants:", sourcePricePda);
            }

            if (!destPricePda) {
                if (exchangeDestCurrency === CurrencyType.USDC) {
                    destPricePda = constants.USDC_PRICE_PDA.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.BTC) {
                    destPricePda = constants.BTC_PRICE_PDA.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.ETH) {
                    destPricePda = constants.ETH_PRICE_PDA.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.SOL) {
                    destPricePda = constants.SOL_PRICE_PDA.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.AIFI) {
                    destPricePda = constants.AIFI_PRICE_PDA.toBase58();
                }
                console.log("Using destination price PDA from constants:", destPricePda);
            }

            if (!sourceCurrencyEntity) {
                if (exchangeSourceCurrency === CurrencyType.USDC) {
                    sourceCurrencyEntity = constants.USDC_ENTITY.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.BTC) {
                    sourceCurrencyEntity = constants.BTC_ENTITY.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.ETH) {
                    sourceCurrencyEntity = constants.ETH_ENTITY.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.SOL) {
                    sourceCurrencyEntity = constants.SOL_ENTITY.toBase58();
                } else if (exchangeSourceCurrency === CurrencyType.AIFI) {
                    sourceCurrencyEntity = constants.AIFI_ENTITY.toBase58();
                }
                console.log("Using source currency entity from constants:", sourceCurrencyEntity);
            }

            if (!destCurrencyEntity) {
                if (exchangeDestCurrency === CurrencyType.USDC) {
                    destCurrencyEntity = constants.USDC_ENTITY.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.BTC) {
                    destCurrencyEntity = constants.BTC_ENTITY.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.ETH) {
                    destCurrencyEntity = constants.ETH_ENTITY.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.SOL) {
                    destCurrencyEntity = constants.SOL_ENTITY.toBase58();
                } else if (exchangeDestCurrency === CurrencyType.AIFI) {
                    destCurrencyEntity = constants.AIFI_ENTITY.toBase58();
                }
                console.log("Using destination currency entity from constants:", destCurrencyEntity);
            }

            if (!sourcePricePda || !destPricePda || !sourceCurrencyEntity || !destCurrencyEntity) {
                toast.error(`Missing required PDAs. Source Price: ${!!sourcePricePda}, Dest Price: ${!!destPricePda}, Source Entity: ${!!sourceCurrencyEntity}, Dest Entity: ${!!destCurrencyEntity}`);
                return;
            }

            console.log("Exchange attempt with components:", {
                sourcePricePda,
                destPricePda,
                sourceCurrencyEntity,
                destCurrencyEntity,
                exchangeSourceCurrency: CurrencyType[exchangeSourceCurrency],
                exchangeDestCurrency: CurrencyType[exchangeDestCurrency]
            });

            const params = {
                worldPda: worldPdaInit,
                userEntityPda: exchangeUserEntity,
                transaction_type: 1, // EXCHANGE
                currency_type: exchangeSourceCurrency,
                destination_currency_type: exchangeDestCurrency,
                amount: parseInt(exchangeAmount) * (10**6),
                userWalletPublicKey: user.wallet.address,
                privySigner: user.wallet.address,
                sourcePricePda,
                destinationPricePda: destPricePda,
                sourceCurrencyEntityPda: sourceCurrencyEntity,
                destinationCurrencyEntityPda: destCurrencyEntity
            };

            console.log("Attempting exchange with params:", params);
            const result = await exchangeCurrency(params);
            
            if (result === undefined || result === null) {
                toast.error("Exchange failed: No result returned");
                return;
            }

            const transaction = VersionedTransaction.deserialize(
                Buffer.from(result, 'base64')
            );
            await handleSignAndSendTransaction(transaction);
            toast.success("Exchange transaction sent successfully!");
        } catch (error) {
            console.error("Exchange failed:", error);
            toast.error(`Exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleResetWorld = () => {
        dispatch(resetWorld());
        setWorldPdaInit("");
        toast.success("World state reset successfully");
    };

    const currencyOptions = Object.keys(CurrencyType)
        .filter(key => !isNaN(Number(CurrencyType[key as keyof typeof CurrencyType])))
        .map(key => (
            <option key={key} value={CurrencyType[key as keyof typeof CurrencyType]}>
                {key}
            </option>
        ));

    const handleSignAndSendTransaction = async (transaction: VersionedTransaction) => {
        const receipt = await signAndSend(transaction);
        toast.success(
            <div>
                <p>Transaction Signed and Sent.</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        )
    }

    useEffect(() => {
        getWorldData();
    }, [getWorldData]);

    useEffect(() => {
        if (worldData) {
            console.log("World initialization data:", worldData);
            
            // Transform currencyEntities to match the expected format
            const transformedPdas = Object.entries(worldData.currencyEntities).reduce((acc, [currency, data]) => ({
                ...acc,
                [currency]: data.pricePda
            }), {} as Record<CurrencyType, string>);
            
            setPriceComponentPdas(transformedPdas);
            
            console.log("Updated price component PDAs:", transformedPdas);
        }
    }, [worldData]);

    // Create a useEffect to check the world redux state and update the worldPdaInit state and worldData state
    useEffect(() => {
        if (worldPda) {
            setWorldPdaInit(worldPda);
        }
    }, [worldPda]);

    // Add debug logging for state updates
    useEffect(() => {
        console.log("Debug - Current States:", {
            worldPdaInit,
            worldPda,
            isWorldInitialized,
            initializedUserEntityPda,
            worldData
        });
    }, [worldPdaInit, worldPda, isWorldInitialized, initializedUserEntityPda, worldData]);

    // Add debug logging for Redux world state updates
    useEffect(() => {
        if (worldPda) {
            console.log("Debug - Redux World PDA updated:", worldPda);
            setWorldPdaInit(worldPda);
        }
    }, [worldPda]);

    // Add debug logging for user entity updates
    useEffect(() => {
        if (initWalletData?.entityPda) {
            console.log("Debug - User Entity Updated:", {
                entityPda: initWalletData.entityPda,
                walletComponentPda: initWalletData.walletComponentPda,
                priceComponentPdas: initWalletData.priceComponentPdas
            });
            setInitializedUserEntityPda(initWalletData.entityPda);
            setTransferSourceEntity(initWalletData.entityPda);
            setExchangeUserEntity(initWalletData.entityPda);
            
            toast.info(`User Entity PDA Initialized: ${initWalletData.entityPda}`);
        }
    }, [initWalletData]);

    // Add function to load owned assets
    const loadOwnedAssets = useCallback(async () => {
        if (!user?.wallet?.address || !worldPdaInit) return;
        
        try {
            console.log("Loading owned assets...");
            const assets = await fetchOwnedAssets({
                userPublicKey: user.wallet.address,
                worldPda: worldPdaInit
            });
            
            console.log(`Loaded ${assets.length} owned assets`);
            
            // If assets are found, select the first one by default
            if (assets.length > 0 && !selectedAsset) {
                setSelectedAsset(assets[0]);
            }
        } catch (error) {
            console.error("Error loading owned assets:", error);
            toast.error("Failed to load owned assets");
        }
    }, [user?.wallet?.address, worldPdaInit, fetchOwnedAssets, selectedAsset]);

    // Add effect to load owned assets when user and world are ready
    useEffect(() => {
        if (user?.wallet?.address && worldPdaInit && initializedUserEntityPda) {
            loadOwnedAssets();
        }
    }, [user?.wallet?.address, worldPdaInit, initializedUserEntityPda, loadOwnedAssets]);

    // Handler for collecting resources from an asset
    const handleCollectResources = async (asset: AssetDetails) => {
        if (!user?.wallet?.address || !asset.productionComponentPda) {
            toast.error("Cannot collect resources: Missing required components");
            return;
        }
        
        try {
            const result = await collectResources({
                worldPda: worldPdaInit,
                entityPda: asset.entityPda,
                productionComponentPda: asset.productionComponentPda,
                walletComponentPda: initializedUserEntityPda, // Using user's wallet entity
                userWalletPublicKey: user.wallet.address
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>Resources collected successfully.</p>
                        <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${result}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
                    </div>
                );
                
                // Refresh asset details
                await refreshAssetDetails(asset.entityPda);
            }
        } catch (error) {
            console.error("Error collecting resources:", error);
            toast.error(`Failed to collect resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    // Handler for toggling production status of an asset
    const handleToggleProduction = async (asset: AssetDetails, setActive: boolean) => {
        if (!user?.wallet?.address || !asset.productionComponentPda) {
            toast.error("Cannot toggle production: Missing required components");
            return;
        }
        
        try {
            const result = await toggleProduction({
                worldPda: worldPdaInit,
                entityPda: asset.entityPda,
                productionComponentPda: asset.productionComponentPda,
                setActive,
                userWalletPublicKey: user.wallet.address
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>{setActive ? 'Production started' : 'Production stopped'} successfully.</p>
                        <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${result}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
                    </div>
                );
                
                // Refresh asset details
                await refreshAssetDetails(asset.entityPda);
            }
        } catch (error) {
            console.error(`Error ${setActive ? 'starting' : 'stopping'} production:`, error);
            toast.error(`Failed to ${setActive ? 'start' : 'stop'} production: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    // Handler for upgrading an asset
    const handleUpgradeAsset = async (asset: AssetDetails) => {
        if (!user?.wallet?.address || !asset.upgradeableComponentPda || !asset.productionComponentPda) {
            toast.error("Cannot upgrade asset: Missing required components");
            return;
        }
        
        try {
            const result = await upgradeAsset({
                worldPda: worldPdaInit,
                entityPda: asset.entityPda,
                upgradeableComponentPda: asset.upgradeableComponentPda,
                walletComponentPda: initializedUserEntityPda, // Using user's wallet entity
                productionComponentPda: asset.productionComponentPda,
                userWalletPublicKey: user.wallet.address
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>Asset upgraded successfully.</p>
                        <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${result}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
                    </div>
                );
                
                // Refresh asset details
                await refreshAssetDetails(asset.entityPda);
            }
        } catch (error) {
            console.error("Error upgrading asset:", error);
            toast.error(`Failed to upgrade asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    // Handler for staking an asset
    const handleStakeAsset = async (asset: AssetDetails) => {
        if (!user?.wallet?.address || !asset.stakeableComponentPda) {
            toast.error("Cannot stake asset: Missing required components");
            return;
        }
        
        try {
            const result = await stakeAsset({
                worldPda: worldPdaInit,
                entityPda: asset.entityPda,
                stakeableComponentPda: asset.stakeableComponentPda,
                walletComponentPda: initializedUserEntityPda, // Using user's wallet entity
                userWalletPublicKey: user.wallet.address
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>Asset staked successfully.</p>
                        <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${result}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
                    </div>
                );
                
                // Refresh asset details
                await refreshAssetDetails(asset.entityPda);
            }
        } catch (error) {
            console.error("Error staking asset:", error);
            toast.error(`Failed to stake asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    // Handler for unstaking an asset
    const handleUnstakeAsset = async (asset: AssetDetails) => {
        if (!user?.wallet?.address || !asset.stakeableComponentPda) {
            toast.error("Cannot unstake asset: Missing required components");
            return;
        }
        
        try {
            const result = await unstakeAsset({
                worldPda: worldPdaInit,
                entityPda: asset.entityPda,
                stakeableComponentPda: asset.stakeableComponentPda,
                walletComponentPda: initializedUserEntityPda, // Using user's wallet entity
                userWalletPublicKey: user.wallet.address
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>Asset unstaked successfully.</p>
                        <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${result}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
                    </div>
                );
                
                // Refresh asset details
                await refreshAssetDetails(asset.entityPda);
            }
        } catch (error) {
            console.error("Error unstaking asset:", error);
            toast.error(`Failed to unstake asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    
    // Handler for collecting staking rewards
    const handleCollectStakingRewards = async (asset: AssetDetails) => {
        if (!user?.wallet?.address || !asset.stakeableComponentPda) {
            toast.error("Cannot collect staking rewards: Missing required components");
            return;
        }
        
        try {
            const result = await collectStakingRewards({
                worldPda: worldPdaInit,
                entityPda: asset.entityPda,
                stakeableComponentPda: asset.stakeableComponentPda,
                walletComponentPda: initializedUserEntityPda, // Using user's wallet entity
                userWalletPublicKey: user.wallet.address
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>Staking rewards collected successfully.</p>
                        <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${result}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
                    </div>
                );
                
                // Refresh asset details
                await refreshAssetDetails(asset.entityPda);
            }
        } catch (error) {
            console.error("Error collecting staking rewards:", error);
            toast.error(`Failed to collect staking rewards: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Update GPU purchase to use stored ownership component PDA
    const handlePurchaseGpu = async (gpuEntityPda: string) => {
        if (!user?.wallet?.address || !initializedUserEntityPda || !worldPdaInit) {
            toast.error("Cannot purchase GPU: User not initialized");
            return;
        }
        
        // Use the userEntity from the top-level hook
        if (!userEntity) {
            toast.error("User entity not found in Redux store. Try initializing your wallet again.");
            return;
        }
        
        // Find the selected GPU
        const selectedGpuEntity = availableGpus.find((gpu: GpuEntityDetails) => gpu.entityPda === gpuEntityPda);
        if (!selectedGpuEntity) {
            toast.error("GPU not found");
            return;
        }
        
        // Determine price based on GPU type
        let gpuPrice = 50000000; // Default 50 USDC
        if (selectedGpuEntity.type === "Entry GPU") {
            gpuPrice = 50000000; // 50 USDC
        } else if (selectedGpuEntity.type === "Standard GPU") {
            gpuPrice = 100000000; // 100 USDC
        } else if (selectedGpuEntity.type === "Premium GPU") {
            gpuPrice = 200000000; // 200 USDC
        }
        
        try {
            // Use the admin entity string directly from consts.ts
            const adminEntityPda = constants.ADMIN_ENTITY;
            
            // Get the price PDA for USDC from userEntity
            const usdcPricePda = userEntity.priceComponentPdas[CurrencyType.USDC];
            
            if (!usdcPricePda) {
                toast.error("USDC price component not found. Try initializing your wallet again.");
                return;
            }
            
            console.log("Purchase GPU Parameters:", {
                worldPda: worldPdaInit,
                gpuEntityPda: gpuEntityPda,
                buyerEntityPda: initializedUserEntityPda,
                adminEntityPda: adminEntityPda,
                gpuPrice: gpuPrice,
                userWalletPublicKey: user.wallet.address,
                sourcePricePda: usdcPricePda,
                ownershipComponentPda: userEntity.ownershipComponentPda
            });
            
            const result = await purchaseGpu({
                worldPda: worldPdaInit,
                gpuEntityPda: gpuEntityPda,
                buyerEntityPda: initializedUserEntityPda,
                adminEntityPda: adminEntityPda,
                gpuPrice: gpuPrice,
                userWalletPublicKey: user.wallet.address,
                sourcePricePda: usdcPricePda,
                destinationPricePda: usdcPricePda // Use the same price PDA for both source and destination
            });
            
            if (result) {
                toast.success(
                    <div>
                        <p>GPU purchased successfully!</p>
                        <a 
                            href={`https://solscan.io/tx/${result}?cluster=devnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            View transaction
                        </a>
                    </div>
                );
                
                // Give the blockchain a moment to settle
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Refresh GPU list to show the newly purchased GPU
                if (fetchWalletGpus) {
                    console.log("Refreshing GPUs after purchase");
                    fetchWalletGpus();
                }
                
                // Also refresh owned assets
                await loadOwnedAssets();
            }
        } catch (error) {
            console.error("Error purchasing GPU:", error);
            toast.error(`Failed to purchase GPU: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Add this function inside the component
    const loadWorldFromConstants = useCallback(() => {
        // Helper function to safely check if a property exists
        const hasProperty = (obj: any, prop: string): boolean => {
            return obj && prop in obj && obj[prop] !== undefined;
        };
        
        // Helper function to safely get PublicKey as string
        const getKeyString = (obj: any, prop: string): string | null => {
            if (hasProperty(obj, prop) && obj[prop] && typeof obj[prop].toString === 'function') {
                return obj[prop].toString();
            }
            return null;
        };
        
        // Check if world constants exist
        if (!hasProperty(constants, 'WORLD_ADDRESS')) {
            console.log("No world constants found in consts.ts. Please initialize a new world first.");
            toast.error("No world constants found in consts.ts. Please initialize a new world first.");
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
            
            // Set currency entities - check each one individually
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
                    console.log(`Loaded ${CurrencyType[currency.type]} entity: ${entityPda}`);
                }
            });
            
            // Set GPU entities if they exist
            const gpuEntities: GpuEntityDetails[] = [];
            
            // Define the GPU types we're looking for
            const gpuTypes = [
                { name: "Entry GPU", prefix: "ENTRY_GPU" },
                { name: "Standard GPU", prefix: "STANDARD_GPU" },
                { name: "Premium GPU", prefix: "PREMIUM_GPU" }
            ];
            
            // Check for each GPU type
            gpuTypes.forEach(gpuType => {
                const entityKey = `${gpuType.prefix}_ENTITY`;
                const ownershipKey = `${gpuType.prefix}_OWNERSHIP`;
                const productionKey = `${gpuType.prefix}_PRODUCTION`;
                const upgradeableKey = `${gpuType.prefix}_UPGRADEABLE`;
                const stakeableKey = `${gpuType.prefix}_STAKEABLE`;
                
                // Only add the GPU if the entity PDA exists
                if (hasProperty(constants, entityKey)) {
                    gpuEntities.push({
                        entityPda: getKeyString(constants, entityKey) || "",
                        ownershipPda: getKeyString(constants, ownershipKey) || "",
                        productionPda: getKeyString(constants, productionKey) || "",
                        upgradeablePda: getKeyString(constants, upgradeableKey) || "",
                        stakeablePda: getKeyString(constants, stakeableKey) || "",
                        type: gpuType.name
                    });
                    console.log(`Loaded ${gpuType.name} entity`);
                }
            });
            
            if (gpuEntities.length > 0) {
                dispatch(setGpuEntities(gpuEntities));
                console.log(`Loaded ${gpuEntities.length} GPU entities from constants`);
            }
            
            // Set world as initialized
            dispatch(setInitialized(true));
            
            setWorldPdaInit(worldAddress);
            toast.success("World loaded from constants successfully!");
            return true;
        } catch (error) {
            console.error("Error loading world from constants:", error);
            toast.error("Failed to load world from constants. You may need to initialize a new world.");
            return false;
        }
    }, [dispatch]);

    // Add this effect to run on component mount
    useEffect(() => {
        if (!isWorldInitialized) {
            // Try to load from constants first
            const loaded = loadWorldFromConstants();
            if (loaded) {
                console.log("World loaded from constants. No need to initialize a new world.");
            } else {
                console.log("No world constants found or loading failed. You'll need to initialize a new world.");
            }
        }
    }, [isWorldInitialized, loadWorldFromConstants]);

    // Update the useEffect that loads GPUs to use our new hook's data
    useEffect(() => {
        if (user?.wallet?.address && worldPdaInit && initializedUserEntityPda) {
            // The hook will automatically fetch GPUs when these dependencies change
            console.log("GPU fetching dependencies ready:", {
                wallet: user.wallet.address,
                world: worldPdaInit,
                entity: initializedUserEntityPda
            });
        }
    }, [user?.wallet?.address, worldPdaInit, initializedUserEntityPda]);

    if (!ready) return <p>Loading Privy...</p>;
    if (!authenticated) return <LoginContainer />;

    return (
        <div className="grid grid-cols-1 items-center justify-center min-h-screen py-10 px-4">
            <div className="flex flex-col items-center justify-center">
                <div className="flex flex-row items-center justify-center mb-4">
                    {user && <GasContainer />}
                    <LoginContainer />
                </div>
                {user && (
                    <div className="text-center mb-4">
                        <p className="text-sm text-muted-foreground">
                            Email: {user.email?.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Wallet: {user.wallet?.address}
                        </p>
                        {initializedUserEntityPda && <p className="text-sm text-green-500">Initialized Entity: {initializedUserEntityPda}</p>}
                    </div>
                )}

                {user && !isWorldInitialized && (
                    <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-3 text-center text-white">Initialize Game World</h2>
                        <p className="text-sm mb-3 text-gray-400">
                            You can either initialize a new world or use existing constants if you've already initialized one before.
                        </p>
                        <div className="flex flex-col space-y-2">
                            <Button 
                                className="w-full bg-purple-500 hover:bg-purple-600" 
                                onClick={handleInitializeWorld} 
                                disabled={isLoadingWorldInit}
                            >
                                {isLoadingWorldInit ? "Initializing Game World..." : "Initialize New Game World"}
                            </Button>
                            <Button 
                                className="w-full bg-blue-500 hover:bg-blue-600" 
                                onClick={loadWorldFromConstants}
                            >
                                Load World From Constants
                            </Button>
                        </div>
                        {worldInitError && (
                            <p className="mt-2 text-red-500 text-sm">{worldInitError.message}</p>
                        )}
                    </div>
                )}



                {user && isWorldInitialized && (
                    <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-3 text-center text-white">Game World Status</h2>
                        <p className="text-sm text-green-500">World Initialized: {worldPda}</p>
                        {worldData && worldData.currencyEntities && (
                            <div>
                                {Object.entries(worldData.currencyEntities).map(([currency, data]) => (
                                    <div key={currency} className="text-sm text-blue-500">
                                        <p>{CurrencyType[Number(currency)]} Entity: {data.entityPda}</p>
                                        <p>{CurrencyType[Number(currency)]} Price PDA: {data.pricePda}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button 
                            className="w-full mt-4 bg-red-500 hover:bg-red-600" 
                            onClick={handleResetWorld}
                        >
                            Reset World State
                        </Button>
                    </div>
                )}

                {user && isWorldInitialized && (
                    <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-3 text-center text-white">Initialize Game Wallet</h2>
                        <Button 
                            className="w-full bg-blue-500 hover:bg-blue-600" 
                            onClick={handleInitializeWallet} 
                            disabled={isLoadingInitWallet || !user?.wallet?.address}
                        >
                            {isLoadingInitWallet ? "Initializing..." : "Initialize Wallet"}
                        </Button>
                    </div>
                )}
            </div>
            <div className="flex flex-row items-center justify-center">
                {user && initializedUserEntityPda && (
                    <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-3 text-center text-white">Transfer Currency</h2>
                        <Input className="mb-2 text-white" value={transferSourceEntity} onChange={(e) => setTransferSourceEntity(e.target.value)} placeholder="Your Entity PDA (auto-filled if initialized)" />
                        <Input className="mb-2 text-white" value={transferDestEntity} onChange={(e) => setTransferDestEntity(e.target.value)} placeholder="Recipient Entity PDA" />
                        <select className="mb-2 w-full p-2 border rounded text-white" value={transferCurrencyType} onChange={(e) => setTransferCurrencyType(Number(e.target.value) as CurrencyType)}>
                            {currencyOptions}
                        </select>
                        <Input className="mb-2" type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Amount (e.g., 1 for 1 USDC)" />
                        <Button className="w-full bg-green-500 hover:bg-green-600" onClick={handleTransfer} disabled={isLoadingTransfer || !user?.wallet?.address || !privySignTransactionDirect}>
                            {isLoadingTransfer ? "Transferring..." : "Transfer"}
                        </Button>
                    </div>
                )}

                {user && initializedUserEntityPda && (
                    <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-3 text-center text-white">Exchange Currency</h2>
                        
                        {/* Add debug info section */}
                        <div className="mb-4 p-2 bg-gray-800 rounded text-xs">
                            <h3 className="text-white font-semibold mb-1">Debug Info:</h3>
                            <p className="text-gray-400">World PDA: {worldPdaInit}</p>
                            <p className="text-gray-400">User Entity: {exchangeUserEntity}</p>
                            <p className="text-gray-400">USDC Price PDA: {priceComponentPdas[CurrencyType.USDC] || 'Not set'}</p>
                            <p className="text-gray-400">BTC Price PDA: {priceComponentPdas[CurrencyType.BTC] || 'Not set'}</p>
                        </div>

                        <Input 
                            className="mb-2 text-white" 
                            value={exchangeUserEntity} 
                            onChange={(e) => setExchangeUserEntity(e.target.value)} 
                            placeholder="Your Entity PDA (auto-filled)" 
                        />
                        <label className="block text-sm font-medium mb-1 text-white">Source Currency</label>
                        <select 
                            className="mb-2 w-full p-2 border rounded text-white" 
                            value={exchangeSourceCurrency} 
                            onChange={(e) => setExchangeSourceCurrency(Number(e.target.value) as CurrencyType)}
                        >
                            {currencyOptions}
                        </select>
                        <Input 
                            className="mb-2 text-white" 
                            type="number" 
                            value={exchangeAmount} 
                            onChange={(e) => setExchangeAmount(e.target.value)} 
                            placeholder="Amount to Exchange" 
                        />
                        <label className="block text-sm font-medium mb-1 text-white">Destination Currency</label>
                        <select 
                            className="mb-2 w-full p-2 border rounded text-white" 
                            value={exchangeDestCurrency} 
                            onChange={(e) => setExchangeDestCurrency(Number(e.target.value) as CurrencyType)}
                        >
                            {currencyOptions}
                        </select>
                        
                        {/* Display current price component PDAs for debugging */}
                        <div className="mb-2 text-xs text-gray-400">
                            <p>Source Price PDA: {priceComponentPdas[exchangeSourceCurrency] || 'Not available'}</p>
                            <p>Destination Price PDA: {priceComponentPdas[exchangeDestCurrency] || 'Not available'}</p>
                        </div>

                        <Button 
                            className="w-full bg-purple-500 hover:bg-purple-600" 
                            onClick={handleExchange} 
                            disabled={
                                isLoadingExchange || 
                                !user?.wallet?.address || 
                                !privySignTransactionDirect ||
                                !priceComponentPdas[exchangeSourceCurrency] ||
                                !priceComponentPdas[exchangeDestCurrency]
                            }
                        >
                            {isLoadingExchange ? "Exchanging..." : "Exchange"}
                        </Button>
                    </div>
                )}
            </div>
            {user && (
                <div className="flex flex-col items-center justify-center">
                    <ScratchToReveal
                        width={550}
                        height={550}
                        minScratchPercentage={20}
                        className="flex items-center justify-center overflow-hidden rounded-2xl border-2 bg-gray-100"
                        gradientColors={["#39FF14", "#00FF00", "#333438"]}
                        overlayImage="/logo-icon.svg"
                    >
                        <TransactionRequestQR reference={reference} />
                        <BorderBeam
                            duration={4}
                            size={400}
                            className="from-white via-blue-500 to-white"
                        />
                    </ScratchToReveal>
                    <Button variant="ghost" className="w-full mt-4 bg-green-500" onClick={handleClaimWinnings}>
                        Claim Winnings
                    </Button>

                    <Button variant="ghost" className="w-full mt-4 bg-red-500" onClick={handleEmptyWallet}>
                        Empty Wallet
                    </Button>
                </div>
            )}
            {user && initializedUserEntityPda && (
                <div className="w-full max-w-4xl p-4 mb-6 border rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-3 text-center text-white">Supply Shack Inventory</h2>
                    
                    <div className="mb-4">
                        <Button 
                            className="w-full bg-blue-500 hover:bg-blue-600" 
                            onClick={loadOwnedAssets} 
                            disabled={isLoadingAssets}
                        >
                            {isLoadingAssets ? "Loading Assets..." : "Refresh Owned Assets"}
                        </Button>
                    </div>
                    
                    {assetsError && (
                        <div className="p-2 mb-4 text-red-500 bg-red-100 rounded">
                            Error loading assets: {assetsError.message}
                        </div>
                    )}
                    
                    {/* Asset List */}
                    <div className="mb-4">
                        <h3 className="text-md font-semibold mb-2 text-white">Owned Assets ({ownedAssets.length})</h3>
                        
                        {ownedAssets.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ownedAssets.map((asset) => (
                                    <div 
                                        key={asset.entityPda}
                                        className={`p-3 border rounded cursor-pointer ${selectedAsset?.entityPda === asset.entityPda ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'}`}
                                        onClick={() => setSelectedAsset(asset)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">
                                                    {asset.entityType === 1 ? 'GPU' : 
                                                     asset.entityType === 2 ? 'Data Center' : 
                                                     asset.entityType === 3 ? 'Land' : 
                                                     asset.entityType === 4 ? 'Energy Contract' : 
                                                     'Unknown Asset'}
                                                </p>
                                                <p className="text-xs text-gray-400">Level {asset.upgradeable?.currentLevel || 1}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">{asset.production?.usdcPerHour || 0} USDC/h</p>
                                                <p className="text-xs text-green-400">{asset.production?.aifiPerHour || 0} AiFi/h</p>
                                            </div>
                                        </div>
                                        <div className="mt-1 text-xs flex justify-between">
                                            <span className={asset.production?.isActive ? "text-green-400" : "text-red-400"}>
                                                {asset.production?.isActive ? "Active" : "Inactive"}
                                            </span>
                                            <span className={asset.stakeable?.isStaked ? "text-purple-400" : "text-gray-400"}>
                                                {asset.stakeable?.isStaked ? "Staked" : "Not Staked"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400">No assets found. Initialize a wallet and refresh to see your assets.</p>
                        )}
                    </div>
                    
                    {/* Asset Details */}
                    {selectedAsset && (
                        <div className="border rounded p-4">
                            <h3 className="text-lg font-semibold mb-3 text-white">Asset Details</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="border rounded p-3">
                                    <h4 className="font-semibold text-blue-400 mb-2">General Info</h4>
                                    <p className="text-sm mb-1">Entity PDA: <span className="text-gray-300">{selectedAsset.entityPda.substring(0, 8)}...{selectedAsset.entityPda.substring(selectedAsset.entityPda.length - 4)}</span></p>
                                    <p className="text-sm mb-1">Type: <span className="text-gray-300">
                                        {selectedAsset.entityType === 1 ? 'GPU' : 
                                         selectedAsset.entityType === 2 ? 'Data Center' : 
                                         selectedAsset.entityType === 3 ? 'Land' : 
                                         selectedAsset.entityType === 4 ? 'Energy Contract' : 
                                         'Unknown Asset'}
                                    </span></p>
                                </div>
                                
                                {/* Production Details */}
                                {selectedAsset.production && (
                                    <div className="border rounded p-3">
                                        <h4 className="font-semibold text-green-400 mb-2">Production</h4>
                                        <p className="text-sm mb-1">USDC/hour: <span className="text-gray-300">{selectedAsset.production.usdcPerHour}</span></p>
                                        <p className="text-sm mb-1">AiFi/hour: <span className="text-gray-300">{selectedAsset.production.aifiPerHour}</span></p>
                                        <p className="text-sm mb-1">Status: <span className={selectedAsset.production.isActive ? "text-green-400" : "text-red-400"}>
                                            {selectedAsset.production.isActive ? "Active" : "Inactive"}
                                        </span></p>
                                        <p className="text-sm mb-1">Last Collection: <span className="text-gray-300">
                                            {new Date(selectedAsset.production.lastCollectionTime * 1000).toLocaleString()}
                                        </span></p>
                                        
                                        {selectedAsset.production && selectedAsset.production.isActive && (
                                            <div className="mt-2 p-2 bg-green-900/30 rounded">
                                                <p className="text-sm font-semibold">Collectable Resources:</p>
                                                {selectedAsset.production.lastCollectionTime > 0 && (
                                                    <>
                                                        <p className="text-xs">
                                                            USDC: {calculateCollectableResources({
                                                                lastCollectionTime: selectedAsset.production.lastCollectionTime,
                                                                usdcPerHour: selectedAsset.production.usdcPerHour,
                                                                aifiPerHour: selectedAsset.production.aifiPerHour,
                                                                isActive: selectedAsset.production.isActive
                                                            }).usdc.toFixed(6)}
                                                        </p>
                                                        <p className="text-xs">
                                                            AiFi: {calculateCollectableResources({
                                                                lastCollectionTime: selectedAsset.production.lastCollectionTime,
                                                                usdcPerHour: selectedAsset.production.usdcPerHour,
                                                                aifiPerHour: selectedAsset.production.aifiPerHour,
                                                                isActive: selectedAsset.production.isActive
                                                            }).aifi.toFixed(6)}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="mt-3 flex space-x-2">
                                            <Button 
                                                size="sm"
                                                variant={selectedAsset.production.isActive ? "destructive" : "default"}
                                                className="text-xs"
                                                onClick={() => handleToggleProduction(selectedAsset, !selectedAsset.production!.isActive)}
                                                disabled={isLoadingProduction}
                                            >
                                                {selectedAsset.production.isActive ? "Stop" : "Start"} Production
                                            </Button>
                                            
                                            <Button 
                                                size="sm"
                                                className="text-xs bg-green-600 hover:bg-green-700"
                                                onClick={() => handleCollectResources(selectedAsset)}
                                                disabled={isLoadingProduction || !selectedAsset.production.isActive}
                                            >
                                                Collect Resources
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Upgrade Details */}
                                {selectedAsset.upgradeable && (
                                    <div className="border rounded p-3">
                                        <h4 className="font-semibold text-yellow-400 mb-2">Upgrade</h4>
                                        <p className="text-sm mb-1">Level: <span className="text-gray-300">{selectedAsset.upgradeable.currentLevel} / {selectedAsset.upgradeable.maxLevel}</span></p>
                                        <p className="text-sm mb-1">Next Upgrade Cost: <span className="text-gray-300">
                                            {selectedAsset.upgradeable.nextUpgradeUsdcCost} USDC + {selectedAsset.upgradeable.nextUpgradeAifiCost} AiFi
                                        </span></p>
                                        <p className="text-sm mb-1">Production Boost: <span className="text-gray-300">
                                            USDC: +{(selectedAsset.upgradeable.nextUsdcBoost / 100).toFixed(2)}%, 
                                            AiFi: +{(selectedAsset.upgradeable.nextAifiBoost / 100).toFixed(2)}%
                                        </span></p>
                                        <p className="text-sm mb-1">Last Upgrade: <span className="text-gray-300">
                                            {selectedAsset.upgradeable.lastUpgradeTime > 0 ? 
                                                new Date(selectedAsset.upgradeable.lastUpgradeTime * 1000).toLocaleString() : 
                                                "Never"}
                                        </span></p>
                                        
                                        <div className="mt-3">
                                            <Button 
                                                size="sm"
                                                className="text-xs bg-yellow-600 hover:bg-yellow-700 w-full"
                                                onClick={() => handleUpgradeAsset(selectedAsset)}
                                                disabled={
                                                    isLoadingUpgrade || 
                                                    !selectedAsset.upgradeable.canUpgrade || 
                                                    selectedAsset.upgradeable.currentLevel >= selectedAsset.upgradeable.maxLevel
                                                }
                                            >
                                                Upgrade Asset
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Staking Details */}
                                {selectedAsset.stakeable && (
                                    <div className="border rounded p-3">
                                        <h4 className="font-semibold text-purple-400 mb-2">Staking</h4>
                                        <p className="text-sm mb-1">Status: <span className={selectedAsset.stakeable.isStaked ? "text-purple-400" : "text-gray-400"}>
                                            {selectedAsset.stakeable.isStaked ? "Staked" : "Not Staked"}
                                        </span></p>
                                        
                                        {selectedAsset.stakeable.isStaked && (
                                            <>
                                                <p className="text-sm mb-1">Staking Since: <span className="text-gray-300">
                                                    {new Date(selectedAsset.stakeable.stakingStartTime * 1000).toLocaleString()}
                                                </span></p>
                                                <p className="text-sm mb-1">Min Staking Period: <span className="text-gray-300">
                                                    {Math.floor(selectedAsset.stakeable.minStakingPeriod / 86400)} days
                                                </span></p>
                                                <p className="text-sm mb-1">Reward Rate: <span className="text-gray-300">
                                                    {(selectedAsset.stakeable.rewardRate / 100).toFixed(2)}%
                                                </span></p>
                                                <p className="text-sm mb-1">Unstaking Penalty: <span className="text-gray-300">
                                                    {(selectedAsset.stakeable.unstakingPenalty / 100).toFixed(2)}%
                                                </span></p>
                                                <p className="text-sm mb-1">Accumulated Rewards: <span className="text-gray-300">
                                                    {selectedAsset.stakeable.accumulatedUsdcRewards} USDC, {selectedAsset.stakeable.accumulatedAifiRewards} AiFi
                                                </span></p>
                                            </>
                                        )}
                                        
                                        <div className="mt-3 flex space-x-2">
                                            {selectedAsset.stakeable.isStaked ? (
                                                <>
                                                    <Button 
                                                        size="sm"
                                                        variant="destructive"
                                                        className="text-xs"
                                                        onClick={() => handleUnstakeAsset(selectedAsset)}
                                                        disabled={isLoadingStaking}
                                                    >
                                                        Unstake
                                                    </Button>
                                                    
                                                    <Button 
                                                        size="sm"
                                                        className="text-xs bg-purple-600 hover:bg-purple-700"
                                                        onClick={() => handleCollectStakingRewards(selectedAsset)}
                                                        disabled={
                                                            isLoadingStaking || 
                                                            !selectedAsset.stakeable.canClaimRewards || 
                                                            selectedAsset.stakeable.accumulatedUsdcRewards <= 0 && selectedAsset.stakeable.accumulatedAifiRewards <= 0
                                                        }
                                                    >
                                                        Collect Rewards
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button 
                                                    size="sm"
                                                    className="text-xs bg-purple-600 hover:bg-purple-700 w-full"
                                                    onClick={() => handleStakeAsset(selectedAsset)}
                                                    disabled={isLoadingStaking}
                                                >
                                                    Stake Asset
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {user && initializedUserEntityPda && (
                <div className="w-full max-w-4xl p-4 mb-6 border rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-white">Your GPU Inventory</h2>
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={fetchWalletGpus}
                                disabled={isLoadingGpus}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                {isLoadingGpus ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Loading...
                                    </span>
                                ) : "Refresh"}
                            </Button>
                            <div className="text-xs text-gray-400">
                                {gpus.length} GPU{gpus.length !== 1 ? 's' : ''} found
                            </div>
                        </div>
                    </div>

                    {gpusError && (
                        <div className="text-red-500 mb-4 p-2 bg-red-100/10 rounded">
                            Error loading GPUs: {gpusError.message}
                        </div>
                    )}

                    {isLoadingGpus ? (
                        <div className="text-center py-4 text-gray-400">Loading your GPUs...</div>
                    ) : gpus.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            No GPUs found in your inventory. Purchase one from the Supply Shack Store below!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {gpus.map((gpu) => (
                                <div 
                                    key={gpu.gpuEntityPda} 
                                    className={`border rounded-lg p-4 bg-gray-800/30 ${
                                        gpu.type === "Entry GPU" ? "border-green-500" :
                                        gpu.type === "Standard GPU" ? "border-blue-500" :
                                        gpu.type === "Premium GPU" ? "border-purple-500" :
                                        "border-gray-500"
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold text-white">{gpu.type || "GPU"}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            gpu.type === "Entry GPU" ? "bg-green-900/50 text-green-400" :
                                            gpu.type === "Standard GPU" ? "bg-blue-900/50 text-blue-400" :
                                            gpu.type === "Premium GPU" ? "bg-purple-900/50 text-purple-400" :
                                            "bg-gray-700 text-gray-300"
                                        }`}>
                                            {gpu.type === "Entry GPU" ? "Entry" :
                                            gpu.type === "Standard GPU" ? "Standard" :
                                            gpu.type === "Premium GPU" ? "Premium" : "GPU"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300 mb-1">
                                        Entity: {gpu.gpuEntityPda.substring(0, 6)}...{gpu.gpuEntityPda.substring(gpu.gpuEntityPda.length - 4)}
                                    </p>
                                    <p className="text-sm text-gray-300 mb-3">
                                        Owner: {gpu.ownerEntityPda.substring(0, 6)}...{gpu.ownerEntityPda.substring(gpu.ownerEntityPda.length - 4)}
                                    </p>
                                    
                                    {/* Display enhanced details */}
                                    <div className="mt-2 bg-gray-800/50 rounded p-2">
                                        <p className="text-xs text-gray-400 mb-1">
                                            Production: {gpu.production?.usdc || 0} USDC/h, {gpu.production?.aifi || 0} AiFi/h
                                        </p>
                                        <p className="text-xs text-gray-400 mb-1">
                                            Operating Cost: {gpu.operatingCost || 0} USDC/h
                                        </p>
                                        <p className="text-xs text-gray-400 mb-1">
                                            Max Level: {gpu.maxLevel || 1}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Value: {gpu.price || 0} USDC
                                        </p>
                                    </div>
                                    
                                    {/* Display status indicators */}
                                    <div className="mt-2 flex justify-between">
                                        {gpu.currentLevel && (
                                            <span className="text-xs bg-blue-900/40 px-2 py-0.5 rounded">
                                                Level: {gpu.currentLevel}/{gpu.maxLevel}
                                            </span>
                                        )}
                                        
                                        {gpu.production?.isActive !== undefined && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                gpu.production.isActive 
                                                    ? "bg-green-900/40 text-green-400" 
                                                    : "bg-red-900/40 text-red-400"
                                            }`}>
                                                {gpu.production.isActive ? "Active" : "Inactive"}
                                            </span>
                                        )}
                                        
                                        {gpu.isStaked !== undefined && (
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                gpu.isStaked 
                                                    ? "bg-purple-900/40 text-purple-400" 
                                                    : "bg-gray-700/40 text-gray-400"
                                            }`}>
                                                {gpu.isStaked ? "Staked" : "Not Staked"}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {gpu.production?.isActive !== undefined && (
                                            <Button 
                                                size="sm"
                                                variant={gpu.production.isActive ? "destructive" : "default"}
                                                className="text-xs"
                                                onClick={() => {
                                                    toast.info(
                                                        gpu.production?.isActive 
                                                            ? "Stopping production..." 
                                                            : "Starting production..."
                                                    );
                                                }}
                                            >
                                                {gpu.production.isActive ? "Stop" : "Start"} Production
                                            </Button>
                                        )}
                                        
                                        {gpu.production?.isActive && (
                                            <Button 
                                                size="sm"
                                                className="text-xs bg-green-600 hover:bg-green-700"
                                                onClick={() => {
                                                    toast.info("Collecting resources...");
                                                }}
                                            >
                                                Collect
                                            </Button>
                                        )}
                                        
                                        {gpu.currentLevel !== undefined && gpu.currentLevel < gpu.maxLevel && (
                                            <Button 
                                                size="sm"
                                                className="text-xs bg-yellow-600 hover:bg-yellow-700"
                                                onClick={() => {
                                                    toast.info(`Upgrading to level ${gpu.currentLevel! + 1}...`);
                                                }}
                                            >
                                                Upgrade
                                            </Button>
                                        )}
                                        
                                        {gpu.isStaked !== undefined && (
                                            <Button 
                                                size="sm"
                                                className={`text-xs ${
                                                    gpu.isStaked 
                                                        ? "bg-red-600 hover:bg-red-700" 
                                                        : "bg-purple-600 hover:bg-purple-700"
                                                }`}
                                                onClick={() => {
                                                    toast.info(
                                                        gpu.isStaked 
                                                            ? "Unstaking GPU..." 
                                                            : "Staking GPU..."
                                                    );
                                                }}
                                            >
                                                {gpu.isStaked ? "Unstake" : "Stake"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {user && initializedUserEntityPda && (
                <div className="w-full max-w-4xl p-4 mb-6 border rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-3 text-center text-white">Supply Shack Store</h2>
                    
                    <div className="mb-4">
                        <p className="text-white text-sm mb-2">Available GPUs for purchase:</p>
                    </div>
                    
                    {availableGpus.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            No GPUs available. Initialize the world first to create GPU entities.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {availableGpus.map((gpu) => (
                                <div 
                                    key={gpu.entityPda}
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                        selectedGpu === gpu.entityPda ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-blue-400'
                                    }`}
                                    onClick={() => setSelectedGpu(gpu.entityPda)}
                                >
                                    <h3 className="font-semibold text-white mb-2">{gpu.type || "GPU"}</h3>
                                    <p className="text-sm text-gray-300 mb-1">Entity: {gpu.entityPda.substring(0, 6)}...{gpu.entityPda.substring(gpu.entityPda.length - 4)}</p>
                                    
                                    <div className="mt-3 bg-gray-800/50 rounded p-2">
                                        <p className="text-xs text-gray-400 mb-1">Production: {
                                            gpu.type === "Entry GPU" ? "3 USDC/h, 5 AiFi/h" :
                                            gpu.type === "Standard GPU" ? "5 USDC/h, 10 AiFi/h" :
                                            gpu.type === "Premium GPU" ? "10 USDC/h, 20 AiFi/h" :
                                            "Unknown"
                                        }</p>
                                        <p className="text-xs text-gray-400 mb-1">Operating Cost: {
                                            gpu.type === "Entry GPU" ? "1 USDC/h" :
                                            gpu.type === "Standard GPU" ? "1.5 USDC/h" :
                                            gpu.type === "Premium GPU" ? "3 USDC/h" :
                                            "Unknown"
                                        }</p>
                                        <p className="text-xs text-gray-400 mb-1">Max Level: {
                                            gpu.type === "Entry GPU" ? "3" :
                                            gpu.type === "Standard GPU" ? "4" :
                                            gpu.type === "Premium GPU" ? "5" :
                                            "Unknown"
                                        }</p>
                                        <p className="text-xs text-gray-400">Price: {
                                            gpu.type === "Entry GPU" ? "50 USDC" :
                                            gpu.type === "Standard GPU" ? "100 USDC" :
                                            gpu.type === "Premium GPU" ? "200 USDC" :
                                            "Unknown"
                                        }</p>
                                    </div>
                                    
                                    <Button
                                        className="w-full mt-3 bg-green-600 hover:bg-green-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePurchaseGpu(gpu.entityPda);
                                        }}
                                        disabled={isLoadingPurchase}
                                    >
                                        {isLoadingPurchase && selectedGpu === gpu.entityPda ? "Purchasing..." : "Purchase"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}