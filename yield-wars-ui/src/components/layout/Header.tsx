import Image from "next/image";
import LoginContainer from "./LoginContainer";

export default function Header() {
    return (
        <div className="flex flex-col w-full">
            <header className="px-4 py-2 flex flex-row items-center justify-between bg-transparent relative z-50">
                <Image src={'/yield-wars-logo.svg'} alt="Yield Wars" width={250} height={250} />
                <LoginContainer />
            </header>
        </div>
    )
}