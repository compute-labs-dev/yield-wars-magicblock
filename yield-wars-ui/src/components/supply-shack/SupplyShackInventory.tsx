import { User } from "@privy-io/react-auth";
import { useWalletGpus, EnhancedGpuOwnership } from "@/hooks/useWalletGpus";
import { GpuCard, GPU } from "./GpuCard";
import { useAssetProduction } from "@/hooks/program/useAssetProduction";
import { useAssetUpgrade } from "@/hooks/program/useAssetUpgrade";
import { useAssetStaking } from "@/hooks/program/useAssetStaking";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useSelector, useDispatch } from "react-redux";
import { selectUserEntity } from "@/stores/features/userEntityStore";
import { 
    selectIsWorldInitialized, 
    selectWorldPda, 
    setWorldPda,
    setGpuEntities,
    setInitialized,
    GpuEntityDetails,
    selectCachedGpus,
    setCachedGpus 
} from "@/stores/features/worldStore";
import * as constants from '@/lib/consts';
import { useEffect, useCallback, useMemo, memo } from "react";
import type { RootState } from "@/stores/store";

interface SupplyShackInventoryProps {
    user: User | null;
}

export const SupplyShackInventory = memo(function SupplyShackInventory({ user }: SupplyShackInventoryProps) {
    const dispatch = useDispatch();
    const isWorldInitialized = useSelector(selectIsWorldInitialized);
    const worldPda = useSelector(selectWorldPda);
    const cachedGpus = useSelector(selectCachedGpus) as EnhancedGpuOwnership[];

    const userEntity = useSelector((state: RootState) => 
        user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
    );

    const { 
        gpus, 
        isLoading: isLoadingGpus, 
        error: gpusError, 
        fetchWalletGpus 
    } = useWalletGpus(userEntity?.entityPda || "");

    const { 
        collectResources, 
        toggleProduction, 
        isLoading: isLoadingProduction 
    } = useAssetProduction();

    const { 
        upgradeAsset, 
        isLoading: isLoadingUpgrade 
    } = useAssetUpgrade();

    const { 
        stakeAsset, 
        unstakeAsset, 
        collectStakingRewards,
        isLoading: isLoadingStaking 
    } = useAssetStaking();

    // Move useMemo hooks to the top, before any conditional returns
    const displayGpus = useMemo(() => 
        cachedGpus.length > 0 ? cachedGpus : gpus
    , [cachedGpus, gpus]);

    const isLoading = isLoadingGpus && displayGpus.length === 0;

    // Memoize loadWorldFromConstants
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
        
        try {
            console.log("Loading world from constants...");
            
            const worldAddress = getKeyString(constants, 'WORLD_ADDRESS');
            if (!worldAddress) {
                throw new Error("WORLD_ADDRESS is invalid");
            }
            
            // Set world PDA
            dispatch(setWorldPda(worldAddress));
            
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
                
                if (hasProperty(constants, entityKey)) {
                    gpuEntities.push({
                        entityPda: getKeyString(constants, entityKey) || "",
                        ownershipPda: getKeyString(constants, ownershipKey) || "",
                        productionPda: getKeyString(constants, productionKey) || "",
                        upgradeablePda: getKeyString(constants, upgradeableKey) || "",
                        stakeablePda: getKeyString(constants, stakeableKey) || "",
                        walletComponentPda: "",
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
            
            console.log("World loaded from constants successfully!");
            return true;
        } catch (error) {
            console.error("Error loading world from constants:", error);
            toast.error("Failed to load world from constants");
            return false;
        }
    }, [dispatch]);

    // Initialize world from constants if needed
    useEffect(() => {
        if (!isWorldInitialized || !worldPda) {
            console.log("World not initialized, loading from constants...");
            loadWorldFromConstants();
        }
    }, [isWorldInitialized, worldPda, loadWorldFromConstants]);

    // Load GPUs on mount and when user entity changes, with improved caching
    useEffect(() => {
        let isMounted = true;

        const loadGpus = async () => {
            if (user?.wallet?.address && userEntity?.entityPda) {
                if (cachedGpus.length === 0) {
                    console.log("Loading user's GPUs...");
                    await fetchWalletGpus();
                    if (isMounted) {
                        dispatch(setCachedGpus(gpus));
                    }
                } else {
                    console.log("Using cached GPUs data");
                }
            }
        };

        loadGpus();

        return () => {
            isMounted = false;
        };
    }, [user?.wallet?.address, userEntity?.entityPda, fetchWalletGpus, cachedGpus.length, dispatch, gpus]);

    // Memoize handlers
    const handlers = useMemo(() => ({
        handleToggleProduction: async (gpu: GPU, setActive: boolean) => {
            if (!user?.wallet?.address) {
                toast.error("Please connect your wallet first");
                return;
            }

            try {
                const signature = await toggleProduction({
                    entityPda: gpu.entityPda,
                    productionComponentPda: gpu.productionPda,
                    setActive,
                    userWalletPublicKey: user.wallet.address
                });
                
                if (signature) {
                    toast.success(`Production ${setActive ? 'started' : 'stopped'} successfully!`);
                    await fetchWalletGpus();
                    dispatch(setCachedGpus(gpus));
                }
            } catch (err) {
                console.error(`Error ${setActive ? 'starting' : 'stopping'} production:`, err);
                toast.error(`Failed to ${setActive ? 'start' : 'stop'} production`);
            }
        },

        handleCollectResources: async (gpu: GPU) => {
            if (!user?.wallet?.address) {
                toast.error("Please connect your wallet first");
                return;
            }

            try {
                const signature = await collectResources({
                    entityPda: gpu.entityPda,
                    productionComponentPda: gpu.productionPda,
                    walletComponentPda: gpu.walletComponentPda,
                    userWalletPublicKey: user.wallet.address
                });
                
                if (signature) {
                    toast.success("Resources collected successfully!");
                    await fetchWalletGpus();
                    dispatch(setCachedGpus(gpus));
                }
            } catch (err) {
                console.error("Error collecting resources:", err);
                toast.error("Failed to collect resources");
            }
        },

        handleUpgrade: async (gpu: GPU) => {
            if (!user?.wallet?.address) {
                toast.error("Please connect your wallet first");
                return;
            }

            try {
                // Get WORLD_ADDRESS once at the start of the function
                const worldAddress = constants.WORLD_ADDRESS.toBase58();
                const signature = await upgradeAsset({
                    worldPda: worldAddress,
                    entityPda: gpu.entityPda,
                    upgradeableComponentPda: gpu.upgradeablePda,
                    walletComponentPda: gpu.walletComponentPda,
                    productionComponentPda: gpu.productionPda,
                    userWalletPublicKey: user.wallet.address
                });
                
                if (signature) {
                    toast.success("Asset upgraded successfully!");
                    await fetchWalletGpus();
                }
            } catch (err) {
                console.error("Error upgrading asset:", err);
                toast.error("Failed to upgrade asset");
            }
        },

        handleStake: async (gpu: GPU) => {
            try {
                const signature = await stakeAsset({
                    entityPda: gpu.entityPda,
                    stakeableComponentPda: gpu.stakeablePda,
                    walletComponentPda: gpu.walletComponentPda
                });
                
                if (signature) {
                    toast.success("Asset staked successfully!");
                    await fetchWalletGpus();
                }
            } catch (err) {
                console.error("Error staking asset:", err);
                toast.error("Failed to stake asset");
            }
        },

        handleUnstake: async (gpu: GPU) => {
            try {
                const signature = await unstakeAsset({
                    entityPda: gpu.entityPda,
                    stakeableComponentPda: gpu.stakeablePda,
                    walletComponentPda: gpu.walletComponentPda
                });
                
                if (signature) {
                    toast.success("Asset unstaked successfully!");
                    await fetchWalletGpus();
                }
            } catch (err) {
                console.error("Error unstaking asset:", err);
                toast.error("Failed to unstake asset");
            }
        },

        handleCollectStakingRewards: async (gpu: GPU) => {
            try {
                const signature = await collectStakingRewards({
                    entityPda: gpu.entityPda,
                    stakeableComponentPda: gpu.stakeablePda,
                    walletComponentPda: gpu.walletComponentPda
                });
                
                if (signature) {
                    toast.success("Staking rewards collected successfully!");
                    await fetchWalletGpus();
                }
            } catch (err) {
                console.error("Error collecting staking rewards:", err);
                toast.error("Failed to collect staking rewards");
            }
        }
    }), [
        user?.wallet?.address,
        toggleProduction,
        collectResources,
        upgradeAsset,
        stakeAsset,
        unstakeAsset,
        collectStakingRewards,
        fetchWalletGpus,
        dispatch,
        gpus
    ]);

    if (!user?.wallet?.address) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400">Please connect your wallet to view your GPU inventory.</p>
            </div>
        );
    }

    if (!userEntity?.entityPda) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Please initialize your wallet to view your GPU inventory.</p>
                <Button>Initialize Wallet</Button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Your GPU Inventory</h2>
                <div className="flex items-center space-x-4">
                    <p className="text-sm text-gray-400">
                        {displayGpus.length} GPU{displayGpus.length !== 1 ? 's' : ''} owned
                    </p>
                    <Button
                        variant="outline"
                        onClick={async () => {
                            await fetchWalletGpus();
                            dispatch(setCachedGpus(gpus));
                        }}
                        disabled={isLoadingGpus}
                        className="bg-transparent"
                    >
                        {isLoadingGpus ? "Refreshing..." : "Refresh"}
                    </Button>
                </div>
            </div>

            {gpusError && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
                    <p className="text-red-400">Error loading GPUs: {gpusError.message}</p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">Loading your GPUs...</p>
                </div>
            ) : displayGpus.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">{`You don't own any GPUs yet. Visit the store to purchase one!`}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayGpus.map((enhancedGpu) => {
                        // Map EnhancedGpuOwnership to GPU type
                        const gpu: GPU = {
                            entityPda: enhancedGpu.gpuEntityPda,
                            type: enhancedGpu.type,
                            maxLevel: enhancedGpu.maxLevel,
                            currentLevel: enhancedGpu.currentLevel,
                            production: {
                                isActive: enhancedGpu.production.isActive || false,
                                resourcesAvailable: 0, // This needs to be calculated
                                usdc: enhancedGpu.production.usdc,
                                aifi: enhancedGpu.production.aifi
                            },
                            isStaked: enhancedGpu.isStaked,
                            ownershipPda: enhancedGpu.ownerEntityPda,
                            productionPda: enhancedGpu.productionPda || "",
                            upgradeablePda: enhancedGpu.upgradeablePda || "",
                            stakeablePda: enhancedGpu.stakeablePda || "",
                            walletComponentPda: enhancedGpu.gpuEntityPda,
                            price: enhancedGpu.price,
                            operatingCost: enhancedGpu.operatingCost,
                            location: undefined // Optional field
                        };

                        return (
                            <GpuCard
                                key={enhancedGpu.gpuEntityPda}
                                gpu={gpu}
                                mode="inventory"
                                onToggleProduction={handlers.handleToggleProduction}
                                onCollectResources={handlers.handleCollectResources}
                                onUpgrade={handlers.handleUpgrade}
                                onStake={handlers.handleStake}
                                onUnstake={handlers.handleUnstake}
                                onCollectStakingRewards={handlers.handleCollectStakingRewards}
                                isLoading={isLoadingProduction || isLoadingUpgrade || isLoadingStaking}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}); 