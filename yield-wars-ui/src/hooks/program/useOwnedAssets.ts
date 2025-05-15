import { useCallback, useState } from "react";
import { useMagicBlockEngine } from "@/engine/MagicBlockEngineProvider";
import { Connection, PublicKey } from "@solana/web3.js";
import { FindComponentPda, FindEntityPda, EntityPda } from "@magicblock-labs/bolt-sdk";
import { 
    componentOwnership, 
    getComponentOwnershipOnChain,
    getComponentProductionOnChain,
    getComponentUpgradeableOnChain,
    getComponentStakeableOnChain
} from "@/lib/constants/programIds";
import { EntityType } from "@/lib/constants/programEnums";

export interface AssetDetails {
    entityPda: string;
    entityType: EntityType;
    ownershipComponentPda?: string;
    productionComponentPda?: string;
    upgradeableComponentPda?: string;
    stakeableComponentPda?: string;
    // Additional details that will be filled when fetching specific info
    production?: {
        usdcPerHour: number;
        aifiPerHour: number;
        lastCollectionTime: number;
        isActive: boolean;
        level: number;
    };
    upgradeable?: {
        currentLevel: number;
        maxLevel: number;
        nextUpgradeUsdcCost: number;
        nextUpgradeAifiCost: number;
        canUpgrade: boolean;
        upgradeCooldown: number;
        nextUsdcBoost: number;
        nextAifiBoost: number;
        lastUpgradeTime: number;
    };
    stakeable?: {
        isStaked: boolean;
        stakingStartTime: number;
        minStakingPeriod: number;
        rewardRate: number;
        unstakingPenalty: number;
        accumulatedUsdcRewards: number;
        accumulatedAifiRewards: number;
        lastClaimTime: number;
        canClaimRewards: boolean;
    };
}

export interface UseOwnedAssetsResult {
    ownedAssets: AssetDetails[];
    isLoading: boolean;
    error: Error | null;
    fetchOwnedAssets: (params: { userPublicKey: string; worldPda: string }) => Promise<AssetDetails[]>;
    refreshAssetDetails: (entityPda: string) => Promise<AssetDetails | undefined>;
}

