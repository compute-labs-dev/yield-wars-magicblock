'use client';

import Image from "next/image";
import { PrivyLogin } from "../privy/PrivyLogin";
import { usePrivy } from "@privy-io/react-auth";
import ProfileContainer from "../privy/ProfileContainer";
import ProfileIcon from "../privy/ProfileIcon";
import { useEffect, useState } from "react";

export default function Header() {
    const { user } = usePrivy();
    const [isInitialMount, setIsInitialMount] = useState(true);

    useEffect(() => {
        // If we ever had a user, we're no longer in initial mount state
        if (user) {
            setIsInitialMount(false);
        }
    }, [user]);

    return (
        <div className="flex flex-col w-full">
            <header className="px-4 py-2 flex flex-row items-center justify-between bg-transparent relative z-50">
                <Image src={'/yield-wars-logo.svg'} alt="Yield Wars" width={250} height={250} />
                {!user && <PrivyLogin appearDelay={isInitialMount ? 9000 : 0} />}
                {user && <ProfileIcon />}
                <ProfileContainer />
            </header>
            {/* Mobile Navigation */}
        </div>
    )
}