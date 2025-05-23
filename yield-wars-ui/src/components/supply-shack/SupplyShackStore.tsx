import { User } from "@privy-io/react-auth";
import { useSelector } from "react-redux";
import { selectGpuEntities, selectIsWorldInitialized } from "@/stores/features/worldStore";
import { GpuCard } from "./GpuCard";
import { usePurchaseGpu } from "@/hooks/program/usePurchaseGpu";
import { toast } from "sonner";
import { selectUserEntity } from "@/stores/features/userEntityStore";
import { CurrencyType } from "@/lib/constants/programEnums";
import * as constants from '@/lib/consts';
import { Button } from "@/components/ui/Button";
import type { RootState } from "@/stores/store";
import { useEffect, useState } from "react";

interface SupplyShackStoreProps {
    user: User | null;
}

export function SupplyShackStore({ user }: SupplyShackStoreProps) {
    const availableGpus = useSelector(selectGpuEntities);
    const isWorldInitialized = useSelector(selectIsWorldInitialized);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const { purchaseGpu, isLoading } = usePurchaseGpu();
    const userEntity = useSelector((state: RootState) => 
        user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
    );

    // Debug info
    useEffect(() => {
        console.log("SupplyShackStore - Available GPUs:", availableGpus);
        console.log("SupplyShackStore - Is World Initialized:", isWorldInitialized);
    }, [availableGpus, isWorldInitialized]);

    // Set a timer to stop showing the loading state after world is initialized and a reasonable timeout
    useEffect(() => {
        // If world isn't initialized yet, keep loading
        if (!isWorldInitialized) {
            return;
        }

        // Check if we have GPUs already
        if (availableGpus.length > 0) {
            setIsInitialLoading(false);
            return;
        }

        // After world is initialized, wait a bit longer for GPUs to load, then stop showing loading
        const timer = setTimeout(() => {
            setIsInitialLoading(false);
        }, 5000); // Increase timeout to 5 seconds to give more time for GPUs to load

        return () => clearTimeout(timer);
    }, [availableGpus.length, isWorldInitialized]);

    // Force-stop loading after a maximum time, regardless of GPU data
    useEffect(() => {
        const maxLoadingTimer = setTimeout(() => {
            if (isInitialLoading) {
                console.log("SupplyShackStore - Force-stopping loading state after timeout");
                setIsInitialLoading(false);
            }
        }, 10000); // 10 second maximum loading time
        
        return () => clearTimeout(maxLoadingTimer);
    }, [isInitialLoading]);

    const handlePurchaseGpu = async (gpuEntityPda: string) => {
        if (!user?.wallet?.address || !userEntity?.entityPda) {
            toast.error("Cannot purchase GPU: User not initialized");
            return;
        }

        const selectedGpu = availableGpus.find(gpu => gpu.entityPda === gpuEntityPda);
        if (!selectedGpu) {
            toast.error("GPU not found");
            return;
        }

        let gpuPrice = 50000000; // Default 50 USDC
        if (selectedGpu.type === "Entry GPU") {
            gpuPrice = 50000000; // 50 USDC
        } else if (selectedGpu.type === "Standard GPU") {
            gpuPrice = 100000000; // 100 USDC
        } else if (selectedGpu.type === "Premium GPU") {
            gpuPrice = 200000000; // 200 USDC
        }

        try {
            const adminEntityPda = constants.ADMIN_ENTITY;
            const usdcPricePda = userEntity.priceComponentPdas[CurrencyType.USDC];

            if (!usdcPricePda) {
                toast.error("USDC price component not found. Try initializing your wallet again.");
                return;
            }

            const result = await purchaseGpu({
                worldPda: constants.WORLD_ADDRESS.toBase58(),
                gpuEntityPda: gpuEntityPda,
                buyerEntityPda: userEntity.entityPda,
                adminEntityPda: adminEntityPda,
                gpuPrice: gpuPrice,
                userWalletPublicKey: user.wallet.address,
                sourcePricePda: usdcPricePda,
                destinationPricePda: usdcPricePda
            });

            console.log('💰 result', result);

            if (result) {
                toast.success(
                    <div>
                        <p>GPU purchased successfully!</p>
                        <a 
                            href={`https://solscan.io/tx/${result.purchaseSig}?cluster=devnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            View transaction
                        </a>
                    </div>
                );
            }
        } catch (error) {
            console.error("Error purchasing GPU:", error);
            toast.error(`Failed to purchase GPU: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    console.log('availableGpus', availableGpus);

    if (!user?.wallet?.address) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400">Please connect your wallet to view available GPUs.</p>
            </div>
        );
    }

    if (!userEntity?.entityPda) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Please initialize your wallet to start purchasing GPUs.</p>
                <Button>Initialize Wallet</Button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Available GPUs</h2>
                <p className="text-sm text-gray-400">
                    {availableGpus.length} GPU{availableGpus.length !== 1 ? 's' : ''} available
                </p>
            </div>

            {isInitialLoading ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">Loading GPUs...</p>
                </div>
            ) : availableGpus.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">No GPUs available. Please check back later.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableGpus.map((gpu, index) => (
                        <GpuCard
                            key={gpu.entityPda}
                            price={
                                index === 0 ? 50 :
                                index === 1 ? 100 :
                                index === 2 ? 200 :
                                50
                            }
                            gpu={{
                                ...gpu,
                                type: gpu.type || "GPU"
                            }}
                            mode="store"
                            onPurchase={handlePurchaseGpu}
                            isLoading={isLoading}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 