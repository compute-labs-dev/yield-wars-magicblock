"use client";

import createGlobe, { COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { generateGlobeMarkers, GlobeMarker } from "@/lib/markers";

const MOVEMENT_DAMPING = 1400;

export const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  baseColor: [0.1, 0.1, 0.1],
  markerColor: [0, 1, 0.2],
  glowColor: [0.1, 0.8, 0.1],
  markers: generateGlobeMarkers()
};

interface Props {
  className?: string;
  config?: COBEOptions;
  /**
   * Delay in milliseconds before the globe appears
   * @default 0
   */
  appearDelay?: number;
  /**
   * Whether to use a quick transition
   * @default false
   */
  quickTransition?: boolean;
  markers: GlobeMarker[];
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
  appearDelay = 0,
  quickTransition = false,
}: Props) {
  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [isVisible, setIsVisible] = useState(false);

  const r = useMotionValue(0);
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  });

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      r.set(r.get() + delta / MOVEMENT_DAMPING);
    }
  };

  useEffect(() => {
    if (quickTransition) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, appearDelay);
      return () => clearTimeout(timer);
    }
  }, [quickTransition, appearDelay]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const onResize = () => {
      if (containerRef.current) {
        // Calculate optimal width based on viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // For mobile, we want the globe to be larger than the container
        // to create a background effect. On desktop we respect the max width.
        const isMobile = viewportWidth < 768;
        
        // For mobile, make the globe at least 120% of viewport width
        // but respect the max-width for larger screens
        widthRef.current = isMobile 
          ? Math.max(viewportWidth * 1.2, viewportHeight * 0.9) 
          : Math.min(containerRef.current.offsetWidth, 800);
          
        if (canvasRef.current) {
          canvasRef.current.width = widthRef.current * 2;
          canvasRef.current.height = widthRef.current * 2;
          canvasRef.current.style.width = `${widthRef.current}px`;
          canvasRef.current.style.height = `${widthRef.current}px`;
        }
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      onRender: (state) => {
        if (!pointerInteracting.current) phiRef.current += 0.005;
        state.phi = phiRef.current + rs.get();
        state.width = widthRef.current * 2;
        state.height = widthRef.current * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    }, 0);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [rs, config]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center justify-center w-full h-full max-w-[800px] mx-auto transition-opacity duration-1000",
        isVisible ? "opacity-100" : "opacity-0",
        "md:max-w-[800px] overflow-hidden",
        className,
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500",
          "absolute z-0"
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX;
          updatePointerInteraction(e.clientX);
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  );
}
