import { useCallback, useState } from "react";
import { useMagicBlockEngine } from "@/engine/MagicBlockEngineProvider";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useSignAndSendTransaction } from "@/hooks/useSignAndSendTransaction";
import { getUpgradeSystemOnChain } from "@/lib/constants/programIds";

export enum UpgradeOperationType {
    INITIALIZE = 0,
    UPGRADE = 1,
    UPDATE_PARAMS = 2
}

export interface UseAssetUpgradeResult {
    isLoading: boolean;
    error: Error | null;
    upgradeAsset: (params: {
        worldPda: string;
        entityPda: string;
        upgradeableComponentPda: string;
        walletComponentPda: string;
        productionComponentPda: string;
        userWalletPublicKey: string;
    }) => Promise<string | undefined>;
    canUpgrade: (params: {
        currentLevel: number;
        maxLevel: number;
        canUpgrade: boolean;
        lastUpgradeTime: number;
        upgradeCooldown: number;
        nextUpgradeUsdcCost: number;
        nextUpgradeAifiCost: number;
        userUsdcBalance: number;
        userAifiBalance: number;
    }) => { 
        canUpgrade: boolean; 
        reason?: string;
        cooldownRemaining?: number;
    };
}

export function useAssetUpgrade(): UseAssetUpgradeResult {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const engine = useMagicBlockEngine();
    const { signAndSend } = useSignAndSendTransaction();

    const upgradeAsset = useCallback(async ({
        worldPda,
        entityPda,
        upgradeableComponentPda,
        walletComponentPda,
        productionComponentPda,
        userWalletPublicKey
    }: {
        worldPda: string;
        entityPda: string;
        upgradeableComponentPda: string;
        walletComponentPda: string;
        productionComponentPda: string;
        userWalletPublicKey: string;
    }): Promise<string | undefined> => {
        setIsLoading(true);
        setError(null);
        
        try {
            const upgradeSystem = getUpgradeSystemOnChain(engine);
            
            console.log("Upgrading asset:", entityPda);
            console.log("Upgradeable component:", upgradeableComponentPda);
            console.log("Wallet component:", walletComponentPda);
            console.log("Production component:", productionComponentPda);
            
            // Generate an upgrade transaction
            const upgradeTx = await upgradeSystem.methods
                .execute({
                    operation_type: UpgradeOperationType.UPGRADE,
                    current_level: 0, // Not relevant for upgrading, read from component
                    max_level: 0, // Not relevant for upgrading, read from component
                    next_upgrade_usdc_cost: 0n, // Not relevant for upgrading, read from component
                    next_upgrade_aifi_cost: 0n, // Not relevant for upgrading, read from component
                    upgrade_cooldown: 0, // Not relevant for upgrading, read from component
                    next_usdc_boost: 0, // Not relevant for upgrading, read from component
                    next_aifi_boost: 0 // Not relevant for upgrading, read from component
                })
                .accounts({
                    upgradeable: new PublicKey(upgradeableComponentPda),
                    wallet: new PublicKey(walletComponentPda),
                    production: new PublicKey(productionComponentPda),
                    authority: new PublicKey(userWalletPublicKey)
                })
                .instruction();
                
            // Create a transaction with this instruction
            const tx = new VersionedTransaction(upgradeTx);
                
            // Sign and send the transaction
            const signature = await signAndSend(tx);
            
            console.log("Asset upgraded successfully, signature:", signature);
            setIsLoading(false);
            return signature;
            
        } catch (err) {
            console.error("Error upgrading asset:", err);
            setError(err as Error);
            setIsLoading(false);
            return undefined;
        }
    }, [engine, signAndSend]);

    const canUpgrade = useCallback(({
        currentLevel,
        maxLevel,
        canUpgrade: canUpgradeFlag,
        lastUpgradeTime,
        upgradeCooldown,
        nextUpgradeUsdcCost,
        nextUpgradeAifiCost,
        userUsdcBalance,
        userAifiBalance
    }: {
        currentLevel: number;
        maxLevel: number;
        canUpgrade: boolean;
        lastUpgradeTime: number;
        upgradeCooldown: number;
        nextUpgradeUsdcCost: number;
        nextUpgradeAifiCost: number;
        userUsdcBalance: number;
        userAifiBalance: number;
    }) => {
        // Check if already at max level
        if (currentLevel >= maxLevel) {
            return {
                canUpgrade: false,
                reason: "Already at maximum level"
            };
        }
        
        // Check if the entity is marked as not upgradeable
        if (!canUpgradeFlag) {
            return {
                canUpgrade: false,
                reason: "This asset cannot be upgraded"
            };
        }
        
        // Check cooldown period
        const now = Math.floor(Date.now() / 1000);
        const cooldownEnds = lastUpgradeTime + upgradeCooldown;
        if (now < cooldownEnds) {
            const cooldownRemaining = cooldownEnds - now;
            return {
                canUpgrade: false,
                reason: "Upgrade cooldown period not elapsed",
                cooldownRemaining
            };
        }
        
        // Check if user has enough funds
        if (userUsdcBalance < nextUpgradeUsdcCost) {
            return {
                canUpgrade: false,
                reason: `Insufficient USDC funds (need ${nextUpgradeUsdcCost}, have ${userUsdcBalance})`
            };
        }
        
        if (userAifiBalance < nextUpgradeAifiCost) {
            return {
                canUpgrade: false,
                reason: `Insufficient AiFi funds (need ${nextUpgradeAifiCost}, have ${userAifiBalance})`
            };
        }
        
        // All checks passed
        return {
            canUpgrade: true
        };
    }, []);

    return {
        isLoading,
        error,
        upgradeAsset,
        canUpgrade
    };
} 