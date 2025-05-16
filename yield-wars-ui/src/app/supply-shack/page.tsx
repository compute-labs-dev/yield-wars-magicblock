"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useSearchParams, useRouter } from "next/navigation";
import LoginContainer from "@/components/layout/LoginContainer";
import { SupplyShackStore } from "@/components/supply-shack/SupplyShackStore";
import { SupplyShackInventory } from "@/components/supply-shack/SupplyShackInventory";
import { SupplyShackHeader } from "@/components/supply-shack/SupplyShackHeader";
import { SupplyShackTabs } from "@/components/supply-shack/SupplyShackTabs";
import { useState, useCallback, useEffect, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
    selectIsWorldInitialized,
    setWorldPda,
    setCurrencyEntity,
    setGpuEntities,
    setInitialized,
    GpuEntityDetails
} from "@/stores/features/worldStore";
import * as constants from '@/lib/consts';
import { toast } from "sonner";

// Create a separate client component for the content
function SupplyShackContent() {
    const { user, ready, authenticated } = usePrivy();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<"store" | "inventory">(
        tabParam === "inventory" ? "inventory" : "store"
    );

    // Handle tab changes
    const handleTabChange = (tab: "store" | "inventory") => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams);
        params.set('tab', tab);
        router.replace(`/supply-shack?${params.toString()}`, { scroll: false });
    };

    // Sync URL with tab state
    useEffect(() => {
        const currentTab = searchParams.get('tab');
        if (currentTab === "inventory" || currentTab === "store") {
            setActiveTab(currentTab);
        }
    }, [searchParams]);

    const dispatch = useDispatch();
    const isWorldInitialized = useSelector(selectIsWorldInitialized);

    // Load world data from constants
    const loadWorldFromConstants = useCallback(() => {
        try {
            console.log("Loading world from constants...");
            
            if (!constants.WORLD_ADDRESS) {
                throw new Error("WORLD_ADDRESS is not defined in constants");
            }

            // Set world PDA
            dispatch(setWorldPda(constants.WORLD_ADDRESS.toString()));
            
            // Set currency entities
            const currencies = [
                { type: 0, entity: 'USDC_ENTITY', price: 'USDC_PRICE_PDA' },
                { type: 1, entity: 'BTC_ENTITY', price: 'BTC_PRICE_PDA' },
                { type: 2, entity: 'ETH_ENTITY', price: 'ETH_PRICE_PDA' },
                { type: 3, entity: 'SOL_ENTITY', price: 'SOL_PRICE_PDA' },
                { type: 4, entity: 'AIFI_ENTITY', price: 'AIFI_PRICE_PDA' },
            ];
            
            currencies.forEach(currency => {
                const entityPda = constants[currency.entity as keyof typeof constants];
                const pricePda = constants[currency.price as keyof typeof constants];
                
                if (entityPda && pricePda) {
                    dispatch(setCurrencyEntity({
                        currencyType: currency.type,
                        entityPda: entityPda.toString(),
                        pricePda: pricePda.toString()
                    }));
                }
            });
            
            // Set GPU entities
            const gpuEntities: GpuEntityDetails[] = [];
            
            // Define the GPU types we're looking for
            const gpuTypes = [
                { name: "Entry GPU", prefix: "ENTRY_GPU" },
                { name: "Standard GPU", prefix: "STANDARD_GPU" },
                { name: "Premium GPU", prefix: "PREMIUM_GPU" }
            ];
            
            // Check for each GPU type
            gpuTypes.forEach(gpuType => {
                const entityKey = `${gpuType.prefix}_ENTITY` as keyof typeof constants;
                const ownershipKey = `${gpuType.prefix}_OWNERSHIP` as keyof typeof constants;
                const productionKey = `${gpuType.prefix}_PRODUCTION` as keyof typeof constants;
                const upgradeableKey = `${gpuType.prefix}_UPGRADEABLE` as keyof typeof constants;
                const stakeableKey = `${gpuType.prefix}_STAKEABLE` as keyof typeof constants;
                
                if (constants[entityKey]) {
                    gpuEntities.push({
                        entityPda: constants[entityKey].toString(),
                        ownershipPda: constants[ownershipKey]?.toString() || "",
                        productionPda: constants[productionKey]?.toString() || "",
                        upgradeablePda: constants[upgradeableKey]?.toString() || "",
                        stakeablePda: constants[stakeableKey]?.toString() || "",
                        walletComponentPda: "",
                        type: gpuType.name
                    });
                }
            });
            
            if (gpuEntities.length > 0) {
                dispatch(setGpuEntities(gpuEntities));
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

    // Load world data on mount
    useEffect(() => {
        if (!isWorldInitialized) {
            loadWorldFromConstants();
        }
    }, [isWorldInitialized, loadWorldFromConstants]);

    if (!ready) return <p>Loading Privy...</p>;
    if (!authenticated) return <LoginContainer />;

    return (
        <div className="max-h-80vh overflow-y-scroll bg-black text-white p-6">
            <SupplyShackHeader />
            <SupplyShackTabs activeTab={activeTab} onTabChange={handleTabChange} />
            
            <div className="mt-6">
                <div style={{ display: activeTab === "store" ? "block" : "none" }}>
                    <Suspense fallback={<div>Loading store...</div>}>
                        <SupplyShackStore user={user} />
                    </Suspense>
                </div>
                <div style={{ display: activeTab === "inventory" ? "block" : "none" }}>
                    <Suspense fallback={<div>Loading inventory...</div>}>
                        <SupplyShackInventory user={user} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

// Main page component wrapped in Suspense
export default function SupplyShackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SupplyShackContent />
        </Suspense>
    );
} 