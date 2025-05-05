"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

interface RetroGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes to apply to the grid container
   */
  className?: string;
  /**
   * Rotation angle of the grid in degrees
   * @default 75
   */
  angle?: number;
  /**
   * Grid cell size in pixels
   * @default 25
   */
  cellSize?: number;
  /**
   * Grid opacity value between 0 and 1
   * @default 0.7
   */
  opacity?: number;
  /**
   * Grid line color in light mode
   * @default "rgba(0, 255, 50, 0.3)"
   */
  lightLineColor?: string;
  /**
   * Delay in milliseconds before the grid appears
   * @default 9000
   */
  appearDelay?: number;
}

export function RetroGrid({
  className,
  angle = 25,
  cellSize = 25,
  opacity = 0.2,
  lightLineColor = "rgba(0, 255, 50, 0.3)",
  appearDelay = 1000,
  ...props
}: RetroGridProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, appearDelay);

    return () => clearTimeout(timer);
  }, [appearDelay]);

  const gridStyles = {
    backgroundImage: `
      linear-gradient(to right, ${lightLineColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${lightLineColor} 1px, transparent 1px)
    `,
    backgroundSize: `${cellSize}px ${cellSize}px`,
  };

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden transition-opacity duration-2000",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        opacity: isVisible ? opacity : 0,
        transitionDuration: "2s",
      }}
      {...props}
    >
      {/* Top Grid */}
      <div
        className="absolute inset-x-0 top-0 h-[50vh]"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          transformOrigin: "center top",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            ...gridStyles,
            transform: `rotateX(-${angle}deg) scale(2)`,
            transformOrigin: "center bottom",
            height: "100%",
            backgroundPosition: "center top",
            animation: "topGridFlow 25s linear infinite",
          }}
        />
        {/* Multiple gradient layers for stronger fade effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* Center gap - completely empty */}
      {/* <div className="absolute inset-x-0 top-[40vh] h-[20vh] bg-black" /> */}

      {/* Bottom Grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-[45vh]"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          transformOrigin: "center bottom",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            ...gridStyles,
            transform: `rotateX(${angle}deg) scale(2)`,
            transformOrigin: "center top",
            height: "100%",
            backgroundPosition: "center bottom",
            animation: "bottomGridFlow 15s linear infinite",
          }}
        />
        {/* Multiple gradient layers for stronger fade effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black" />
        <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-black to-transparent" />
      </div>

      {/* Subtle border lines at the edges of the gap */}
      <div className="absolute inset-x-0 top-[40vh] h-px bg-[#00FF32] opacity-5" />
      <div className="absolute inset-x-0 top-[60vh] h-px bg-[#00FF32] opacity-5" />

      <style jsx>{`
        @keyframes topGridFlow {
          0% {
            transform: rotateX(-${angle}deg) scale(2) translateY(-15%);
          }
          100% {
            transform: rotateX(-${angle}deg) scale(2) translateY(0%);
          }
        }
        @keyframes bottomGridFlow {
          0% {
            transform: rotateX(${angle}deg) scale(2) translateY(0%);
          }
          100% {
            transform: rotateX(${angle}deg) scale(2) translateY(-15%);
          }
        }
      `}</style>
    </div>
  );
}
