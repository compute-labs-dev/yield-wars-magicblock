// import { useWalletBalance } from "@/hooks/program/useWalletBalance";
// import { formatCurrency } from "@/lib/utils/formatters";

// interface SupplyShackHeaderProps {
//     user: User | null;
// }

export function SupplyShackHeader() {
    // const { balances, isLoading: isLoadingBalances } = useWalletBalance(user?.wallet?.address);

    // const balances = {
    //     usdc: 100,
    //     btc: 0.0001,
    //     eth: 0.0001,
    //     sol: 0.0001,
    //     aifi: 0.0001
    // };

    // const isLoadingBalances = false;

    return (
        <div className="flex flex-col space-y-4 mb-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Supply Shack</h1>
                {/* <div className="flex items-center space-x-6">
                    {isLoadingBalances ? (
                        <p className="text-gray-400">Loading balances...</p>
                    ) : (
                        <>
                            <div className="flex items-center space-x-2">
                                <span className="text-blue-400">USDC:</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(balances.usdc || 0)}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-yellow-400">BTC:</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(balances.btc || 0)}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-green-400">ETH:</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(balances.eth || 0)}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-purple-400">SOL:</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(balances.sol || 0)}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-pink-400">AIFI:</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(balances.aifi || 0)}
                                </span>
                            </div>
                        </>
                    )}
                </div> */}
            </div>
            <p className="text-gray-400">
                Purchase and manage your mining equipment
            </p>
        </div>
    );
} 