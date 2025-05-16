import { useCallback, useState } from "react";
import { purchaseGpu as purchaseGpuAction } from "@/app/actions/purchaseGpu";
import { useGetWalletGpus } from "./useGetWalletGpus";

export interface UsePurchaseGpuResult {
    isLoading: boolean;
    error: Error | null;
    purchaseGpu: (params: {
        worldPda: string;
        gpuEntityPda: string;
        buyerEntityPda: string;
        adminEntityPda: string;
        gpuPrice: number;
        userWalletPublicKey: string;
        sourcePricePda: string;
        destinationPricePda?: string;
    }) => Promise<string | undefined>;
}

export function usePurchaseGpu(): UsePurchaseGpuResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { fetchWalletGpus } = useGetWalletGpus();

    const purchaseGpu = useCallback(async (params: {
        worldPda: string;
        gpuEntityPda: string;
        buyerEntityPda: string;
        adminEntityPda: string;
        gpuPrice: number;
        userWalletPublicKey: string;
        sourcePricePda: string;
        destinationPricePda?: string;
    }) => {
        try {
            setIsLoading(true);
            setError(null);

            // Call the server action to handle the purchase
            const signature = await purchaseGpuAction(params);
            
            // After successful purchase, fetch updated GPU inventory
            await fetchWalletGpus({
                worldPda: params.worldPda,
                playerEntityPda: params.buyerEntityPda
            });

            return signature;
        } catch (error) {
            console.error("Error in usePurchaseGpu:", error);
            setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [fetchWalletGpus]);

    return {
        isLoading,
        error,
        purchaseGpu,
    };
} 