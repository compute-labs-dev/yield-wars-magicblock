'use client';

import { useState, useMemo, useEffect } from 'react';
import { BorderBeam } from '../ui/BorderBeam';

interface LeaderboardEntry {
    rank: number;
    name: string;
    multiplier: number;
}

interface SquadsReferralsCardProps {
    appearDelay?: number;
    className?: string;
}

type TabType = 'individual' | 'squad';

export const SquadsReferralsCard = ({ appearDelay = 0, className }: SquadsReferralsCardProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('individual');

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, appearDelay);

        return () => clearTimeout(timer);
    }, [appearDelay]);

    const individualLeaderboard = useMemo<LeaderboardEntry[]>(() => [
        { rank: 1, name: 'jermaine', multiplier: 17.4 },
        { rank: 2, name: 'xingfan', multiplier: 16.3 },
        { rank: 3, name: 'beast', multiplier: 16.1 },
        { rank: 2340, name: 'mike', multiplier: 2.06 },
        { rank: 2341, name: 'YOU', multiplier: 2.04 },
        { rank: 2342, name: 'kirby', multiplier: 2.01 },
    ], []);

    const squadLeaderboard = useMemo<LeaderboardEntry[]>(() => [
        { rank: 1, name: 'Alpha Squad', multiplier: 17.4 },
        { rank: 2, name: 'Beta Team', multiplier: 16.3 },
        { rank: 3, name: 'Gamma Group', multiplier: 16.1 },
        { rank: 42, name: 'YOUR SQUAD', multiplier: 2.06 },
    ], []);

    const averageMultiplier = 1.12;

    const displayedLeaderboard = activeTab === 'individual' ? individualLeaderboard : squadLeaderboard;

    return (
        <div className={`bg-black transition-opacity duration-1000 
            ${isVisible ? 'opacity-100' : 'opacity-0'}
            lg:w-auto w-full
            ${className}`}>
            <div className="text-center border-b border-green-500 py-3 lg:py-4">
                <h2 className="text-green-500 text-lg lg:text-xl font-bold">SQUAD & REFERRALS</h2>
            </div>
            
            <div className="text-center border-b border-green-500 py-2 lg:py-3">
                <h3 className="text-green-500 text-lg lg:text-xl font-bold">LEADERBOARD</h3>
            </div>

            <div className="flex border-b border-green-500">
                <button 
                    className={`flex-1 py-2 lg:py-3 text-center text-lg lg:text-xl font-bold ${activeTab === 'individual' ? 'text-green-500' : 'text-white'} hover:bg-green-500/10 transition-colors`}
                    onClick={() => setActiveTab('individual')}
                >
                    INDV.
                </button>
                <div className="border-r border-green-500"></div>
                <button 
                    className={`flex-1 py-2 lg:py-3 text-center text-lg lg:text-xl font-bold ${activeTab === 'squad' ? 'text-green-500' : 'text-white'} hover:bg-green-500/10 transition-colors`}
                    onClick={() => setActiveTab('squad')}
                >
                    SQUAD
                </button>
            </div>

            <div className="p-3 lg:p-4">
                <div className="mb-2 pb-2 border-b border-green-500 grid grid-cols-12">
                    <div className="col-span-3 text-left text-white font-mono"></div>
                    <div className="col-span-5 text-left text-white font-mono"></div>
                    <div className="col-span-4 text-right text-white font-mono"></div>
                </div>

                <div className="space-y-2 lg:space-y-3 max-h-48 lg:max-h-60 overflow-y-auto py-2 scrollbar-thin scrollbar-track-black scrollbar-thumb-green-500">
                    {displayedLeaderboard.map((entry, index) => {
                        const isCurrentUser = entry.name === 'YOU' || entry.name === 'YOUR SQUAD';
                        return (
                        <div key={index} className="grid grid-cols-12 items-center">
                            <div className="col-span-3 text-left">
                            <span className={`font-mono text-base lg:text-lg ${isCurrentUser ? 'text-green-500' : 'text-white'}`}>
                                {entry.rank}
                            </span>
                            </div>
                            <div className="col-span-5 text-left">
                            <span className={`font-mono text-base lg:text-lg ${isCurrentUser ? 'text-green-500' : 'text-green-500'}`}>
                                {isCurrentUser ? `*${entry.name}*` : entry.name}
                            </span>
                            </div>
                            <div className="col-span-4 text-right">
                            <span className={`font-mono text-base lg:text-lg ${isCurrentUser ? 'text-green-500' : 'text-green-500'}`}>
                                {entry.multiplier.toFixed(1)}x
                            </span>
                            </div>
                        </div>
                        );
                    })}
                
                    <div className="py-2 lg:py-3 text-gray-500 text-center font-mono text-base lg:text-lg">...</div>
                
                    <div className="pt-2 lg:pt-3 border-t border-green-500 grid grid-cols-12 items-center">
                        <div className="col-span-3 text-left text-green-500 font-mono"></div>
                        <div className="col-span-5 text-left text-green-500 font-mono text-base lg:text-lg">
                            all players
                        </div>
                        <div className="col-span-4 text-right text-green-500 font-mono text-base lg:text-lg">
                            avg {averageMultiplier.toFixed(2)}x
                        </div>
                    </div>
                </div>
            </div>
            <BorderBeam
                duration={6}
                size={400}
                className="from-transparent via-green-500 to-transparent"
            />
        </div>
    );
};

export default SquadsReferralsCard;
