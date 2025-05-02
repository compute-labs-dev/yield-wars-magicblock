/**
 * Bolt Component Decoder
 * 
 * Utility functions to decode Bolt component data from account data
 */

import { PublicKey } from '@solana/web3.js';

// Known Bolt discriminators from components (partial values)
// These are pre-populated with common patterns but will be enhanced dynamically
// as we encounter components in the wild
let COMPONENT_DISCRIMINATORS: Record<string, string> = {
  // These are example values - they'll be updated when actual components are discovered
  // We'll keep a running map of discriminators we discover
};

// Store discovered discriminators for future use
const saveDiscriminator = (discriminator: string, type: string) => {
  COMPONENT_DISCRIMINATORS[discriminator.substring(0, 8)] = type;
};

// Try to identify component type from program ID
export function getComponentTypeFromProgramId(programId: string): string {
  // Wallet program
  if (programId === 'BXYCAQBizX4Pddjq5XivVEQn9Tbc7NF9zzLd3CSUXysz') {
    return 'Wallet';
  }
  // Ownership program
  else if (programId === '4M5dU6my7BmVMoAUYmRa3ZnJRMMQzW7e4Yf32wiPh9wS') {
    return 'Ownership';
  }
  // Production program
  else if (programId === 'Hx47WJJoq9uzSRkZ8o4nRF57W1zpuYwAAc6pWHfbGQAr') {
    return 'Production';
  }
  // Price program
  else if (programId === 'DTtX2W21uM3oRdJCSTzmjb5ujvY7i6aA1kbEakeBbrV6') {
    return 'Price';
  }
  // Price Action program
  else if (programId === '6e4kZsL68kwjW1Qagd9su8vYQPZGPyS3Mkg4n8Lt5FZU') {
    return 'PriceAction';
  }
  // Upgradeable program
  else if (programId === 'dXEvE23Lv9XX5f6ssDbzbGNQmeomC1Mi4U16EoHA3pY') {
    return 'Upgradeable';
  }
  // Stakeable program
  else if (programId === '6ewq3Rkx3c2kLu9qq46fCNS9ZhBshzskCEAgX7WspkVQ') {
    return 'Stakeable';
  }
  return 'Unknown';
}

// Field types definitions
interface WalletFields {
  usdcBalance: bigint;
  btcBalance: bigint;
  ethBalance: bigint;
  solBalance: bigint;
  aifiBalance: bigint;
}

interface OwnershipFields {
  ownerType: number;
  // Add other ownership fields
}

interface PriceFields {
  currentPrice: bigint;
  // Add other price fields
}

// Main decoder function
export function decodeBoltComponent(data: Buffer, programId?: string): { type: string; data: any } | null {
  try {
    // Get discriminator (first 8 bytes)
    const discriminator = data.slice(0, 8);
    const discriminatorHex = Buffer.from(discriminator).toString('hex');
    
    // Find component type
    let componentType = 'Unknown';
    
    // First try to look up by discriminator
    for (const [discPrefix, type] of Object.entries(COMPONENT_DISCRIMINATORS)) {
      if (discriminatorHex.startsWith(discPrefix)) {
        componentType = type;
        break;
      }
    }
    
    // If unknown but we have a program ID, try to determine from program ID
    if (componentType === 'Unknown' && programId) {
      componentType = getComponentTypeFromProgramId(programId);
      
      // If we now know the type, save the discriminator for future use
      if (componentType !== 'Unknown') {
        saveDiscriminator(discriminatorHex, componentType);
      }
    }
    
    // Decode based on component type
    let decodedData: any = { 
      size: data.length,
      discriminator: discriminatorHex,
    };
    
    if (componentType === 'Wallet') {
      // Wallet component decoder
      try {
        decodedData = {
          ...decodedData,
          usdcBalance: data.readBigUInt64LE(8),
          btcBalance: data.readBigUInt64LE(16),
          ethBalance: data.readBigUInt64LE(24),
          solBalance: data.readBigUInt64LE(32),
          aifiBalance: data.readBigUInt64LE(40),
        };
      } catch (e) {
        console.log('Error decoding Wallet component:', e);
      }
    } else if (componentType === 'Price') {
      // Price component decoder
      try {
        decodedData = {
          ...decodedData,
          currentPrice: data.readBigUInt64LE(8),
          // Add other fields based on your Price component structure
        };
      } catch (e) {
        console.log('Error decoding Price component:', e);
      }
    } else if (componentType === 'Production') {
      // Production component decoder
      try {
        decodedData = {
          ...decodedData,
          // Add fields based on your Production component structure
          productionRate: data.readBigUInt64LE(8),
          lastCollectedTimestamp: data.readBigInt64LE(16),
        };
      } catch (e) {
        console.log('Error decoding Production component:', e);
      }
    }
    
    return {
      type: componentType,
      data: decodedData
    };
  } catch (error) {
    console.error('Error decoding Bolt component:', error);
    return null;
  }
}

// Helper function to get human-readable values
export function formatCurrencyValue(value: bigint | number): string {
  // Convert to decimal with 6 decimal places (1,000,000 = $1)
  const numValue = typeof value === 'bigint' ? Number(value) : value;
  return (numValue / 1_000_000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
}

// Extract entity ID from account pubkey (if using Bolt ECS pattern)
export function getEntityId(publicKey: PublicKey): string {
  try {
    // This is a placeholder - implement based on your actual entity ID extraction logic
    return publicKey.toBase58().slice(0, 8);
  } catch (error) {
    return 'unknown';
  }
} 