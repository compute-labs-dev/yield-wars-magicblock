"use client";
import { ScratchToReveal } from "@/components/ui/ScratchToReveal";
import { Keypair, PublicKey, Transaction, Connection, VersionedTransaction } from '@solana/web3.js';
import { BN } from "@coral-xyz/anchor";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { TransactionRequestQR } from "@/components/ui/SendTransactionRequest";
import LoginContainer from "@/components/layout/LoginContainer";
import { usePrivy } from "@privy-io/react-auth";
import { useSignTransaction } from '@privy-io/react-auth/solana';
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import GasContainer from "@/components/layout/GasContainer";
import { useEmptyWallet } from "@/hooks/useEmptyWallet";
import React, { useState, useEffect } from "react";
import { useInitializeUserWallet } from "@/hooks/program/useInitializeUserWallet";
import { useTransferCurrency } from "@/hooks/program/useTransferCurrency";
import { useExchangeCurrency } from "@/hooks/program/useExchangeCurrency";
import { CurrencyType } from "@/lib/constants/programEnums";
import { useSignAndSendTransaction } from "@/hooks/useSignAndSendTransaction";
import {
    FindComponentPda,
    FindEntityPda,
    World,
} from "@magicblock-labs/bolt-sdk";
import { useMagicBlockEngine } from "@/engine/MagicBlockEngineProvider";
import { 
    componentWallet, 
    componentPrice, 
    systemEconomy, 
    componentOwnership, 
    getComponentWalletOnChain, 
    getComponentOwnershipOnChain 
} from "@/lib/constants/programIds";
import { useDispatch, useSelector } from 'react-redux';
import { selectUserEntity, setCurrentEntity, setUserEntity } from '@/stores/features/userEntityStore';
import { RootState } from '@/stores/store';

