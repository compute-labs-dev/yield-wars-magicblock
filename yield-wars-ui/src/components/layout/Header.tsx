'use client';

import Image from "next/image";
import LoginContainer from "./LoginContainer";
import Link from "next/link";
import { Store } from "lucide-react";
export default function Header() {
    return (
        <div className="flex flex-col w-full">
            <header className="px-4 py-2 flex flex-row items-center justify-between bg-transparent relative z-50">
                <Image src={'/logo.svg'} alt="Yield Wars" width={250} height={250} />
                <div className="flex flex-row items-center gap-2">
                    <Link href="/supply-shack">
                        <Store className="w-6 h-6 mr-4 text-green-500" />
                    </Link>
                    <LoginContainer />
                </div>
            </header>
        </div>
    )
}