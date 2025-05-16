import { Connection, PublicKey } from '@solana/web3.js';
import { decodeBoltComponent, DecodedComponent } from './bolt-decoder';

interface WalletData {
  type: 'Wallet';
  data: {
    usdcBalance: bigint;
    btcBalance: bigint;
    ethBalance: bigint;
    solBalance: bigint;
    aifiBalance: bigint;
  };
}

interface OwnershipData {
  type: 'Ownership';
  data: {
    ownerType: number;
    ownerEntity?: string;
    ownedEntities: string[];
    ownedEntityTypes: number[];
  };
}

interface PriceData {
  type: 'Price';
  data: {
    currentPrice: bigint;
  };
}

interface RegistryData {
  type: 'Registry';
  size: number;
  owner: string;
  error?: string;
  data: Record<string, unknown>;
}

interface WorldData {
  type: 'World';
  size: number;
  executable: boolean;
  owner: string;
  data: Record<string, unknown>;
}

interface ErrorData {
  type: 'Error';
  error: string;
  dataSize: string;
  data: Record<string, unknown>;
}

type DecodedAccountData = WalletData | OwnershipData | PriceData | RegistryData | WorldData | ErrorData | DecodedComponent | null;

interface DecodedProgramAccount {
  address: string;
  decoded: DecodedAccountData;
  lamports: number;
  owner: string;
  executable: boolean;
  rentEpoch: number | undefined;
  size: number;
}

interface RegistryDetailedResponse {
  exists: boolean;
  owner?: string;
  data?: {
    size: number;
    discriminator?: string;
  };
  error?: string;
}

/**
 * Attempts to decode account data using MagicBlock SDK or fallback to generic decoder
 * 
 * @param connection Active Solana connection
 * @param accountAddress The address of the account to decode
 * @param programId The program ID that owns the account
 * @returns Decoded account data or null if decoding fails
 */
export async function decodeAccountData(
  connection: Connection, 
  accountAddress: string, 
  programId: string
): Promise<DecodedAccountData> {
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(accountAddress));
    if (!accountInfo) {
      return null;
    }
    
    // Attempt to decode based on program ID
    switch (programId) {
      // Wallet component
      case 'BXYCAQBizX4Pddjq5XivVEQn9Tbc7NF9zzLd3CSUXysz':
        try {
          // Use SDK if possible, or fallback to generic
          // Note: This is placeholder - actual SDK method depends on exported types
          return {
            type: 'Wallet',
            data: {
              usdcBalance: accountInfo.data.slice(8, 16).readBigUInt64LE(0),
              btcBalance: accountInfo.data.slice(16, 24).readBigUInt64LE(0),
              ethBalance: accountInfo.data.slice(24, 32).readBigUInt64LE(0),
              solBalance: accountInfo.data.slice(32, 40).readBigUInt64LE(0),
              aifiBalance: accountInfo.data.slice(40, 48).readBigUInt64LE(0),
            }
          };
        } catch (err) {
          console.error('Error decoding Wallet component:', err);
          return decodeBoltComponent(accountInfo.data, programId);
        }
        
      // Ownership component
      case '4M5dU6my7BmVMoAUYmRa3ZnJRMMQzW7e4Yf32wiPh9wS':
        try {
          console.log('Decoding ownership component...');
          const decoded = decodeBoltComponent(accountInfo.data, programId);
          console.log('Raw decoded ownership data:', decoded);

          if (!decoded) {
            throw new Error('Failed to decode ownership data - null result');
          }

          // Even if ownedEntities is empty, we should still return a valid ownership structure
          return {
            type: 'Ownership',
            data: {
              ownerType: decoded.data.ownerType ?? 0,
              ownerEntity: decoded.data.ownerEntity?.toBase58(),
              ownedEntities: (decoded.data.ownedEntities || []).map(e => e.toBase58()),
              ownedEntityTypes: decoded.data.ownedEntityTypes || []
            }
          };
        } catch (err) {
          console.error('Error decoding Ownership component:', err);
          // Don't fall back to basic decoder since we want to preserve the error
          throw err;
        }
        
      // Price component
      case 'DTtX2W21uM3oRdJCSTzmjb5ujvY7i6aA1kbEakeBbrV6':
        try {
          return {
            type: 'Price',
            data: {
              currentPrice: accountInfo.data.slice(8, 16).readBigUInt64LE(0),
              // Other price fields would follow in data structure
            }
          };
        } catch (err) {
          console.error('Error decoding Price component:', err);
          return decodeBoltComponent(accountInfo.data, programId);
        }
        
      // Registry account
      case 'EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K':
        try {
          // Registry has special structure - attempt to decode or return basic info
          return {
            type: 'Registry',
            size: accountInfo.data.length,
            owner: accountInfo.owner.toString(),
            data: {
              size: accountInfo.data.length,
              discriminator: Buffer.from(accountInfo.data.slice(0, 8)).toString('hex')
            }
          };
        } catch (err) {
          console.error('Error decoding Registry account:', err);
          return {
            type: 'Registry',
            size: accountInfo.data.length,
            owner: accountInfo.owner.toString(),
            error: 'Failed to decode registry',
            data: {
              size: accountInfo.data.length
            }
          };
        }
        
      // World program
      case 'WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n':
        return {
          type: 'World',
          size: accountInfo.data.length,
          executable: accountInfo.executable,
          owner: accountInfo.owner.toString(),
          data: {}
        };
        
      // Default - try generic decoder
      default:
        return decodeBoltComponent(accountInfo.data, programId);
    }
  } catch (err) {
    console.error('Error decoding account:', err);
    return {
      type: 'Error',
      error: `Failed to decode: ${(err as Error).message}`,
      dataSize: 'unknown',
      data: {}
    };
  }
}

/**
 * Fetches and decodes all accounts for a specific program
 * 
 * @param connection Active Solana connection
 * @param programId Program ID to fetch accounts for
 * @returns Array of decoded account data objects
 */
export async function fetchProgramAccountsDetailed(
  connection: Connection,
  programId: string
): Promise<DecodedProgramAccount[]> {
  try {
    const accounts = await connection.getProgramAccounts(new PublicKey(programId));
    
    return Promise.all(
      accounts.map(async ({ pubkey, account }) => {
        const decoded = await decodeAccountData(connection, pubkey.toString(), programId);
        return {
          address: pubkey.toString(),
          decoded,
          lamports: account.lamports,
          owner: account.owner.toString(),
          executable: account.executable,
          rentEpoch: account.rentEpoch,
          size: account.data.length
        };
      })
    );
  } catch (err) {
    console.error(`Failed to fetch detailed accounts for program ${programId}:`, err);
    return [];
  }
}

/**
 * Check for the existence and status of a registry account
 * 
 * @param connection Active Solana connection
 * @returns Information about the registry account
 */
export async function checkRegistryDetailed(connection: Connection): Promise<RegistryDetailedResponse> {
  try {
    const registryId = new PublicKey('EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K');
    const registryInfo = await connection.getAccountInfo(registryId);
    
    if (!registryInfo) {
      return { exists: false };
    }
    
    // Try to decode registry data
    try {
      return {
        exists: true,
        owner: registryInfo.owner.toString(),
        data: {
          size: registryInfo.data.length,
          discriminator: Buffer.from(registryInfo.data.slice(0, 8)).toString('hex')
        }
      };
    } catch (decodeErr) {
      const error = decodeErr as Error;
      return {
        exists: true,
        owner: registryInfo.owner.toString(),
        error: `Failed to decode registry: ${error.message}`,
        data: { size: registryInfo.data.length }
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    return {
      exists: false,
      error: error.message
    };
  }
} 