export default function ScratchPage() {
    // Always declare all hooks at the top level, before any conditional logic
    const [isClient, setIsClient] = useState(false);
    const [initializedUserEntityPda, setInitializedUserEntityPda] = useState<string>("");
    const [worldPdaInit, setWorldPdaInit] = useState<string>("EEfArU3WrMMf1KqYFNbegu63xx2FMfrkGS7A4uCXzrnq");
    const [transferSourceEntity, setTransferSourceEntity] = useState<string>("");
    const [transferDestEntity, setTransferDestEntity] = useState<string>("");
    const [transferCurrencyType, setTransferCurrencyType] = useState<CurrencyType>(CurrencyType.USDC);
    const [transferAmount, setTransferAmount] = useState<string>("1");
    const [exchangeUserEntity, setExchangeUserEntity] = useState<string>("");
    const [exchangeSourcePriceEntity, setExchangeSourcePriceEntity] = useState<string>("");
    const [exchangeDestPriceEntity, setExchangeDestPriceEntity] = useState<string>("");
    const [exchangeSourceCurrency, setExchangeSourceCurrency] = useState<CurrencyType>(CurrencyType.USDC);
    const [exchangeDestCurrency, setExchangeDestCurrency] = useState<CurrencyType>(CurrencyType.BTC);
    const [exchangeAmount, setExchangeAmount] = useState<string>("10");

    // Always use non-conditional hooks first
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Component hooks that don't depend on React-Redux
    const engine = useMagicBlockEngine();
    const { user, ready, authenticated } = usePrivy();
    const { signTransaction: privySignTransactionDirect } = useSignTransaction();
    const { signAndSend, processing, receipt } = useSignAndSendTransaction();
    const solanaConnection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
    const reference = Keypair.generate().publicKey;
    const { emptyWallet } = useEmptyWallet();
    
    // React-Redux hooks that should only be used on the client
    const dispatch = useDispatch();
    const userEntity = useSelector((state: RootState) => 
        user?.wallet?.address ? selectUserEntity(state, user.wallet.address) : null
    );

    // Hooks for wallet operations
    const { 
        initializeWallet, 
        initializeWalletAsync,
        isLoading: isLoadingInitWallet, 
        data: initWalletData 
    } = useInitializeUserWallet();
    const { transferCurrency, isLoading: isLoadingTransfer } = useTransferCurrency();
    const { exchangeCurrency, isLoading: isLoadingExchange } = useExchangeCurrency();

    useEffect(() => {
        if (initWalletData?.entityPda) {
            setInitializedUserEntityPda(initWalletData.entityPda);
            setTransferSourceEntity(initWalletData.entityPda);
            setExchangeUserEntity(initWalletData.entityPda);
            setExchangeSourcePriceEntity(initWalletData.entityPda);
            toast.info(`User Entity PDA Initialized: ${initWalletData.entityPda}`)
        }
    }, [initWalletData]);

    useEffect(() => {
        if (user?.wallet?.address) {
            if (userEntity) {
                console.log("Found entity in Redux store:", userEntity.entityPda);
                setInitializedUserEntityPda(userEntity.entityPda);
                if (isClient) {
                    dispatch(setCurrentEntity(userEntity.entityPda));
                }
                toast.success("Found your existing wallet");
            } else {
                console.log("No entity found in Redux store, trying on-chain detection");
                getWorldData();
            }
        }
    }, [user?.wallet?.address, userEntity, dispatch, isClient]);

    const handleClaimWinnings = async () => {
        const txn = await fetch(`/api/transaction?network=devnet&reference=${reference.toBase58()}`, {
            method: 'POST',
            body: JSON.stringify({ account: user?.wallet?.address }),
        });
        const txnData = await txn.json();
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

    const handleInitializeWallet = async () => {
        if (!user?.wallet?.address) {
            toast.error("User wallet not connected.");
            return;
        }
        try {
            // Use the correct function - mutate instead of mutateAsync if it returns void
            const result = await initializeWalletAsync({ 
                userPublicKey: user.wallet.address, 
                worldPda: worldPdaInit 
            });
            
            if (result && result.entityPda) {
                // Update UI state
                setInitializedUserEntityPda(result.entityPda);
                toast.success(`Entity initialized: ${result.entityPda}`);
            }
        } catch (e: any) { 
            toast.error("Init wallet failed: " + e.message)
        }
    };

    const handleTransfer = async () => {
        if (!user?.wallet?.address || !privySignTransactionDirect) {
            toast.error("User wallet not connected or Privy signer not available.");
            return;
        }
        if (!transferSourceEntity || !transferDestEntity || !transferAmount) {
            toast.error("Please fill all transfer fields.");
            return;
        }
        try {
            const privySignerForHook = {
                signTransaction: async (options: { transaction: Transaction; connection: Connection; uiOptions?: any }) => {
                    await privySignTransactionDirect(options);
                }
            };

            const params = {
                worldPda: worldPdaInit,
                sourceEntityPda: transferSourceEntity,
                destinationEntityPda: transferDestEntity,
                currencyType: Number(transferCurrencyType) as CurrencyType,
                amount: parseInt(transferAmount) * (10**6),
                userWalletPublicKey: new PublicKey(user.wallet.address),
                privySigner: privySignerForHook
            };
            await transferCurrency(params);
        } catch (e: any) { 
            toast.error("Transfer failed: " + e.message)
        }
    };

    const handleExchange = async () => {
        if (!user?.wallet?.address || !privySignTransactionDirect) {
            toast.error("User wallet not connected or Privy signer not available.");
            return;
        }
        if (!exchangeUserEntity || !exchangeSourcePriceEntity || !exchangeDestPriceEntity || !exchangeAmount) {
            toast.error("Please fill all exchange fields.");
            return;
        }
        try {
            const privySignerForHook = {
                signTransaction: async (options: { transaction: Transaction; connection: Connection; uiOptions?: any }) => {
                    await privySignTransactionDirect(options);
                }
            };
            const params = {
                worldPda: worldPdaInit,
                userEntityPda: exchangeUserEntity,
                sourceCurrencyPriceEntityPda: exchangeSourcePriceEntity,
                destinationCurrencyPriceEntityPda: exchangeDestPriceEntity,
                sourceCurrencyType: Number(exchangeSourceCurrency) as CurrencyType,
                destinationCurrencyType: Number(exchangeDestCurrency) as CurrencyType,
                amountToExchange: parseInt(exchangeAmount) * (10**6),
                userWalletPublicKey: new PublicKey(user.wallet.address),
                privySigner: privySignerForHook
            };
            await exchangeCurrency(params);
        } catch (e: any) { 
            toast.error("Exchange failed: " + e.message)
        }
    };

    const currencyOptions = Object.keys(CurrencyType)
        .filter(key => !isNaN(Number(CurrencyType[key as keyof typeof CurrencyType])))
        .map(key => (
            <option key={key} value={CurrencyType[key as keyof typeof CurrencyType]}>
                {key}
            </option>
        ));


    async function getWorldData() {
        try {
            const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
            
            // Log current user for debugging
            console.log("Current user wallet address:", user?.wallet?.address);
            
            if (!user?.wallet?.address) {
                console.warn("User wallet address is undefined! Cannot check ownership.");
                return;
            }

            const world = await World.fromAccountAddress(
                solanaConnection,
                new PublicKey(worldPdaInit),
                "confirmed"
            );
            console.log("World: ", world.entities.length);
            console.log('World entities: ', Number(world.entities));
            
            // The approach here needs to be simplified - look for ALL components that are owned by the user
            // Each component has a boltMetadata.authority field that indicates who owns it
            let entityId = world.entities;
            let found = false;
            
            while (!entityId.isNeg() && !found) {
                const entityPda = FindEntityPda({
                    worldId: world.id,
                    entityId: entityId
                });
                console.log("Checking Entity PDA:", entityPda.toBase58());
                
                // First, check if the entity has any components
                try {
                    // Try to get the wallet component - if it exists, we can check its boltMetadata
                    const walletPda = FindComponentPda({
                        componentId: new PublicKey(componentWallet.address),
                        entity: entityPda,
                    });
                    
                    const walletInfo = await connection.getAccountInfo(walletPda);
                    if (walletInfo) {
                        console.log("Found wallet component at:", walletPda.toBase58());
                        
                        try {
                            // Decode the wallet component
                            const walletCoder = getComponentWalletOnChain(engine).coder;
                            const wallet = walletCoder.accounts.decode("wallet", walletInfo.data);
                            
                            // Check the boltMetadata.authority
                            if (wallet && wallet.boltMetadata && wallet.boltMetadata.authority) {
                                const ownerAddress = wallet.boltMetadata.authority.toBase58();
                                console.log("Wallet component owned by:", ownerAddress);
                                
                                // Compare with the current user's wallet
                                if (ownerAddress === user.wallet.address) {
                                    console.log("🎯 MATCH FOUND! Entity belongs to current user:", entityPda.toBase58());
                                    setInitializedUserEntityPda(entityPda.toBase58());
                                    found = true;
                                    break;
                                } else {
                                    console.log("Entity owned by different address:", ownerAddress);
                                }
                            }
                        } catch (error) {
                            console.error("Error decoding wallet component:", error);
                        }
                    }
                } catch (error) {
                    console.error("Error finding wallet component:", error);
                }
                
                // If we're still looking, decrement the entity ID to check the next one
                entityId = entityId.subn(1);
            }
            
            if (!found) {
                console.log("No entity found owned by the current user:", user.wallet.address);
            }
        } catch (error) {
            console.error("Error in getWorldData:", error);
        }
    }

    const handleSignAndSendTransaction = async (transaction: VersionedTransaction) => {
        const receipt = await signAndSend(transaction);
        toast.success(
            <div>
                <p>Transaction Signed and Sent.</p>
                <Link className="text-blue-500" href={`https://explorer.solana.com/tx/${receipt}?cluster=devnet`} target="_blank">View on Solana Explorer</Link>
            </div>
        )
    }

    useEffect(() => {
        getWorldData()
    }, [user?.wallet?.address])

    if (!ready) return <p>Loading Privy...</p>;
    if (!authenticated) return <LoginContainer />;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4">
            <div className="flex flex-row items-center justify-center mb-4">
                {user && <GasContainer />}
                <LoginContainer />
            </div>
            {user && (
                <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                        Email: {user.email?.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Wallet: {user.wallet?.address}
                    </p>
                     {initializedUserEntityPda && <p className="text-sm text-green-500">Initialized Entity: {initializedUserEntityPda}</p>}
                </div>
            )}

            {user && (
            <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-center text-white">Initialize Game Wallet</h2>
                {/* <div className="mb-3">
                    <label className="block text-sm font-medium mb-1 text-white">World PDA (Defaults to Bolt World ID)</label>
                    <Input className="mb-2 text-white" value={worldPdaInit} onChange={(e) => setWorldPdaInit(e.target.value)} placeholder="World PDA" />
                </div> */}
                <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={handleInitializeWallet} disabled={isLoadingInitWallet || !user?.wallet?.address}>
                    {isLoadingInitWallet ? "Initializing..." : "Initialize Wallet"}
                </Button>
            </div>
            )}

            {user && initializedUserEntityPda && (
            <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-center text-white">Transfer Currency</h2>
                <Input className="mb-2 text-white" value={transferSourceEntity} onChange={(e) => setTransferSourceEntity(e.target.value)} placeholder="Your Entity PDA (auto-filled if initialized)" />
                <Input className="mb-2 text-white" value={transferDestEntity} onChange={(e) => setTransferDestEntity(e.target.value)} placeholder="Recipient Entity PDA" />
                <select className="mb-2 w-full p-2 border rounded text-white" value={transferCurrencyType} onChange={(e) => setTransferCurrencyType(Number(e.target.value) as CurrencyType)}>
                    {currencyOptions}
                </select>
                <Input className="mb-2" type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Amount (e.g., 1 for 1 USDC)" />
                <Button className="w-full bg-green-500 hover:bg-green-600" onClick={handleTransfer} disabled={isLoadingTransfer || !user?.wallet?.address || !privySignTransactionDirect}>
                    {isLoadingTransfer ? "Transferring..." : "Transfer"}
                </Button>
            </div>
            )}

            {user && initializedUserEntityPda && (
            <div className="w-full max-w-md p-4 mb-6 border rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3 text-center text-white">Exchange Currency</h2>
                <Input className="mb-2 text-white" value={exchangeUserEntity} onChange={(e) => setExchangeUserEntity(e.target.value)} placeholder="Your Entity PDA (auto-filled)" />
                <label className="block text-sm font-medium mb-1 text-white">Source Currency</label>
                <select className="mb-2 w-full p-2 border rounded text-white" value={exchangeSourceCurrency} onChange={(e) => setExchangeSourceCurrency(Number(e.target.value) as CurrencyType)}>
                    {currencyOptions}
                </select>
                <Input className="mb-2 text-white" type="number" value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)} placeholder="Amount to Sell (e.g., 10 for 10 USDC)" />
                <label className="block text-sm font-medium mb-1 text-white">Destination Currency</label>
                <select className="mb-2 w-full p-2 border rounded text-white" value={exchangeDestCurrency} onChange={(e) => setExchangeDestCurrency(Number(e.target.value) as CurrencyType)}>
                    {currencyOptions}
                </select>
                <Input className="mb-2 text-white" value={exchangeSourcePriceEntity} onChange={(e) => setExchangeSourcePriceEntity(e.target.value)} placeholder="Source Price Entity PDA (auto-filled)" />
                <Input className="mb-2 text-white" value={exchangeDestPriceEntity} onChange={(e) => setExchangeDestPriceEntity(e.target.value)} placeholder="Destination Price Entity PDA" />
                <Button className="w-full bg-purple-500 hover:bg-purple-600" onClick={handleExchange} disabled={isLoadingExchange || !user?.wallet?.address || !privySignTransactionDirect}>
                    {isLoadingExchange ? "Exchanging..." : "Exchange"}
                </Button>
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