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
    GpuEntityDetails,
    selectWorldPda
} from "@/stores/features/worldStore";
import { selectUserEntity } from "@/stores/features/userEntityStore";
import { useInitializeUserWallet } from "@/hooks/program/useInitializeUserWallet";
import { Button } from "@/components/ui/Button";
import * as constants from '@/lib/consts';
import { toast } from "sonner";
import type { RootState } from "@/stores/store";
import { setInitialLoad } from "@/stores/features/uiSlice";
import { setTerminalVisible } from "@/stores/features/uiSlice";
import { setTerminalHeight } from "@/stores/features/uiSlice";
import { closeTerminal } from "@/stores/features/uiSlice";
import ShowTerminalButton from "@/components/terminals/ShowTerminalButton";
import PrimaryTerminal from "@/components/terminals/PrimaryTerminal";
import { Loader2 } from "lucide-react";

// Create a separate client component for the content
function SupplyShackContent() {
    const { user, ready, authenticated } = usePrivy();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<"store" | "inventory">(
        tabParam === "inventory" ? "inventory" : "store"
    );

    const isInitialLoad = useSelector((state: RootState) => state.ui.isInitialLoad);
    const isTerminalVisible = useSelector((state: RootState) => state.ui.isTerminalVisible);
    const terminalHeight = useSelector((state: RootState) => state.ui.terminalHeight);
    const wasClosedByUser = useSelector((state: RootState) => state.ui.wasClosedByUser);

    const initialEntries = [
        { type: 'output' as const, content: 'Welcome to the GPU Supply Shack! Here you can purchase and manage your GPUs.' }
    ];

    const handlePrimaryTerminalClose = () => {
        dispatch(closeTerminal());
    };

    const handlePrimaryTerminalHeightChange = (newHeight: string) => {
        dispatch(setTerminalHeight(newHeight));
    };
    
    const handleShowTerminalClick = () => {
        dispatch(setTerminalVisible(true));
        if (isInitialLoad) { 
            dispatch(setInitialLoad(false));
        }
    };

    useEffect(() => {
        dispatch(setTerminalVisible(false));
    }, []);

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
    const worldPda = useSelector(selectWorldPda);
    
    // Get the user entity from Redux if it exists
    const userEntity = useSelector((state: RootState) => 
        user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
    );

    // Initialize wallet hooks
    const { 
        initializeWalletAsync,
        isLoading: isLoadingInitWallet
    } = useInitializeUserWallet();

    // Handle wallet initialization
    const handleInitializeWallet = async () => {
        if (!user?.wallet?.address) {
            toast.error("User wallet not connected.");
            return;
        }
        if (!worldPda) {
            toast.error("World not initialized.");
            return;
        }
        try {
            console.log("Starting wallet initialization with params:", {
                userPublicKey: user.wallet.address,
                worldPda
            });
            
            const result = await initializeWalletAsync({ 
                userPublicKey: user.wallet.address, 
                worldPda 
            });
            
            if (result) {
                console.log("Wallet initialization completed:", {
                    entityPda: result.entityPda,
                    walletComponentPda: result.walletComponentPda,
                    priceComponentPdas: result.priceComponentPdas
                });
                
                toast.success(`Entity initialized: ${result.entityPda}`);
            }
        } catch (error) { 
            console.error("Init wallet failed:", error);
            toast.error(`Init wallet failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

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

    if (!ready || !isWorldInitialized ) return (
        <div className="max-h-80vh overflow-y-scroll bg-black text-white p-6">
            <div className="text-center text-gray-400 py-8">
                <Loader2 className="w-10 h-10 animate-spin" /> 
            </div>
        </div>
    );

    return (
        <div className="max-h-80vh overflow-y-scroll bg-black text-white p-6">
            <SupplyShackHeader />
            <SupplyShackTabs activeTab={activeTab} onTabChange={handleTabChange} />
            
            {/* Add wallet initialization button if needed */}
            {user && isWorldInitialized && !userEntity && (
                <div className="w-full max-w-md mx-auto p-4 mb-6 border rounded-lg shadow-md">
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
            
            <div className="mt-6">
                {/* Only show content if user has initialized their wallet */}
                {userEntity ? (
                    <>
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
                    </>
                ) : (
                    <div className="text-center text-gray-400 py-8">
                        Please initialize your wallet to access the Supply Shack
                    </div>
                )}
            </div>

            {/* Terminal Layer - Adjusted for mobile */}
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                {isTerminalVisible && (
                    <div className="absolute bottom-8 left-0 right-0 pointer-events-auto max-h-[60vh] sm:max-h-[70vh]" style={{ height: terminalHeight }}>
                    <PrimaryTerminal 
                        initialEntries={initialEntries}
                        appearDelay={0}
                        isVisible={isTerminalVisible}
                        isInitialLoad={isInitialLoad}
                        height={terminalHeight}
                        onHeightChange={handlePrimaryTerminalHeightChange}
                        onClose={handlePrimaryTerminalClose}
                    />
                    </div>
                )}

                {!isTerminalVisible && (
                    <div className="pointer-events-auto">
                    <ShowTerminalButton 
                        onClick={handleShowTerminalClick}
                        appearDelay={0}
                        bypassDelay={wasClosedByUser}
                    />
                    </div>
                )}
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