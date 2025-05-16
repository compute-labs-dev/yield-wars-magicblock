'use client';
// import { fetchAssets } from "@/lib/assets";
// import { WSOL_MINT, USDC_MINT } from "@/lib/consts";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

// interface TokenDetails {
//     name: string;
//     value: number;
//     priceChange24h: number;
// }

export default function Footer(
    {
        appearDelay = 0,
    }: {
        appearDelay?: number;
    }
) {
    const { user: privyUser} = usePrivy();
    // const [tokenList, setTokenList] = useState<TokenDetails[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    // async function getPrices() {
    //     const usdc = await fetchAssets({
    //         addresses: [USDC_MINT],
    //     });
    //     // 2 seconds delay
    //     await new Promise(resolve => setTimeout(resolve, 2000));
    //     const sol = await fetchAssets({
    //         addresses: [WSOL_MINT],
    //     });
    //     setTokenList([{
    //         name: "USDC",
    //         value: usdc.value,
    //         priceChange24h: usdc.priceChange24h,
    //     }, {
    //         name: "SOL",
    //         value: sol.value,
    //         priceChange24h: sol.priceChange24h,
    //     }]);

    // }

    // useEffect(() => {
    //     getPrices();
    // }, []);

    useEffect(() => {
        setTimeout(() => {
            setIsVisible(true);
        }, appearDelay);
    }, [appearDelay]);

    if (!isVisible) {
        return null;
    }

    return (
        <footer className={`px-4 flex flex-row w-full items-center justify-center lg:grid  ${privyUser?.wallet?.address ? 'grid-cols-3' : 'grid-cols-1'}`}>
            
            {privyUser?.wallet?.address && (
                <div className="flex flex-row items-center justify-start">
                    <h3 className="text-white">
                        CONNECTED
                    </h3>
                    <h3 className="text-green-200">
                        {`: ${privyUser?.wallet?.address.slice(0, 4)}...${privyUser?.wallet?.address.slice(-4)}`}
                    </h3>
                </div>
            )}

            {/* <div className="hidden lg:flex flex-row items-center gap-4 justify-center">
                {tokenList.map((token, index) => (
                    <div className="flex flex-row items-center justify-center" key={index}>
                        <h3 className="text-white mr-2">
                            {token.name}
                        </h3>

                        <h3 className="text-green-200">
                            {token.value.toFixed(2)}
                        </h3>
                        {index !== tokenList.length - 1 && (
                            <h3 className="text-green-200 ml-4">
                                :
                            </h3>
                        )}
                    </div>
                ))}
            </div> */}
        </footer>
    )
}