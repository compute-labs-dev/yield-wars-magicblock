"use client";

import React from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
} from "react-simple-maps";
import { cn } from "@/lib/utils";
import { DataCenterMarker } from "@/lib/markers";

// Use a reliable TopoJSON source
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface Props {
    className?: string;
    /**
     * Delay in milliseconds before the globe appears
     * @default 0
     */
    appearDelay?: number;
    /**
     * Whether to show the globe with a quick transition
     * @default false
     */
    quickTransition?: boolean;
    /**
     * Array of markers to display on the globe
     */
    markers: DataCenterMarker[];
}

export function TwoDGlobe({ className, appearDelay = 0, quickTransition = false, markers }: Props) {
    const [selectedMarker, setSelectedMarker] = React.useState<(DataCenterMarker & { x: number; y: number }) | null>(null);
    const [isVisible, setIsVisible] = React.useState(appearDelay === 0);
    const mapRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (appearDelay > 0 && !quickTransition) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, appearDelay);

            return () => clearTimeout(timer);
        }
    }, [appearDelay, quickTransition]);

    React.useEffect(() => {
        if (quickTransition) {
            setIsVisible(true);
        }
    }, [quickTransition]);

    const handleMarkerClick = (marker: DataCenterMarker, event: React.MouseEvent<SVGPathElement>) => {
        // Get map container bounds
        const mapRect = mapRef.current?.getBoundingClientRect();
        if (!mapRect) return;

        // Calculate relative position within the map
        const x = event.clientX - mapRect.left;
        const y = event.clientY - mapRect.top;

        setSelectedMarker(marker ? { ...marker, x, y } : null);
    };

    return (
        <div ref={mapRef} className={cn(
            "relative w-full h-full transition-opacity duration-1000",
            isVisible ? "opacity-100" : "opacity-0",
            className
        )}>
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                scale: 140,
                center: [0, 55],
                parallels: [0, 30],
                }}
                style={{
                width: "100%",
                height: "100%",
                backgroundColor: "transparent",
                }}
            >
                <defs>
                    <pattern
                        id="dot-pattern"
                        x="0"
                        y="0"
                        width="4"
                        height="4"
                        patternUnits="userSpaceOnUse"
                    >
                        <circle
                            cx="2"
                            cy="2"
                            r="1"
                            fill="rgba(0, 255, 0, 0.5)"
                        />
                    </pattern>
                    <clipPath id="world-clip">
                        <path d="M0 0 L1000 0 L1000 1005 L0 460 Z" />
                    </clipPath>
                </defs>

                <g clipPath="url(#world-clip)">
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                if (geo.properties.continent === "Antarctica") return null;
                                const [[, lat]] = geo.geometry.coordinates[0] || [[0, 0]];
                                if (lat < -50) return null;
                                
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="url(#dot-pattern)"
                                        stroke="transparent"
                                        style={{
                                            default: {
                                                outline: "none",
                                            },
                                            hover: {
                                                outline: "none",
                                            },
                                            pressed: {
                                                outline: "none",
                                            },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>

                    {markers.map((marker) => (
                        <Marker
                            key={marker.name}
                            coordinates={[marker.location[1], marker.location[0]]}
                        >
                            <path
                                d="M4 0L8 4L4 8L0 4L4 0Z"
                                fill="white"
                                transform="translate(-4, -4)"
                                style={{
                                    cursor: "pointer",
                                }}
                                onClick={(e) => handleMarkerClick(marker, e)}
                            />
                        </Marker>
                    ))}
                </g>
            </ComposableMap>

            {selectedMarker && (
                <div
                    className="absolute p-4 bg-black/90 border border-green-500 rounded-lg text-white"
                    style={{
                        left: `${selectedMarker.x}px`,
                        top: `${selectedMarker.y - 10}px`,
                        transform: 'translate(-50%, -100%)',
                        minWidth: "200px",
                        zIndex: 10,
                    }}
                >
                    <h3 className="text-lg font-bold">{selectedMarker.name}</h3>
                    <p className="text-green-500">{selectedMarker.status}</p>
                    <p className="text-sm text-gray-300">{selectedMarker.capacity}</p>
                    <button
                        onClick={() => setSelectedMarker(null)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
