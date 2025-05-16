'use client'
import { ComingSoonTerminal } from "@/components/home/ComingSoonTerminal";
import React from 'react';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-transparent">
      <div className="relative z-10 flex flex-col w-full items-center justify-center p-8 pt-16 lg:p-8">
        <div className="w-full flex items-center justify-center">
          <ComingSoonTerminal className="absolute w-full" disappearDelay={5000} />
        </div>
      </div>
    </div>
  );
}
