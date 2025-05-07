'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/Dialog"
import { Check, Edit, LogOut } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useMemo, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/stores/store";
import { toggleProfileContainerVisible } from "@/stores/features/uiSlice";
// import { useUser } from "@/hooks/useUser";
import { Input } from "@/components/ui/Input";

export default function ProfileContainer() {
    const { authenticated, logout, user: privyUser} = usePrivy();
    // const { user, updateEmail, isLoading, refresh } = useUser();
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [emailInput, setEmailInput] = useState("");
    const [editEmail, setEditEmail] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const isVisible = useSelector((state: RootState) => state.ui.isProfileContainerVisible);
    const dispatch = useDispatch();

    // Mock user data
    const user = useMemo(() => {
        return {
            email: {
                address: privyUser?.email?.address || 'null',
            },
            wallet: privyUser?.wallet?.address ?? 'null',
        }
    }, [
        privyUser?.email?.address,
        privyUser?.wallet?.address,
    ]);
    const updateEmail = useCallback(async (email: string) => {
        console.log("Updating email:", email);
        return true;
    }, []);
    
    const refresh = useCallback(() => {
        console.log("Refreshing user data");
    }, []);

    // Handle logout click
    const handleLogout = async () => {
        if (isDisconnecting) return; // Prevent multiple clicks
            
        setIsDisconnecting(true);

        try {
            await logout();
            if (editEmail) {
                setEmailInput("");
                setEditEmail(false);
            }
            // Close the dialog after disconnecting
            dispatch(toggleProfileContainerVisible());
        } catch (error) {
            console.error("Error disconnecting wallet:", error);
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Handle email update
    const handleEmailUpdate = async () => {
        if (!emailInput || !user) return;
        if (emailInput === user.email.address) {
            setEditEmail(false);
            return;
        }
        setIsUpdatingEmail(true);
        try {
            const success = await updateEmail(emailInput);
            if (success) {
                setEmailInput(""); // Clear input on success
            }
        } catch (error) {
            console.error("Error updating email:", error);
        } finally {
            setIsUpdatingEmail(false);
            refresh()
        }
    };

    const handleEditEmail = () => {
        // setEmailInput(user?.email || "");   
        setEditEmail(true);
    }

    if (!isVisible) return null;
    
    // Show error state if we're authenticated but no user data
    if (authenticated && !user) {
        return (
            <Dialog open={isVisible} onOpenChange={() => dispatch(toggleProfileContainerVisible())}>
                <DialogContent className="">
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>
                            Failed to load user data. Please try logging out and back in.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }
    
    return (
        <Dialog open={isVisible} onOpenChange={() => dispatch(toggleProfileContainerVisible())}>
            <DialogContent className="flex flex-col gap-4 bg-black/80 border-2 border-green-500">
                <DialogTitle className="hidden">Profile</DialogTitle>
                {user && authenticated && (
                    <>
                        <div className="flex flex-col gap-2 w-full px-2">
                            <div className="flex w-full justify-between items-center">
                                <p className="text-white flex w-full justify-between">Solana Wallet: 
                                    <span className="text-green-500 font-bold text-left w-1/2 flex">
                                        {user.wallet && `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`}
                                    </span>
                                </p>
                            </div>
                            <div className="flex w-full justify-between items-center">
                                <p className="flex">Email:</p>
                                <div className="w-1/2 flex flex-col gap-2">
                                    {user.email.address && !editEmail ? (
                                        <div className="flex flex-row gap-2 items-center justify-between">
                                            <span className="text-green-500 font-bold text-left flex">{user.email.address}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                disabled={isUpdatingEmail}
                                                onClick={() => handleEditEmail()}
                                            > 
                                                <Edit className="w-4 h-4 text-white" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-row gap-2 items-center justify-between">
                                            <Input
                                                type="email"
                                                placeholder={user?.email?.toString() || "Enter your email"}
                                                value={emailInput}
                                                onChange={(e) => setEmailInput(e.target.value)}
                                                required
                                                className="w-full h-6 text-white"
                                            />
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={handleEmailUpdate} 
                                                disabled={isUpdatingEmail}
                                            >
                                                <Check className="w-4 h-4 text-white" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button  
                                variant="secondary" 
                                onClick={handleLogout}
                                disabled={!authenticated}
                                className="flex items-center cursor-pointer"
                            >
                                {isDisconnecting ? (
                                    <span className="flex items-center text-muted-foreground">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Disconnecting...
                                    </span>
                                ) : (
                                    <div className="flex items-center text-muted-foreground">
                                        <LogOut className="w-4 h-4 mr-2 text-muted-foreground" />
                                        Logout
                                    </div>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}