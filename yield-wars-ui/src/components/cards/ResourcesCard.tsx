'use client';

import { useMemo, useState, useEffect } from 'react';
import { BorderBeam } from '../ui/BorderBeam';

interface Resource {
    usd: number;
    comph200: number;
    sol: number;
    multiplier: number;
    total: number;
}

interface ResourcesCardProps {
    appearDelay?: number;
    className?: string;
}

export const ResourcesCard = ({ appearDelay = 1000, className }: ResourcesCardProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
        setIsVisible(true);
        }, appearDelay);

        return () => clearTimeout(timer);
    }, [appearDelay]);

    const resources = useMemo<Resource>(() => ({
        usd: 900.00,
        comph200: 1047.00,
        sol: 100.00,
        multiplier: 2.04,
        total: 2047.21
    }), []);

    return (
        <div className={`bg-black transition-opacity duration-1000 
            ${isVisible ? 'opacity-100' : 'opacity-0'}
            lg:w-auto w-full
            ${className}`}>
            <div className="text-center border-b border-green-500 py-3 lg:py-4">
                <h2 className="text-green-500 text-lg lg:text-xl font-bold">RESOURCES</h2>
            </div>
            
            <div className="p-3 lg:p-4 space-y-4 lg:space-y-6">
                <div className="space-y-3 lg:space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">USD</span>
                        <span className="text-green-500 font-bold text-lg lg:text-xl">{resources.usd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">COMPH200 ⚡</span>
                        <span className="text-green-500 font-bold text-lg lg:text-xl">{resources.comph200.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-lg lg:text-xl">SOL ◎</span>
                        <span className="text-green-500 font-bold text-lg lg:text-xl">{resources.sol.toFixed(2)}</span>
                    </div>
                </div>

                <div className="border-t border-green-500 pt-4 lg:pt-6 pb-3 lg:pb-4 flex justify-between items-center">
                    <span className="text-white font-bold text-lg lg:text-xl">{resources.multiplier.toFixed(2)}x</span>
                    <span className="text-green-500 font-bold text-lg lg:text-xl">{resources.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="w-full grid grid-cols-3 lg:grid-cols-1">
                <button className="text-center py-2 text-green-500 font-bold text-lg lg:text-xl uppercase border-t border-green-500 bg-gradient-to-r from-black via-gray-950 to-black hover:bg-gradient-to-r hover:from-green-950 hover:to-black transition-colors">
                    Exchange
                </button>
                <button className="text-center py-2 text-green-500 font-bold text-lg lg:text-xl uppercase border-t border-l border-r lg:border-l-0 lg:border-r-0 border-green-500 bg-gradient-to-r from-black via-gray-950 to-black hover:bg-gradient-to-r hover:from-green-950 hover:to-black transition-colors">
                    CL Market
                </button>
                <button className="text-center py-2 text-green-500 font-bold text-lg lg:text-xl uppercase border-t border-green-500 bg-gradient-to-r from-black via-gray-950 to-black hover:bg-gradient-to-r hover:from-green-950 hover:to-black transition-colors">
                    Management
                </button>
            </div>
            <BorderBeam
                duration={6}
                size={400}
                className="from-transparent via-green-500 to-transparent"
            />
        </div>
    );
};

export default ResourcesCard;
