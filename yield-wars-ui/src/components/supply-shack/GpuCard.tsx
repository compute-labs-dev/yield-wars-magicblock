import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import Image from "next/image";
import { BorderBeam } from "@/components/ui/BorderBeam";

export interface GPU {
    entityPda: string;
    type: string;
    maxLevel?: number;
    currentLevel?: number;
    production?: {
        isActive: boolean;
        resourcesAvailable: number;
        usdc?: number;
        aifi?: number;
    };
    isStaked?: boolean;
    ownershipPda: string;
    productionPda: string;
    upgradeablePda: string;
    stakeablePda: string;
    walletComponentPda: string;
    price?: number;
    operatingCost?: number;
    location?: string;
}

interface GpuCardProps {
    gpu: GPU;
    mode: "store" | "inventory";
    onPurchase?: (gpuEntityPda: string) => void;
    onToggleProduction?: (gpu: GPU, setActive: boolean) => void;
    onCollectResources?: (gpu: GPU) => void;
    onUpgrade?: (gpu: GPU) => void;
    onStake?: (gpu: GPU) => void;
    onUnstake?: (gpu: GPU) => void;
    onCollectStakingRewards?: (gpu: GPU) => void;
    isLoading?: boolean;
}

export function GpuCard({
    gpu,
    mode,
    onPurchase,
    onToggleProduction,
    onCollectResources,
    onUpgrade,
    onStake,
    onUnstake,
    onCollectStakingRewards,
    isLoading
}: GpuCardProps) {
    return (
        <div className="relative bg-black rounded-lg border border-[#39FF14]/30 hover:border-[#39FF14] p-8 min-h-[600px] flex flex-col">
            {/* Header with GPU Type */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col">
                    <h3 className="font-bold text-[#39FF14] text-2xl mb-1">{gpu.entityPda.substring(0, 6)}...{gpu.entityPda.substring(gpu.entityPda.length - 4)}</h3>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                    gpu.type === "Entry GPU" ? "bg-[#39FF14]/10 text-[#39FF14]" :
                    gpu.type === "Standard GPU" ? "bg-blue-900/50 text-blue-400" :
                    gpu.type === "Premium GPU" ? "bg-purple-900/50 text-purple-400" :
                    "bg-gray-700 text-gray-300"
                }`}>
                    {gpu.type === "Entry GPU" ? "Entry" :
                    gpu.type === "Standard GPU" ? "Standard" :
                    gpu.type === "Premium GPU" ? "Premium" : "GPU"}
                </span>
            </div>

            {/* GPU Image */}
            <div className="flex justify-center items-center mb-10">
                <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#39FF14]/5 rounded-lg"></div>
                    <Image 
                        src={
                            gpu.type === "Entry GPU" ? "/gpu-icons/gpu_nova_001.png" :
                            gpu.type === "Standard GPU" ? "/gpu-icons/gpu_quantum_001.png" :
                            gpu.type === "Premium GPU" ? "/gpu-icons/gpu_dragon_001.png" :
                            "/gpu-icons/gpu_nova_001.png"
                        } 
                        alt="GPU" 
                        width={180} 
                        height={180}
                        className="relative z-10"
                    />
                    <div className="absolute inset-0 rounded-lg shadow-[0_0_15px_rgba(57,255,20,0.3)]"></div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="flex flex-col items-start">
                    <p className="text-[#39FF14] text-3xl font-bold mb-1">{gpu.production?.usdc || 20} MH/s</p>
                    <p className="text-[#39FF14]/70 text-sm">Hash Rate</p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-[#39FF14] text-3xl font-bold mb-1">{gpu.operatingCost || 120} W</p>
                    <p className="text-[#39FF14]/70 text-sm">Power</p>
                </div>
            </div>

            {/* Location */}
            {gpu.location && (
                <div className="mb-8">
                    <p className="text-[#39FF14]/70 text-sm mb-1">Location:</p>
                    <p className="text-[#39FF14] font-bold">{gpu.location || "Kyoto, Japan"}</p>
                </div>
            )}

            {/* Spacer for consistent card height */}
            <div className="flex-grow"></div>

            {/* Price Display for Store Mode */}
            {mode === "store" && (
                <div className="mb-6 text-center">
                    <p className="text-[#39FF14] text-4xl font-bold">
                        {formatCurrency(gpu.price || 2000)} USDC
                    </p>
                </div>
            )}

            {/* Status Indicators for Inventory Mode */}
            {mode === "inventory" && (
                <div className="flex gap-2 mb-6">
                    {gpu.currentLevel !== undefined && (
                        <span className="text-sm px-3 py-1 rounded-full bg-[#39FF14]/10 text-[#39FF14]">
                            Level {gpu.currentLevel}/{gpu.maxLevel}
                        </span>
                    )}
                    
                    {gpu.production?.isActive !== undefined && (
                        <span className={`text-sm px-3 py-1 rounded-full ${
                            gpu.production.isActive 
                                ? "bg-[#39FF14]/10 text-[#39FF14]" 
                                : "bg-red-900/40 text-red-400"
                        }`}>
                            {gpu.production.isActive ? "Active" : "Inactive"}
                        </span>
                    )}
                    
                    {gpu.isStaked !== undefined && (
                        <span className={`text-sm px-3 py-1 rounded-full ${
                            gpu.isStaked 
                                ? "bg-[#39FF14]/10 text-[#39FF14]"
                                : "bg-gray-700/40 text-gray-400"
                        }`}>
                            {gpu.isStaked ? "Staked" : "Not Staked"}
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mode === "store" ? (
                    <Button
                        onClick={() => onPurchase?.(gpu.entityPda)}
                        disabled={isLoading}
                        className="col-span-1 sm:col-span-2 bg-[#39FF14] hover:bg-[#39FF14]/80 text-black font-bold text-xl h-14"
                    >
                        {isLoading ? "Processing..." : "Purchase"}
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={() => onToggleProduction?.(gpu, !gpu.production?.isActive)}
                            disabled={isLoading}
                            className={`col-span-1 sm:col-span-2 h-14 text-lg font-bold ${
                                gpu.production?.isActive
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-[#39FF14] hover:bg-[#39FF14]/80 text-black"
                            }`}
                        >
                            {isLoading ? "Processing..." : gpu.production?.isActive ? "Stop" : "Start"} Production
                        </Button>

                        {gpu.production?.resourcesAvailable !== undefined && gpu.production.resourcesAvailable > 0 && (
                            <Button
                                onClick={() => onCollectResources?.(gpu)}
                                disabled={isLoading}
                                className="h-14 text-lg/4 font-bold bg-[#39FF14] hover:bg-[#39FF14]/80 text-black text-wrap"
                            >
                                Collect Resources
                            </Button>
                        )}

                        {gpu.currentLevel !== undefined && gpu.maxLevel !== undefined && gpu.currentLevel < gpu.maxLevel && (
                            <Button
                                onClick={() => onUpgrade?.(gpu)}
                                disabled={isLoading}
                                className="h-14 text-lg/4 font-bold bg-[#39FF14] hover:bg-[#39FF14]/80 text-black text-wrap"
                            >
                                Upgrade to Lvl {gpu.currentLevel + 1}
                            </Button>
                        )}

                        {gpu.isStaked !== undefined && (
                            <>
                                <Button
                                    onClick={() => gpu.isStaked ? onUnstake?.(gpu) : onStake?.(gpu)}
                                    disabled={isLoading}
                                    className={`h-14 text-lg font-bold ${
                                        gpu.isStaked
                                            ? "bg-red-500 hover:bg-red-600 text-white"
                                            : "bg-[#39FF14] hover:bg-[#39FF14]/80 text-black"
                                    }`}
                                >
                                    {gpu.isStaked ? "Unstake" : "Stake"}
                                </Button>
                                {gpu.isStaked && (
                                    <Button
                                        onClick={() => onCollectStakingRewards?.(gpu)}
                                        disabled={isLoading}
                                        className="h-14 text-lg font-bold bg-[#39FF14] hover:bg-[#39FF14]/80 text-black"
                                    >
                                        Collect Rewards
                                    </Button>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Border Beam Effect */}
            <BorderBeam
                duration={6}
                size={400}
                className="from-transparent via-[#39FF14] to-transparent"
            />
        </div>
    );
} 