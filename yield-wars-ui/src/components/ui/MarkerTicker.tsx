"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

// Define the type for a single marker based on the structure in globe.tsx
interface TickerMarker {
    name: string;
    capacity: string;
    location: [number, number];
    size: number;
    status: string; // Assuming status is also part of the final marker object
}

interface MarkerTickerProps {
    markers: TickerMarker[];
    className?: string;
}

const MarkerTicker: React.FC<MarkerTickerProps> = ({ markers, className }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || !markers || markers.length === 0) {
        return null; // Don't render if no markers
    }

    // Duplicate the markers to create a seamless loop effect for the animation
    const extendedMarkers = [...markers, ...markers];

    return (
        <div className={cn(
            "w-full overflow-hidden whitespace-nowrap relative group border-y border-green-700/50 py-2 bg-black mb-8",
            className
            )}
            style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
            }}
        >
            <div className="inline-block animate-marquee group-hover:[animation-play-state:paused] py-2">
                {extendedMarkers.map((marker, index) => (
                    <span 
                        key={`${marker.name}-${marker.capacity}-${index}`} 
                        className="mx-4 text-sm text-green-400"
                    >
                        <span className="font-semibold">{marker.name}:</span> {marker.capacity}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MarkerTicker; 