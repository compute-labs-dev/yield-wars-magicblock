'use client'
import { RetroGrid } from "@/components/ui/RetroGrid";
import { Globe } from "@/components/globes/globe";
import { useEffect } from 'react';
import React from 'react';
import { generateGlobeMarkers } from "@/lib/markers";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import {
    toggleResourcesVisible,
    toggleLeaderboardVisible
} from '@/stores/features/uiSlice';
import { WaitlistTerminal } from "@/components/home/WaitlistTerminal";
// Generate markers once at module level to keep them consistent
const globeMarkers = generateGlobeMarkers();

export default function Home() {
  const isInitialLoad = useSelector((state: RootState) => state.ui.isInitialLoad);
  const dispatch = useDispatch();
  
  // Effect to trigger initial appearance of side panels after a delay
  useEffect(() => {
    let panelTimer: NodeJS.Timeout | undefined;
    if (isInitialLoad) {
      panelTimer = setTimeout(() => {
        // Dispatch actions when timer fires
        // The cleanup function ensures this only runs if isInitialLoad was true the whole time
        dispatch(toggleResourcesVisible());
        dispatch(toggleLeaderboardVisible());
      }, 10000); // 10 second delay, adjust as needed
    }

    // Cleanup function: Clears the timer if the component unmounts
    // or if isInitialLoad becomes false before the timer fires.
    return () => {
      if (panelTimer) {
        clearTimeout(panelTimer);
      }
    };
  }, [isInitialLoad, dispatch]); // Depend on isInitialLoad and dispatch

  return (
    <>
      {/* Main content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-black overflow-hidden">
        {/* RetroGrid background - appears after delay */}
        <RetroGrid 
          className="fixed inset-0"
          angle={65}
          cellSize={30}
          opacity={0.2}
          lightLineColor="rgba(0, 255, 50, 0.5)"
        />

        {/* Globe positioned to fill the screen */}
        <Globe 
          className="fixed inset-0 z-10" 
          appearDelay={0} 
          quickTransition={!isInitialLoad}
          markers={globeMarkers}
        />

        {/* Main content on top of grid and globe */}
        <div className="relative z-20 flex flex-col w-full h-full items-center justify-center">
          {/* Terminal positioned with proper spacing */}
          <div className="w-full flex items-center justify-center mb-12 md:mb-48">
            <WaitlistTerminal className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
}

