"use client";
import { ScratchToReveal } from "@/components/ui/ScratchToReveal";
import { Keypair } from '@solana/web3.js';
import { BorderBeam } from "@/components/ui/BorderBeam";
import { TransactionRequestQR } from "@/components/ui/SendTransactionRequest";
import LoginContainer from "@/components/layout/LoginContainer";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import GasContainer from "@/components/layout/GasContainer";
import { useEmptyWallet } from "@/hooks/useEmptyWallet";
export default function ScratchPage() {
    const { user } = usePrivy();
    const reference = Keypair.generate().publicKey
    const { emptyWallet } = useEmptyWallet();

    const handleClaimWinnings = async () => {
        const txn = await fetch(`/api/transaction?network=devnet&reference=${reference.toBase58()}`, {
            method: 'POST',
            body: JSON.stringify({ account: user?.wallet?.address }),
        });
        const txnData = await txn.json();
        // Send to new API route for server-side signing and sending
        const claimRes = await fetch('/api/claim-winnings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: txnData.transaction }),
        });
        const claimData = await claimRes.json();
        if (!claimRes.ok) {
            toast.error(claimData.error || 'Failed to claim winnings');
            return;
        }
        const receipt = claimData.txHash;
        toast.success(
            <div>
                <p>Winnings Claimed.</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        )
    }
    

    const handleEmptyWallet = async () => {
        const receipt = await emptyWallet(user?.wallet?.address as string)
        toast.success(
            <div>
                <p>Wallet Emptied.</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="flex flex-row items-center justify-center">
                {user && <GasContainer />}
                <LoginContainer />
            </div>
            {user && (
                <div className="flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        {user.email?.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {user.wallet?.address}
                    </p>
                </div>
            )}
            <ScratchToReveal
                width={550}
                height={550}
                minScratchPercentage={20}
                className="flex items-center justify-center overflow-hidden rounded-2xl border-2 bg-gray-100"
                gradientColors={["#39FF14", "#00FF00", "#333438"]}
                overlayImage="/logo-icon.svg"
            >
                <TransactionRequestQR reference={reference} />
                <BorderBeam
                    duration={4}
                    size={400}
                    className="from-white via-blue-500 to-white"
                />
            </ScratchToReveal>

            {user && (
                <div className="flex flex-col items-center justify-center">
                    <Button variant="ghost" className="w-full mt-4 bg-green-500" onClick={handleClaimWinnings}>
                        Claim Winnings
                    </Button>

                    <Button variant="ghost" className="w-full mt-4 bg-red-500" onClick={handleEmptyWallet}>
                        Empty Wallet
                    </Button>
                </div>
            )}
        </div>
    )
}