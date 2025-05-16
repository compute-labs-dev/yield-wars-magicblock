'use client'
import { ComingSoonTerminal } from "@/components/home/ComingSoonTerminal";
import { RetroGrid } from "@/components/ui/RetroGrid";
import { Globe } from "@/components/globes/globe";
import { ResourcesCard } from "@/components/cards/ResourcesCard";
import { SquadsReferralsCard } from "@/components/cards/SquadsReferralsCard";
import PrimaryTerminal from "@/components/terminals/PrimaryTerminal";
import ShowTerminalButton from "@/components/terminals/ShowTerminalButton";
import { TwoDGlobe } from "@/components/globes/2d-globe";
import { GlobeToggle } from "@/components/globes/components/globe-toggle";
import MarkerTicker from "@/components/ui/MarkerTicker";
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import React from 'react';
import { generateDataCenterMarkers, generateGlobeMarkers } from "@/lib/markers";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import {
    setInitialLoad,
    setTerminalVisible,
    setTerminalHeight,
    closeTerminal,
    toggleResourcesVisible,
    toggleLeaderboardVisible
} from '@/stores/features/uiSlice';

// Generate markers once at module level to keep them consistent
const dataCenterMarkers = generateDataCenterMarkers();
const globeMarkers = generateGlobeMarkers();

export default function Home() {
  const isWorldFlat = useSelector((state: RootState) => state.ui.isWorldFlat);
  const isInitialLoad = useSelector((state: RootState) => state.ui.isInitialLoad);
  const isTerminalVisible = useSelector((state: RootState) => state.ui.isTerminalVisible);
  const terminalHeight = useSelector((state: RootState) => state.ui.terminalHeight);
  const wasClosedByUser = useSelector((state: RootState) => state.ui.wasClosedByUser);
  const isResourcesVisible = useSelector((state: RootState) => state.ui.isResourcesVisible);
  const isLeaderboardVisible = useSelector((state: RootState) => state.ui.isLeaderboardVisible);
  const dispatch = useDispatch();
  const [isToggleVisible, setIsToggleVisible] = useState(false);
  const [isTickerVisible, setIsTickerVisible] = useState(false);
  
  const initialEntries = [
    { type: 'output' as const, content: 'Welcome to YieldWars Terminal! Type help for available commands.' }
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

  // Handle toggle appearance
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsToggleVisible(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // Handle ticker appearance (slightly after globe)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTickerVisible(true);
      setIsToggleVisible(false);
    }, 9500); // Appears 500ms after globe starts appearing
    return () => clearTimeout(timer);
  }, []);

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
      <div className="relative flex flex-col items-center justify-center h-full w-full bg-black">
        {/* RetroGrid background - appears after delay */}
        <RetroGrid 
          className="fixed inset-0"
          angle={65}
          cellSize={30}
          opacity={0.2}
          lightLineColor="rgba(0, 255, 50, 0.5)"
          appearDelay={9000}
        />
        
        {/* Globe Toggle - Hidden on mobile */}
        <div className="fixed top-24 left-4 z-30 hidden lg:block">
          <GlobeToggle
            className={cn(
              "transition-opacity duration-1000",
              isToggleVisible ? "opacity-100" : "opacity-0"
            )}
            appearDelay={12000}
          />
        </div>

        {/* Main content on top of grid */}
        <div className="relative z-10 flex flex-col w-full items-center justify-center p-8 pt-16 lg:p-8">
          <div className="w-full flex items-center justify-center">
            <ComingSoonTerminal className="absolute w-full" disappearDelay={9000} />
            {isWorldFlat ? (
              <TwoDGlobe 
                className="fixed -top-20 left-0 right-0 bottom-0 z-20" 
                appearDelay={9000} 
                quickTransition={!isInitialLoad}
                markers={dataCenterMarkers}
              />
            ) : (
              <>
                <Globe 
                  className="fixed -top-10 left-0 right-0 bottom-0 z-20" 
                  appearDelay={9000} 
                  quickTransition={!isInitialLoad}
                  markers={globeMarkers}
                />
                <div className={cn(
                    "w-full mx-auto px-4 transition-opacity duration-1000",
                    isTickerVisible ? "opacity-100" : "opacity-0"
                  )}
                >
                  <MarkerTicker markers={globeMarkers} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resources Panel - Desktop Only */}
        {isResourcesVisible && (
            <div className="fixed top-48 left-4 z-20 hidden lg:block">
                <ResourcesCard />
            </div>
        )}

        {/* Squad & Referrals Panel (Leaderboard) - Desktop Only */}
        {isLeaderboardVisible && (
            <div className="fixed top-48 right-4 z-20 hidden lg:block">
                <SquadsReferralsCard />
            </div>
        )}

        {/* Mobile Panels */}
        {isResourcesVisible && (
            <div className="fixed inset-x-0 bottom-40 z-20 lg:hidden">
                <div className="bg-black/90 backdrop-blur-sm border-t border-green-500/20 p-4">
                    <ResourcesCard />
                </div>
            </div>
        )}

        {isLeaderboardVisible && (
            <div className="fixed inset-x-0 bottom-40 z-20 lg:hidden">
                <div className="bg-black/90 backdrop-blur-sm border-t border-green-500/20 p-4">
                    <SquadsReferralsCard />
                </div>
            </div>
        )}
      </div>

      {/* Terminal Layer - Adjusted for mobile */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        {isTerminalVisible && (
          <div className="absolute bottom-8 left-0 right-0 pointer-events-auto max-h-[60vh] sm:max-h-[70vh]" style={{ height: terminalHeight }}>
            <PrimaryTerminal 
              initialEntries={initialEntries}
              appearDelay={12000}
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
              appearDelay={9000}
              bypassDelay={wasClosedByUser}
            />
          </div>
        )}
      </div>
    </>
  );
}