export function useOwnedAssets(): UseOwnedAssetsResult {
    const [ownedAssets, setOwnedAssets] = useState<AssetDetails[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const engine = useMagicBlockEngine();

    const fetchOwnedAssets = useCallback(async ({ 
        userPublicKey, 
        worldPda 
    }: { 
        userPublicKey: string; 
        worldPda: string 
    }): Promise<AssetDetails[]> => {
        setIsLoading(true);
        setError(null);
        
        try {
            const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
            const assets: AssetDetails[] = [];
            
            console.log("Fetching owned assets for user:", userPublicKey);
            
            // We need to find the user's entity first
            const world = await connection.getAccountInfo(new PublicKey(worldPda));
            if (!world) {
                throw new Error("World not found");
            }
            
            // Search all entities in the world to find the user's entity and the assets they own
            const worldObj = await connection.getAccountInfo(new PublicKey(worldPda));
            if (!worldObj) {
                throw new Error("World not found");
            }
            
            // Find all entities in the world
            const worldData = await connection.getProgramAccounts(
                new PublicKey("Ape6hhPWHWZCCaQ5HpVXgWdFFSwRSXfUTYfN4XtLkhH3")
            );
            
            console.log(`Found ${worldData.length} entities in total`);
            
            // For each entity check if it's owned by the user
            for (const { pubkey, account } of worldData) {
                try {
                    // Find ownership component for this entity
                    const ownershipPda = FindComponentPda({
                        componentId: new PublicKey(componentOwnership.address),
                        entity: pubkey,
                    });
                    
                    const ownershipInfo = await connection.getAccountInfo(ownershipPda);
                    if (!ownershipInfo) continue;
                    
                    const ownershipCoder = getComponentOwnershipOnChain(engine).coder;
                    const ownership = ownershipCoder.accounts.decode("ownership", ownershipInfo.data);
                    
                    // Check if the user owns this entity
                    const isEntityOwnedByUser = 
                        (ownership.owner_entity && ownership.owner_entity.toBase58() === userPublicKey) || 
                        (ownership.owned_entities && ownership.owned_entities.some(e => e.toBase58() === userPublicKey));

                    // Only collect productive assets like GPUs
                    if (isEntityOwnedByUser && 
                        ownership.entity_type !== undefined && 
                        ownership.entity_type !== EntityType.Player) {
                        
                        // Found an asset owned by the user
                        const asset: AssetDetails = {
                            entityPda: pubkey.toBase58(),
                            entityType: ownership.entity_type as EntityType,
                            ownershipComponentPda: ownershipPda.toBase58(),
                        };
                        
                        // Find the Production component if it exists
                        try {
                            const productionComponentPda = FindComponentPda({
                                componentId: new PublicKey("9RFGZVYBgUG2Veumtj2W4JVeqbRaTsFwkCR5x4mffZbF"), // Production component ID
                                entity: pubkey,
                            });
                            const productionInfo = await connection.getAccountInfo(productionComponentPda);
                            if (productionInfo) {
                                asset.productionComponentPda = productionComponentPda.toBase58();
                                
                                // Try to decode the production data
                                const productionCoder = getComponentProductionOnChain(engine).coder;
                                const production = productionCoder.accounts.decode("production", productionInfo.data);
                                
                                asset.production = {
                                    usdcPerHour: Number(production.usdc_per_hour) / 10**6,
                                    aifiPerHour: Number(production.aifi_per_hour) / 10**6,
                                    lastCollectionTime: Number(production.last_collection_time),
                                    isActive: production.is_active,
                                    level: production.level,
                                };
                            }
                        } catch (e) {
                            console.warn("Error fetching production component:", e);
                        }
                        
                        // Find the Upgradeable component if it exists
                        try {
                            const upgradeableComponentPda = FindComponentPda({
                                componentId: new PublicKey("CKctCZqRNwEhZcigRxzvpkcXZ7GMp7EfJLL6YiZQerVk"), // Upgradeable component ID
                                entity: pubkey,
                            });
                            const upgradeableInfo = await connection.getAccountInfo(upgradeableComponentPda);
                            if (upgradeableInfo) {
                                asset.upgradeableComponentPda = upgradeableComponentPda.toBase58();
                                
                                // Try to decode the upgradeable data
                                const upgradeableCoder = getComponentUpgradeableOnChain(engine).coder;
                                const upgradeable = upgradeableCoder.accounts.decode("upgradeable", upgradeableInfo.data);
                                
                                asset.upgradeable = {
                                    currentLevel: upgradeable.current_level,
                                    maxLevel: upgradeable.max_level,
                                    nextUpgradeUsdcCost: Number(upgradeable.next_upgrade_usdc_cost) / 10**6,
                                    nextUpgradeAifiCost: Number(upgradeable.next_upgrade_aifi_cost) / 10**6,
                                    canUpgrade: upgradeable.can_upgrade,
                                    upgradeCooldown: upgradeable.upgrade_cooldown,
                                    nextUsdcBoost: upgradeable.next_usdc_boost,
                                    nextAifiBoost: upgradeable.next_aifi_boost,
                                    lastUpgradeTime: Number(upgradeable.last_upgrade_time),
                                };
                            }
                        } catch (e) {
                            console.warn("Error fetching upgradeable component:", e);
                        }
                        
                        // Find the Stakeable component if it exists
                        try {
                            const stakeableComponentPda = FindComponentPda({
                                componentId: new PublicKey("28PWLf6xJatvEZywjSLaJ6SnkRbGsk95QqiYjc3Bnk4k"), // Stakeable component ID
                                entity: pubkey,
                            });
                            const stakeableInfo = await connection.getAccountInfo(stakeableComponentPda);
                            if (stakeableInfo) {
                                asset.stakeableComponentPda = stakeableComponentPda.toBase58();
                                
                                // Try to decode the stakeable data
                                const stakeableCoder = getComponentStakeableOnChain(engine).coder;
                                const stakeable = stakeableCoder.accounts.decode("stakeable", stakeableInfo.data);
                                
                                asset.stakeable = {
                                    isStaked: stakeable.is_staked,
                                    stakingStartTime: Number(stakeable.staking_start_time),
                                    minStakingPeriod: stakeable.min_staking_period,
                                    rewardRate: stakeable.reward_rate,
                                    unstakingPenalty: stakeable.unstaking_penalty,
                                    accumulatedUsdcRewards: Number(stakeable.accumulated_usdc_rewards) / 10**6,
                                    accumulatedAifiRewards: Number(stakeable.accumulated_aifi_rewards) / 10**6,
                                    lastClaimTime: Number(stakeable.last_claim_time),
                                    canClaimRewards: stakeable.can_claim_rewards,
                                };
                            }
                        } catch (e) {
                            console.warn("Error fetching stakeable component:", e);
                        }
                        
                        assets.push(asset);
                    }
                } catch (e) {
                    console.warn("Error processing entity:", e);
                }
            }
            
            console.log(`Found ${assets.length} assets owned by the user`);
            setOwnedAssets(assets);
            setIsLoading(false);
            return assets;
            
        } catch (err) {
            console.error("Error fetching owned assets:", err);
            setError(err as Error);
            setIsLoading(false);
            return [];
        }
    }, [engine]);

    const refreshAssetDetails = useCallback(async (entityPda: string): Promise<AssetDetails | undefined> => {
        try {
            const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
            const entity = new PublicKey(entityPda);
            
            // Find existing asset in the list
            const existingAssetIndex = ownedAssets.findIndex(asset => asset.entityPda === entityPda);
            if (existingAssetIndex === -1) return undefined;
            
            const updatedAsset = { ...ownedAssets[existingAssetIndex] };
            
            // Refresh Production data if available
            if (updatedAsset.productionComponentPda) {
                try {
                    const productionComponentPda = new PublicKey(updatedAsset.productionComponentPda);
                    const productionInfo = await connection.getAccountInfo(productionComponentPda);
                    if (productionInfo) {
                        const productionCoder = getComponentProductionOnChain(engine).coder;
                        const production = productionCoder.accounts.decode("production", productionInfo.data);
                        
                        updatedAsset.production = {
                            usdcPerHour: Number(production.usdc_per_hour) / 10**6,
                            aifiPerHour: Number(production.aifi_per_hour) / 10**6,
                            lastCollectionTime: Number(production.last_collection_time),
                            isActive: production.is_active,
                            level: production.level,
                        };
                    }
                } catch (e) {
                    console.warn("Error refreshing production component:", e);
                }
            }
            
            // Refresh Upgradeable data if available
            if (updatedAsset.upgradeableComponentPda) {
                try {
                    const upgradeableComponentPda = new PublicKey(updatedAsset.upgradeableComponentPda);
                    const upgradeableInfo = await connection.getAccountInfo(upgradeableComponentPda);
                    if (upgradeableInfo) {
                        const upgradeableCoder = getComponentUpgradeableOnChain(engine).coder;
                        const upgradeable = upgradeableCoder.accounts.decode("upgradeable", upgradeableInfo.data);
                        
                        updatedAsset.upgradeable = {
                            currentLevel: upgradeable.current_level,
                            maxLevel: upgradeable.max_level,
                            nextUpgradeUsdcCost: Number(upgradeable.next_upgrade_usdc_cost) / 10**6,
                            nextUpgradeAifiCost: Number(upgradeable.next_upgrade_aifi_cost) / 10**6,
                            canUpgrade: upgradeable.can_upgrade,
                            upgradeCooldown: upgradeable.upgrade_cooldown,
                            nextUsdcBoost: upgradeable.next_usdc_boost,
                            nextAifiBoost: upgradeable.next_aifi_boost,
                            lastUpgradeTime: Number(upgradeable.last_upgrade_time),
                        };
                    }
                } catch (e) {
                    console.warn("Error refreshing upgradeable component:", e);
                }
            }
            
            // Refresh Stakeable data if available
            if (updatedAsset.stakeableComponentPda) {
                try {
                    const stakeableComponentPda = new PublicKey(updatedAsset.stakeableComponentPda);
                    const stakeableInfo = await connection.getAccountInfo(stakeableComponentPda);
                    if (stakeableInfo) {
                        const stakeableCoder = getComponentStakeableOnChain(engine).coder;
                        const stakeable = stakeableCoder.accounts.decode("stakeable", stakeableInfo.data);
                        
                        updatedAsset.stakeable = {
                            isStaked: stakeable.is_staked,
                            stakingStartTime: Number(stakeable.staking_start_time),
                            minStakingPeriod: stakeable.min_staking_period,
                            rewardRate: stakeable.reward_rate,
                            unstakingPenalty: stakeable.unstaking_penalty,
                            accumulatedUsdcRewards: Number(stakeable.accumulated_usdc_rewards) / 10**6,
                            accumulatedAifiRewards: Number(stakeable.accumulated_aifi_rewards) / 10**6,
                            lastClaimTime: Number(stakeable.last_claim_time),
                            canClaimRewards: stakeable.can_claim_rewards,
                        };
                    }
                } catch (e) {
                    console.warn("Error refreshing stakeable component:", e);
                }
            }
            
            // Update the asset in the list
            const updatedAssets = [...ownedAssets];
            updatedAssets[existingAssetIndex] = updatedAsset;
            setOwnedAssets(updatedAssets);
            
            return updatedAsset;
        } catch (err) {
            console.error("Error refreshing asset details:", err);
            return undefined;
        }
    }, [ownedAssets, engine]);

    return {
        ownedAssets,
        isLoading,
        error,
        fetchOwnedAssets,
        refreshAssetDetails
    };
} 