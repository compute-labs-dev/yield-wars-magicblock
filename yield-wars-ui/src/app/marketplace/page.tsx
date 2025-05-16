"use client";

import { useEffect } from "react";
import { ExchangeContainer } from "@/components/marketplace/ExchangeContainer";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import PrimaryTerminal from "@/components/terminals/PrimaryTerminal";
import ShowTerminalButton from "@/components/terminals/ShowTerminalButton";
import { useState } from "react";
import { closeTerminal, setInitialLoad, setTerminalHeight, setTerminalVisible } from "@/stores/features/uiSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/stores/store";

export default function MarketplacePage() {
  const { ready } = usePrivy();
  const isInitialLoad = useSelector((state: RootState) => state.ui.isInitialLoad);
  const isTerminalVisible = useSelector((state: RootState) => state.ui.isTerminalVisible);
  const terminalHeight = useSelector((state: RootState) => state.ui.terminalHeight);
  const wasClosedByUser = useSelector((state: RootState) => state.ui.wasClosedByUser);
  const dispatch = useDispatch();

  const initialEntries = [
    { type: 'output' as const, content: 'Welcome to the Marketplace! Here you can swap your tokens! Type help for available commands.' }
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

  useEffect(() => {
    dispatch(setTerminalVisible(false));
  }, []);

  if (!ready) return (
    <div className="max-h-[80vh] overflow-y-scroll bg-black py-10">
        <div className="flex justify-center items-center h-full">
            <Loader2 className="w-10 h-10 animate-spin text-white" />
        </div>
    </div>
  )

  return (
    <div className="max-h-[80vh] overflow-y-scroll bg-black py-10">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Exchange</h1>
        </div>
        <ExchangeContainer />
        {/* Terminal Layer - Adjusted for mobile */}
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {isTerminalVisible && (
            <div className="absolute bottom-8 left-0 right-0 pointer-events-auto max-h-[60vh] sm:max-h-[70vh]" style={{ height: terminalHeight }}>
              <PrimaryTerminal 
                initialEntries={initialEntries}
                appearDelay={0}
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
                appearDelay={0}
                bypassDelay={wasClosedByUser}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}