import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import Image from "next/image";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { useState, useEffect } from "react";

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
    const [glowIntensity, setGlowIntensity] = useState(0);
    
    // Breathing glow effect for card
    useEffect(() => {
        const interval = setInterval(() => {
            setGlowIntensity(prev => {
                const newValue = prev + 0.05;
                return newValue > 1 ? 0 : newValue;
            });
        }, 50);
        
        return () => clearInterval(interval);
    }, []);
    
    const getGpuTypeColors = () => {
        switch(gpu.type) {
            case "Entry GPU":
                return {
                    primary: "#39FF14",
                    secondary: "#39FF14",
                    bgGradient: "linear-gradient(135deg, rgba(57,255,20,0.15) 0%, rgba(57,255,20,0.05) 100%)",
                    glowColor: "0 0 20px rgba(57,255,20,0.4)",
                    shadow: "0 0 15px rgba(57,255,20,0.3)"
                };
            case "Standard GPU":
                return {
                    primary: "#0094FF",
                    secondary: "#00D1FF",
                    bgGradient: "linear-gradient(135deg, rgba(0,148,255,0.15) 0%, rgba(0,209,255,0.05) 100%)",
                    glowColor: "0 0 20px rgba(0,148,255,0.4)",
                    shadow: "0 0 15px rgba(0,148,255,0.3)"
                };
            case "Premium GPU":
                return {
                    primary: "#A855F7",
                    secondary: "#D580FF",
                    bgGradient: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(213,128,255,0.05) 100%)",
                    glowColor: "0 0 20px rgba(168,85,247,0.4)",
                    shadow: "0 0 15px rgba(168,85,247,0.3)"
                };
            default:
                return {
                    primary: "#39FF14",
                    secondary: "#39FF14",
                    bgGradient: "linear-gradient(135deg, rgba(57,255,20,0.15) 0%, rgba(57,255,20,0.05) 100%)",
                    glowColor: "0 0 20px rgba(57,255,20,0.4)",
                    shadow: "0 0 15px rgba(57,255,20,0.3)"
                };
        }
    };
    
    const colors = getGpuTypeColors();
    
    return (
        <div className="relative rounded-lg overflow-hidden transition-all duration-300"
             style={{
                background: `
                    linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(10,10,10,0.95)) padding-box,
                    linear-gradient(135deg, ${colors.primary}40, transparent, ${colors.secondary}20) border-box
                `,
                boxShadow: `${colors.glowColor}, inset 0 0 30px rgba(0,0,0,0.6)`,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'transparent',
                backdropFilter: 'blur(10px)'
             }}
        >
            {/* Inner lines pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
                 style={{
                     backgroundImage: `
                        repeating-linear-gradient(0deg, ${colors.primary}, ${colors.primary} 1px, transparent 1px, transparent 20px),
                        repeating-linear-gradient(90deg, ${colors.primary}, ${colors.primary} 1px, transparent 1px, transparent 20px)
                     `,
                     filter: 'blur(0.5px)'
                 }}
            ></div>
            
            {/* Pulsing corner accents */}
            <div className="absolute top-0 left-0 w-[100px] h-[100px] pointer-events-none opacity-40"
                 style={{
                     background: `radial-gradient(circle at top left, ${colors.primary}${Math.floor(glowIntensity * 30 + 10)}, transparent 70%)`,
                 }}
            ></div>
            <div className="absolute bottom-0 right-0 w-[100px] h-[100px] pointer-events-none opacity-40"
                 style={{
                     background: `radial-gradient(circle at bottom right, ${colors.primary}${Math.floor(glowIntensity * 30 + 10)}, transparent 70%)`,
                 }}
            ></div>
            
            {/* Main content */}
            <div className="p-8 min-h-[600px] flex flex-col relative z-10">
                {/* Header with GPU Type */}
                <div className="flex justify-between items-start mb-8">
                    <div className="flex flex-col">
                        <h3 className="font-mono font-bold text-white text-xl mb-1" style={{ textShadow: `0 0 8px ${colors.primary}50` }}>
                            <span style={{ color: colors.primary }}>{gpu.entityPda.substring(0, 6)}</span>
                            <span className="text-white/50">...</span>
                            <span style={{ color: colors.primary }}>{gpu.entityPda.substring(gpu.entityPda.length - 4)}</span>
                        </h3>
                    </div>
                    <div className="relative group flex-shrink-0">
                        <div className={`absolute inset-0 rounded-full blur-md opacity-50`} 
                             style={{ backgroundColor: `${colors.primary}20` }}></div>
                        <div className="relative flex items-center text-sm font-mono font-bold px-3 py-1.5 rounded-full bg-black/80 border"
                             style={{ 
                                 borderColor: `${colors.primary}40`,
                                 boxShadow: `0 0 10px ${colors.primary}30, inset 0 0 6px ${colors.primary}20` 
                             }}>
                            <span style={{ color: colors.primary }} className="whitespace-nowrap tracking-wide">
                                {gpu.type === "Entry GPU" ? "Entry" :
                                gpu.type === "Standard GPU" ? "Standard" :
                                gpu.type === "Premium GPU" ? "Premium" : "GPU"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* GPU Image */}
                <div className="flex justify-center items-center mb-10">
                    <div className="relative w-[200px] h-[200px] flex items-center justify-center" 
                         style={{
                             background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`,
                         }}>
                        {/* Pulsing ring around GPU */}
                        <div className="absolute w-[180px] h-[180px] rounded-full transition-all"
                             style={{
                                 border: `1px solid ${colors.primary}${Math.floor(glowIntensity * 40 + 20)}`,
                                 boxShadow: `0 0 15px ${Math.floor(glowIntensity * 5)}px ${colors.primary}30`,
                                 opacity: 0.5 + glowIntensity * 0.3
                             }}></div>
                        
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
                            className="relative z-10 drop-shadow-lg"
                            style={{ filter: `drop-shadow(0 0 8px ${colors.primary}50)` }}
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="flex flex-col items-start">
                        <div className="font-mono text-3xl font-bold mb-1 relative flex items-baseline">
                            <span className="mr-1 text-white opacity-80">⚡</span>
                            <span style={{ color: colors.primary }}>{gpu.production?.usdc || 20}</span>
                            <span className="text-base text-white/60 ml-1">MH/s</span>
                        </div>
                        <p className="text-sm text-white/50 uppercase tracking-wider">Hash Rate</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="font-mono text-3xl font-bold mb-1 relative flex items-baseline">
                            <span className="mr-1 text-white opacity-80">⚡</span>
                            <span style={{ color: colors.primary }}>{gpu.operatingCost || 120}</span>
                            <span className="text-base text-white/60 ml-1">W</span>
                        </div>
                        <p className="text-sm text-white/50 uppercase tracking-wider">Power</p>
                    </div>
                </div>

                {/* Location */}
                {gpu.location && (
                    <div className="mb-8 font-mono p-3 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${colors.primary}20` }}>
                        <p className="text-white/50 text-xs mb-1 uppercase tracking-wider">Location:</p>
                        <p className="text-white font-bold tracking-wide">{gpu.location || "Kyoto, Japan"}</p>
                    </div>
                )}

                {/* Spacer for consistent card height */}
                <div className="flex-grow"></div>

                {/* Price Display for Store Mode */}
                {mode === "store" && (
                    <div className="mb-6 text-center">
                        <p className="text-5xl font-mono font-bold" 
                           style={{ 
                               color: colors.primary,
                               textShadow: `0 0 15px ${colors.primary}40` 
                           }}>
                            {formatCurrency(gpu.price || 2000)} <span className="text-3xl">USDC</span>
                        </p>
                    </div>
                )}

                {/* Status Indicators for Inventory Mode */}
                {mode === "inventory" && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {gpu.currentLevel !== undefined && (
                            <div className="relative group flex-shrink-0">
                                <div className="absolute inset-0 rounded-full blur-md opacity-50" 
                                     style={{ backgroundColor: `${colors.primary}20` }}></div>
                                <div className="relative flex items-center gap-1 text-sm font-mono font-bold px-3 py-1.5 rounded-full bg-black/80 border"
                                     style={{ 
                                         borderColor: `${colors.primary}40`,
                                         boxShadow: `0 0 10px ${colors.primary}30, inset 0 0 6px ${colors.primary}20` 
                                     }}>
                                    <span style={{ color: colors.primary }} className="tracking-wide whitespace-nowrap">Level</span>
                                    <span className="px-2 py-0.5 rounded text-white bg-black/60 border" 
                                          style={{ borderColor: `${colors.primary}30` }}>
                                          {gpu.currentLevel}/{gpu.maxLevel}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {gpu.production?.isActive !== undefined && (
                            <div className="relative group flex-shrink-0">
                                <div className={`absolute inset-0 rounded-full blur-md opacity-50`}
                                     style={{ 
                                         backgroundColor: gpu.production.isActive 
                                             ? `${colors.primary}20`
                                             : "rgba(255,60,60,0.2)"
                                     }}></div>
                                <div className={`relative flex items-center text-sm font-mono font-bold px-3 py-1.5 rounded-full bg-black/80 border`}
                                     style={{ 
                                         borderColor: gpu.production.isActive 
                                             ? `${colors.primary}40`
                                             : "rgba(255,60,60,0.4)",
                                         boxShadow: gpu.production.isActive 
                                             ? `0 0 10px ${colors.primary}30, inset 0 0 6px ${colors.primary}20`
                                             : "0 0 10px rgba(255,60,60,0.3), inset 0 0 6px rgba(255,60,60,0.2)"
                                     }}>
                                    <span className={`whitespace-nowrap tracking-wide`}
                                          style={{ 
                                              color: gpu.production.isActive 
                                                  ? colors.primary
                                                  : "rgb(255,100,100)"
                                          }}>
                                        {gpu.production.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <span className={`ml-1 h-2 w-2 rounded-full ${
                                        gpu.production.isActive 
                                            ? "animate-pulse" 
                                            : ""
                                    }`}
                                    style={{ 
                                        backgroundColor: gpu.production.isActive 
                                            ? colors.primary
                                            : "rgb(255,60,60)"
                                    }}></span>
                                </div>
                            </div>
                        )}
                        
                        {gpu.isStaked !== undefined && (
                            <div className="relative group flex-shrink-0">
                                <div className={`absolute inset-0 rounded-full blur-md opacity-50`}
                                     style={{ 
                                         backgroundColor: gpu.isStaked
                                             ? `${colors.primary}20`
                                             : "rgba(150,150,150,0.2)"
                                     }}></div>
                                <div className={`relative flex items-center text-sm font-mono font-bold px-3 py-1.5 rounded-full bg-black/80 border`}
                                     style={{ 
                                         borderColor: gpu.isStaked
                                             ? `${colors.primary}40`
                                             : "rgba(150,150,150,0.4)",
                                         boxShadow: gpu.isStaked
                                             ? `0 0 10px ${colors.primary}30, inset 0 0 6px ${colors.primary}20`
                                             : "0 0 10px rgba(150,150,150,0.3), inset 0 0 6px rgba(150,150,150,0.2)"
                                     }}>
                                    <span className={`whitespace-nowrap tracking-wide`}
                                          style={{ 
                                              color: gpu.isStaked
                                                  ? colors.primary
                                                  : "rgb(180,180,180)"
                                          }}>
                                        {gpu.isStaked ? "Staked" : "Not Staked"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mode === "store" ? (
                        <button
                            onClick={() => onPurchase?.(gpu.entityPda)}
                            disabled={isLoading}
                            className="col-span-1 sm:col-span-2 h-14 text-xl font-mono tracking-wide font-bold relative overflow-hidden transition-all"
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                border: `1px solid ${colors.primary}50`,
                                boxShadow: `0 0 15px ${colors.primary}30, inset 0 0 20px rgba(0,0,0,0.8)`,
                                color: colors.primary
                            }}
                        >
                            {/* Animated button background */}
                            <div className="absolute inset-0 pointer-events-none"
                                 style={{
                                     background: `linear-gradient(90deg, transparent, ${colors.primary}20, transparent)`,
                                     transform: 'translateX(-100%)',
                                     animation: 'shimmer 2s infinite'
                                 }}></div>
                            {isLoading ? "Processing..." : "Purchase"}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => onToggleProduction?.(gpu, !gpu.production?.isActive)}
                                disabled={isLoading}
                                className={`col-span-1 sm:col-span-2 h-14 text-lg font-mono tracking-wide font-bold relative overflow-hidden transition-all`}
                                style={{
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    border: gpu.production?.isActive
                                        ? '1px solid rgba(255,60,60,0.5)'
                                        : `1px solid ${colors.primary}50`,
                                    boxShadow: gpu.production?.isActive
                                        ? '0 0 15px rgba(255,60,60,0.3), inset 0 0 20px rgba(0,0,0,0.8)'
                                        : `0 0 15px ${colors.primary}30, inset 0 0 20px rgba(0,0,0,0.8)`,
                                    color: gpu.production?.isActive
                                        ? 'rgb(255,100,100)'
                                        : colors.primary
                                }}
                            >
                                {/* Animated button background */}
                                <div className="absolute inset-0 pointer-events-none"
                                     style={{
                                         background: gpu.production?.isActive
                                             ? 'linear-gradient(90deg, transparent, rgba(255,60,60,0.2), transparent)'
                                             : `linear-gradient(90deg, transparent, ${colors.primary}20, transparent)`,
                                         transform: 'translateX(-100%)',
                                         animation: 'shimmer 2s infinite'
                                     }}></div>
                                {isLoading ? "Processing..." : gpu.production?.isActive ? "Stop" : "Start"} Production
                            </button>

                            {gpu.production?.resourcesAvailable !== undefined && gpu.production.resourcesAvailable > 0 && (
                                <button
                                    onClick={() => onCollectResources?.(gpu)}
                                    disabled={isLoading}
                                    className="h-14 text-lg/4 font-mono tracking-wide font-bold relative overflow-hidden transition-all text-wrap"
                                    style={{
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        border: `1px solid ${colors.primary}50`,
                                        boxShadow: `0 0 15px ${colors.primary}30, inset 0 0 20px rgba(0,0,0,0.8)`,
                                        color: colors.primary
                                    }}
                                >
                                    <div className="absolute inset-0 pointer-events-none"
                                         style={{
                                             background: `linear-gradient(90deg, transparent, ${colors.primary}20, transparent)`,
                                             transform: 'translateX(-100%)',
                                             animation: 'shimmer 2s infinite'
                                         }}></div>
                                    Collect Resources
                                </button>
                            )}

                            {gpu.currentLevel !== undefined && gpu.maxLevel !== undefined && gpu.currentLevel < gpu.maxLevel && (
                                <button
                                    onClick={() => onUpgrade?.(gpu)}
                                    disabled={isLoading}
                                    className="h-14 text-lg/4 font-mono tracking-wide font-bold relative overflow-hidden transition-all text-wrap"
                                    style={{
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        border: `1px solid ${colors.primary}50`,
                                        boxShadow: `0 0 15px ${colors.primary}30, inset 0 0 20px rgba(0,0,0,0.8)`,
                                        color: colors.primary
                                    }}
                                >
                                    <div className="absolute inset-0 pointer-events-none"
                                         style={{
                                             background: `linear-gradient(90deg, transparent, ${colors.primary}20, transparent)`,
                                             transform: 'translateX(-100%)',
                                             animation: 'shimmer 2s infinite'
                                         }}></div>
                                    Upgrade to Lvl {gpu.currentLevel + 1}
                                </button>
                            )}

                            {gpu.isStaked !== undefined && (
                                <>
                                    <button
                                        onClick={() => gpu.isStaked ? onUnstake?.(gpu) : onStake?.(gpu)}
                                        disabled={isLoading}
                                        className={`h-14 text-lg font-mono tracking-wide font-bold relative overflow-hidden transition-all`}
                                        style={{
                                            backgroundColor: 'rgba(0,0,0,0.7)',
                                            border: gpu.isStaked
                                                ? '1px solid rgba(255,60,60,0.5)'
                                                : `1px solid ${colors.primary}50`,
                                            boxShadow: gpu.isStaked
                                                ? '0 0 15px rgba(255,60,60,0.3), inset 0 0 20px rgba(0,0,0,0.8)'
                                                : `0 0 15px ${colors.primary}30, inset 0 0 20px rgba(0,0,0,0.8)`,
                                            color: gpu.isStaked
                                                ? 'rgb(255,100,100)'
                                                : colors.primary
                                        }}
                                    >
                                        <div className="absolute inset-0 pointer-events-none"
                                             style={{
                                                 background: gpu.isStaked
                                                     ? 'linear-gradient(90deg, transparent, rgba(255,60,60,0.2), transparent)'
                                                     : `linear-gradient(90deg, transparent, ${colors.primary}20, transparent)`,
                                                 transform: 'translateX(-100%)',
                                                 animation: 'shimmer 2s infinite'
                                             }}></div>
                                        {gpu.isStaked ? "Unstake" : "Stake"}
                                    </button>
                                    {gpu.isStaked && (
                                        <button
                                            onClick={() => onCollectStakingRewards?.(gpu)}
                                            disabled={isLoading}
                                            className="h-14 text-lg font-mono tracking-wide font-bold relative overflow-hidden transition-all"
                                            style={{
                                                backgroundColor: 'rgba(0,0,0,0.7)',
                                                border: `1px solid ${colors.primary}50`,
                                                boxShadow: `0 0 15px ${colors.primary}30, inset 0 0 20px rgba(0,0,0,0.8)`,
                                                color: colors.primary
                                            }}
                                        >
                                            <div className="absolute inset-0 pointer-events-none"
                                                 style={{
                                                     background: `linear-gradient(90deg, transparent, ${colors.primary}20, transparent)`,
                                                     transform: 'translateX(-100%)',
                                                     animation: 'shimmer 2s infinite'
                                                 }}></div>
                                            Collect Rewards
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Add a CSS animation for the button shimmer effect */}
            <style jsx>{`
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    20%, 100% {
                        transform: translateX(100%);
                    }
                }
                
                button:hover {
                    transform: translateY(-2px);
                }
                
                button:active {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
} 