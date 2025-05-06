"use client";

import {
    AnimatedSpan,
    Terminal,
    TypingAnimation,
} from "@/components/ui/Terminal";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ComingSoonTerminalProps {
    /**
     * Delay in milliseconds before the terminal disappears
     * @default undefined (terminal stays visible)
     */
    disappearDelay?: number;
    className?: string;
}

export function ComingSoonTerminal({ disappearDelay, className }: ComingSoonTerminalProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (disappearDelay) {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, disappearDelay);

            return () => clearTimeout(timer);
        }
    }, [disappearDelay]);

    return (
        <div className={cn(
            "transition-all duration-1000",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            className
        )}>
            <Terminal className="w-full max-w-xl mx-auto bg-black border border-green-500/50 shadow-lg shadow-green-500/20">
                <TypingAnimation className="text-green-500">&gt; Welcome to Yield Wars</TypingAnimation>
                <TypingAnimation delay={1000} className="text-white">&gt; Preparing system...</TypingAnimation>
                <AnimatedSpan delay={2500} className="text-green-500">
                    <span>✔ Checking registry.</span>
                </AnimatedSpan>

                <AnimatedSpan delay={3000} className="text-green-500">
                    <span>✔ Verifying resources...</span>
                </AnimatedSpan>

                <AnimatedSpan delay={3500} className="text-green-500">
                    <span>✔ GPUs Located...</span>
                </AnimatedSpan>

                <AnimatedSpan delay={4000} className="text-green-500">
                    <span>✔ Validating players...</span>
                </AnimatedSpan>

                <AnimatedSpan delay={4500} className="text-green-500">
                    <span>✔ Updating Leaderboard...</span>
                </AnimatedSpan>

                <AnimatedSpan delay={5000} className="text-blue-500">
                    <span>ℹ Updated 1 file:</span>
                    <span className="pl-2">- lib/utils.ts</span>
                </AnimatedSpan>

                <TypingAnimation delay={5500} className="text-white">
                    Success! Project initialization completed.
                </TypingAnimation>
            </Terminal>
        </div>
    );
}
