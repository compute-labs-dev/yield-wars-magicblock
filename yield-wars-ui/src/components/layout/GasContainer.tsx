import { usePrivy } from "@privy-io/react-auth";
import { sendFreeGas } from "@/hooks/server/sendFreeGas";
import { Fuel } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../ui/Dialog";

export default function GasContainer() {
    const { user } = usePrivy();

    const handleGetGas = async () => {
        console.log('user', user)
        if (!user || !user.wallet?.address) {
            return;
        }

        const receipt = await sendFreeGas(user.wallet?.address);
        console.log('receipt', receipt)
        toast.success(
            <div>
                <p>Free gas sent successfully</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost">
                    <Fuel className="w-4 h-4 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Get Free Gas</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                    Click the button below to get 0.1 SOL in free gas.
                </DialogDescription>
                <DialogFooter>
                    <Button onClick={handleGetGas}>
                        Get Gas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}