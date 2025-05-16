"use client";

import { ExchangeContainer } from "@/components/marketplace/ExchangeContainer";
import LoginContainer from "@/components/layout/LoginContainer";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";

export default function MarketplacePage() {
  const { ready, authenticated } = usePrivy();

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
      </div>
    </div>
  );
}