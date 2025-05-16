import { useCallback, useState } from "react";
import { useMagicBlockEngine } from "@/engine/MagicBlockEngineProvider";
import { PublicKey, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { useSignAndSendTransaction } from "@/hooks/useSignAndSendTransaction";
import { getResourceProductionSystemOnChain } from "@/lib/constants/programIds";

export enum ProductionOperationType {
    INITIALIZE = 0,
    COLLECT = 1,
    SET_ACTIVE = 2,
    UPDATE_RATES = 3
}

export interface UseAssetProductionResult {
    isLoading: boolean;
    error: Error | null;
    collectResources: (params: {
        entityPda: string;
        productionComponentPda: string;
        walletComponentPda: string;
        userWalletPublicKey: string;
    }) => Promise<string | undefined>;
    toggleProduction: (params: {
        entityPda: string;
        productionComponentPda: string;
        setActive: boolean;
        userWalletPublicKey: string;
    }) => Promise<string | undefined>;
    calculateCollectableResources: (params: {
        lastCollectionTime: number;
        usdcPerHour: number;
        aifiPerHour: number;
        isActive: boolean;
    }) => { usdc: number; aifi: number };
}

export function useAssetProduction(): UseAssetProductionResult {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const engine = useMagicBlockEngine();
    const { signAndSend } = useSignAndSendTransaction();

    const collectResources = useCallback(async ({
        entityPda,
        productionComponentPda,
        walletComponentPda,
        userWalletPublicKey
    }: {
        entityPda: string;
        productionComponentPda: string;
        walletComponentPda: string;
        userWalletPublicKey: string;
    }): Promise<string | undefined> => {
        setIsLoading(true);
        setError(null);
        
        try {
            const resourceProductionSystem = getResourceProductionSystemOnChain(engine);
            
            console.log("Collecting resources for entity:", entityPda);
            console.log("Production component:", productionComponentPda);
            console.log("Wallet component:", walletComponentPda);
            
            // Create args buffer for the operation
            const args = Buffer.from([
                ProductionOperationType.COLLECT, // operation_type
                0, // set_active (false)
                0, 0, 0, 0, 0, 0, 0, 0, // usdc_per_hour (u64 - 0)
                0, 0, 0, 0, 0, 0, 0, 0, // aifi_per_hour (u64 - 0)
                0, 0, 0, 0, 0, 0, 0, 0  // operating_cost (u64 - 0)
            ]);
            
            // Generate a collect resources transaction
            const collectIx = await resourceProductionSystem.methods
                .execute(args)
                .accounts({
                    production: new PublicKey(productionComponentPda),
                    wallet: new PublicKey(walletComponentPda),
                    authority: new PublicKey(userWalletPublicKey)
                })
                .instruction();
                
            // Create a versioned transaction with this instruction
            const messageV0 = new TransactionMessage({
                payerKey: new PublicKey(userWalletPublicKey),
                recentBlockhash: (await engine.getConnectionChain().getLatestBlockhash()).blockhash,
                instructions: [collectIx]
            }).compileToV0Message();
            
            const tx = new VersionedTransaction(messageV0);
                
            // Sign and send the transaction
            const signature = await signAndSend(tx);
            
            console.log("Resources collected successfully, signature:", signature);
            setIsLoading(false);
            return signature;
            
        } catch (err) {
            console.error("Error collecting resources:", err);
            setError(err as Error);
            setIsLoading(false);
            return undefined;
        }
    }, [engine, signAndSend]);

    const toggleProduction = useCallback(async ({
        entityPda,
        productionComponentPda,
        setActive,
        userWalletPublicKey
    }: {
        entityPda: string;
        productionComponentPda: string;
        setActive: boolean;
        userWalletPublicKey: string;
    }): Promise<string | undefined> => {
        setIsLoading(true);
        setError(null);
        
        try {
            const resourceProductionSystem = getResourceProductionSystemOnChain(engine);
            
            console.log(`${setActive ? 'Starting' : 'Stopping'} production for entity:`, entityPda);
            console.log("Production component:", productionComponentPda);
            
            // Create args buffer for the operation
            const args = Buffer.from([
                ProductionOperationType.SET_ACTIVE, // operation_type
                setActive ? 1 : 0, // set_active (boolean)
                0, 0, 0, 0, 0, 0, 0, 0, // usdc_per_hour (u64 - 0)
                0, 0, 0, 0, 0, 0, 0, 0, // aifi_per_hour (u64 - 0)
                0, 0, 0, 0, 0, 0, 0, 0  // operating_cost (u64 - 0)
            ]);
            
            // Generate a toggle production transaction
            const toggleIx = await resourceProductionSystem.methods
                .execute(args)
                .accounts({
                    production: new PublicKey(productionComponentPda),
                    wallet: new PublicKey(productionComponentPda), // This is a dummy value, not used for SET_ACTIVE
                    authority: new PublicKey(userWalletPublicKey)
                })
                .instruction();
                
            // Create a versioned transaction with this instruction
            const messageV0 = new TransactionMessage({
                payerKey: new PublicKey(userWalletPublicKey),
                recentBlockhash: (await engine.getConnectionChain().getLatestBlockhash()).blockhash,
                instructions: [toggleIx]
            }).compileToV0Message();
            
            const tx = new VersionedTransaction(messageV0);
                
            // Sign and send the transaction
            const signature = await signAndSend(tx);
            
            console.log(`Production ${setActive ? 'started' : 'stopped'} successfully, signature:`, signature);
            setIsLoading(false);
            return signature;
            
        } catch (err) {
            console.error(`Error ${setActive ? 'starting' : 'stopping'} production:`, err);
            setError(err as Error);
            setIsLoading(false);
            return undefined;
        }
    }, [engine, signAndSend]);

    const calculateCollectableResources = useCallback(({
        lastCollectionTime,
        usdcPerHour,
        aifiPerHour,
        isActive
    }: {
        lastCollectionTime: number;
        usdcPerHour: number;
        aifiPerHour: number;
        isActive: boolean;
    }) => {
        if (!isActive) return { usdc: 0, aifi: 0 };
        
        // Calculate time passed since last collection in hours
        const now = Math.floor(Date.now() / 1000);
        const hoursPassed = (now - lastCollectionTime) / 3600;
        
        // Calculate collectable resources
        const usdc = usdcPerHour * hoursPassed;
        const aifi = aifiPerHour * hoursPassed;
        
        return { usdc, aifi };
    }, []);

    return {
        isLoading,
        error,
        collectResources,
        toggleProduction,
        calculateCollectableResources
    };
} 