import { MagicBlockEngine } from '@/engine/MagicBlockEngine';
import { getComponentWalletOnChain } from '@/lib/constants/programIds';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Keypair } from '@solana/web3.js';

interface GetWalletBalanceParams {
    worldPda: string;
    userEntityPda: string;
    userWalletPublicKey: string;
}

interface WalletBalanceResult {
    usdc: number;
    btc: number;
    eth: number;
    sol: number;
    aifi: number;
}

export async function getWalletBalance({
    userEntityPda,
    userWalletPublicKey
}: GetWalletBalanceParams): Promise<WalletBalanceResult> {
    try {        
        // Create a temporary session key for reading
        const sessionKey = Keypair.generate();

        // Initialize the engine with required parameters
        const engine = new MagicBlockEngine(
            {} as ReturnType<typeof useSignTransaction>, // signTransaction not needed for reading
            {} as ReturnType<typeof usePrivy>, // privy not needed for reading
            {
                ready: true,
                wallets: [],
                createWallet: async () => ({
                    address: userWalletPublicKey,
                    publicKey: userWalletPublicKey,
                    label: 'Mock Wallet',
                    type: 'embedded',
                    chainType: 'solana',
                    imported: false,
                    delegated: false,
                    walletIndex: 0
                }),
                exportWallet: async () => { return; }
            } as ReturnType<typeof useSolanaWallets>, // minimal solanaWallets implementation
            sessionKey,
            {
                minLamports: 0,
                maxLamports: 0
            },
            process.env.NEXT_PUBLIC_RPC_URL!
        );
        
        // Get the wallet component program
        const walletProgram = getComponentWalletOnChain(engine);

        // Get the user's wallet component account
        const walletAccount = await walletProgram.account.wallet.fetch(userEntityPda);

        if (!walletAccount) {
            throw new Error('Wallet component not found');
        }

        // Return the balances
        return {
            usdc: Number(walletAccount.usdcBalance) / 1e6, // Convert from lamports
            btc: Number(walletAccount.btcBalance) / 1e8,   // Convert from satoshis
            eth: Number(walletAccount.ethBalance) / 1e18,  // Convert from wei
            sol: Number(walletAccount.solBalance) / 1e9,   // Convert from lamports
            aifi: Number(walletAccount.aifiBalance) / 1e6  // Convert from smallest unit
        };
    } catch (error) {
        console.error('Error in getWalletBalance:', error);
        throw error;
    }
} 