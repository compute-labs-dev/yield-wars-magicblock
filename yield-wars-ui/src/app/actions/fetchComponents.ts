'use server';

import { Connection, PublicKey } from '@solana/web3.js';
import { FindComponentPda, World } from '@magicblock-labs/bolt-sdk';
import { componentWallet, componentPrice } from '@/lib/constants/programIds';

interface WalletBalanceData {
  usdcBalance: number;
  btcBalance: number;
  ethBalance: number;
  solBalance: number;
  aifiBalance: number;
}

interface PriceComponentData {
  currentPrice: number;
  priceType: number;
  priceUpdatesEnabled: boolean;
}

export async function fetchWalletBalance(walletComponentPda: string): Promise<WalletBalanceData | null> {
  try {
    // Create connection to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com',
      { 
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );

    // Validate input
    if (!walletComponentPda) {
      throw new Error("Missing wallet component PDA");
    }

    // Fetch the wallet component account data
    const accountInfo = await connection.getAccountInfo(
      new PublicKey(walletComponentPda),
      'confirmed'
    );

    if (!accountInfo || !accountInfo.data) {
      console.log("No wallet component found at:", walletComponentPda);
      return null;
    }

    // Parse the wallet component data
    // The wallet component has the following structure:
    // - 8 bytes discriminator
    // - 8 bytes for usdcBalance (u64)
    // - 8 bytes for btcBalance (u64)
    // - 8 bytes for ethBalance (u64)
    // - 8 bytes for solBalance (u64)
    // - 8 bytes for aifiBalance (u64)
    const dataView = new DataView(accountInfo.data.buffer);
    
    // Skip 8 bytes discriminator and read u64 values (8 bytes each)
    const usdcBalance = Number(readBigUInt64LE(dataView, 8));
    const btcBalance = Number(readBigUInt64LE(dataView, 16));
    const ethBalance = Number(readBigUInt64LE(dataView, 24));
    const solBalance = Number(readBigUInt64LE(dataView, 32));
    const aifiBalance = Number(readBigUInt64LE(dataView, 40));

    return {
      usdcBalance,
      btcBalance,
      ethBalance,
      solBalance,
      aifiBalance
    };
  } catch (error) {
    console.error("Error in fetchWalletBalance:", error);
    return null;
  }
}

export async function fetchPriceComponent(priceComponentPda: string): Promise<PriceComponentData | null> {
  try {
    // Create connection to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com',
      { 
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );

    // Validate input
    if (!priceComponentPda) {
      throw new Error("Missing price component PDA");
    }

    // Fetch the price component account data
    const accountInfo = await connection.getAccountInfo(
      new PublicKey(priceComponentPda),
      'confirmed'
    );

    if (!accountInfo || !accountInfo.data) {
      console.log("No price component found at:", priceComponentPda);
      return null;
    }

    // Parse the price component data
    // The price component has the following structure:
    // - 8 bytes discriminator
    // - 8 bytes for currentPrice (u64)
    // - 1 byte for priceType (u8)
    // - 1 byte for priceUpdatesEnabled (bool)
    const dataView = new DataView(accountInfo.data.buffer);
    
    // Skip 8 bytes discriminator
    const currentPrice = Number(readBigUInt64LE(dataView, 8));
    const priceType = dataView.getUint8(16);
    const priceUpdatesEnabled = dataView.getUint8(17) === 1;

    return {
      currentPrice,
      priceType,
      priceUpdatesEnabled
    };
  } catch (error) {
    console.error("Error in fetchPriceComponent:", error);
    return null;
  }
}

// Helper function to read BigUInt64LE (8 bytes) from DataView
function readBigUInt64LE(dataView: DataView, offset: number): bigint {
  try {
    return dataView.getBigUint64(offset, true); // true for little-endian
  } catch (error) {
    // Fallback for environments that don't support getBigUint64
    const low = dataView.getUint32(offset, true);
    const high = dataView.getUint32(offset + 4, true);
    return BigInt(low) + (BigInt(high) << BigInt(32));
  }
} 