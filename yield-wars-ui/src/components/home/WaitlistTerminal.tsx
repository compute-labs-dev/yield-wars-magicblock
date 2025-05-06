"use client";

import {
    AnimatedSpan,
    Terminal,
    TypingAnimation,
} from "@/components/ui/Terminal";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useWaitlist } from "@/hooks/useWaitlist";
import { CopyIcon } from "@radix-ui/react-icons";

interface WaitlistTerminalProps {
    className?: string;
}

export function WaitlistTerminal({ className }: WaitlistTerminalProps) {
    const [email, setEmail] = useState("");
    const [refByCode, setRefByCode] = useState<string | undefined>(undefined);
    const [referralLink, setReferralLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { submitToWaitlist, loading, error, success, refCode, isExistingUser } = useWaitlist();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const queryParams = new URLSearchParams(window.location.search);
            const ref = queryParams.get('ref_by');
            if (ref) {
                setRefByCode(ref);
                console.log("Referral code found in URL:", ref);
            }
        }
    }, []);

    useEffect(() => {
        if (success && refCode && typeof window !== 'undefined') {
            const baseUrl = window.location.origin + window.location.pathname;
            const link = `${baseUrl}?ref_by=${refCode}`;
            setReferralLink(link);
        } else {
            setReferralLink(null);
        }
    }, [success, refCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCopied(false);
        console.log(`Submitting email: ${email}, referred by: ${refByCode || 'N/A'}`);
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                console.error("Invalid email format on client");
                return;
            }
            await submitToWaitlist(email, refByCode);
        }
    };

    const handleCopy = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const isDisabled = loading || success;

    return (
        <div className={cn("transition-all duration-1000 px-4 sm:px-6 md:px-0 max-w-full", className)}>
            <Terminal className="w-full max-w-2xl mx-auto bg-black border border-green-500/50 shadow-lg shadow-green-500/20 overflow-hidden">
                <TypingAnimation className="text-green-500 break-words whitespace-pre-wrap">&gt; Welcome to Yield Wars</TypingAnimation>
                <TypingAnimation delay={1000} className="text-white break-words whitespace-pre-wrap">&gt; Checking system status...</TypingAnimation>
                
                <AnimatedSpan delay={2000} className="text-green-500 break-words whitespace-pre-wrap">
                    <span>✔ Initializing connection...</span>
                </AnimatedSpan>

                <AnimatedSpan delay={2500} className="text-green-500 break-words whitespace-pre-wrap">
                    <span>✔ Checking registry...</span>
                </AnimatedSpan>

                <AnimatedSpan delay={3000} className="text-red-500 break-words whitespace-pre-wrap">
                    <span>✖ Error: Access Restricted</span>
                </AnimatedSpan>

                <AnimatedSpan delay={3500} className="text-red-500 break-words whitespace-pre-wrap">
                    <span>✖ System currently in private beta</span>
                </AnimatedSpan>

                <AnimatedSpan delay={4000} className="text-yellow-500 break-words whitespace-pre-wrap">
                    <span>⚠ Join the waitlist for early access and referral code</span>
                </AnimatedSpan>

                <AnimatedSpan delay={4500}>
                    {!success && (
                        <form onSubmit={handleSubmit} className="mt-2">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <span className="text-green-500 hidden sm:inline">&gt;</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="flex-1 bg-transparent border border-green-500/30 rounded px-2 py-1 text-green-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isDisabled}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isDisabled}
                                    className="px-3 py-1 bg-green-500/20 text-green-500 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                                >
                                    {loading ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    )}
                </AnimatedSpan>

                {loading && (
                    <AnimatedSpan delay={100} className="text-yellow-500 break-words whitespace-pre-wrap">
                        <span>⏳ Submitting email... Please wait.</span>
                    </AnimatedSpan>
                )}

                {success && refCode && referralLink && (
                    <AnimatedSpan delay={100} className="text-green-500">
                        <span className="break-words whitespace-pre-wrap">{isExistingUser ? "✔ Welcome back! You're already on the waitlist." : "✔ Success! You're on the waitlist."}</span>
                        <br/>
                        <span className="text-white break-words whitespace-pre-wrap">Your referral code: <span className="font-bold text-yellow-300">{refCode}</span></span>
                        <br/>
                        <span className="text-gray-400 break-words whitespace-pre-wrap">Share your link to move up the list:</span>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
                           <span className="text-xs text-cyan-400 break-all max-w-full overflow-hidden text-ellipsis">{referralLink}</span>
                           <button
                                onClick={handleCopy}
                                title="Copy link"
                                className="p-1 border border-cyan-500/30 rounded text-cyan-500 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 shrink-0"
                                disabled={copied}
                           >
                               <CopyIcon className="w-3 h-3" />
                           </button>
                           {copied && <span className="text-xs text-cyan-500 whitespace-nowrap">Copied!</span>}
                        </div>
                    </AnimatedSpan>
                )}

                {error && !loading && (
                    <AnimatedSpan delay={100} className="text-red-500 break-words whitespace-pre-wrap">
                        <span>✖ Error: {error}</span>
                    </AnimatedSpan>
                )}
            </Terminal>
        </div>
    );
}
