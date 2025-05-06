// Types for Solana UI components
import { PublicKey, Connection } from "@solana/web3.js";

export type SolAsset = {
    mint: PublicKey;
    name: string;
    symbol: string;
    image: string;
    decimals: number;
    price: number;
    userTokenAccount?: {
        address: PublicKey;
        amount: number;
    };        
}

export type FetchAssetsArgs = {
    addresses: PublicKey[];
    owner?: PublicKey;
    connection?: Connection;
};

export type FetchWalletArgs = {
    owner: PublicKey;
    limit?: number;
};