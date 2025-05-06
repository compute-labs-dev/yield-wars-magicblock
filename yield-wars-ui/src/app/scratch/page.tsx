"use client";
import { ScratchToReveal } from "@/components/ui/ScratchToReveal";
import { Keypair } from '@solana/web3.js';
import { useEffect, useState } from "react";
import { checkTransaction } from "@/utils/check-transaction";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { TransactionRequestQR } from "@/components/ui/SendTransactionRequest";

export default function ScratchPage() {
    const [reference, setReference] = useState(Keypair.generate().publicKey)


    // Periodically check the transaction status and reset the `reference` state variable once confirmed
    useEffect(() => {
        // Set an interval to check the transaction status every 1.5 seconds
        const interval = setInterval(() => {
            checkTransaction(reference, setReference)
        }, 2500)

        // Clear the interval when the component unmounts
        return () => {
            clearInterval(interval)
        }
    }, [reference])


    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <ScratchToReveal
                width={550}
                height={550}
                minScratchPercentage={20}
                className="flex items-center justify-center overflow-hidden rounded-2xl border-2 bg-gray-100"
                gradientColors={["#39FF14", "#00FF00", "#333438"]}
            >
                <TransactionRequestQR reference={reference} />
                <BorderBeam
                    duration={4}
                    size={400}
                    className="from-white via-blue-500 to-white"
                />
            </ScratchToReveal>
        </div>
    )
}