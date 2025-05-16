'use server';

import { Connection, PublicKey } from '@solana/web3.js';
import { FindComponentPda, FindEntityPda, World } from '@magicblock-labs/bolt-sdk';
import { componentOwnership } from '@/lib/constants/programIds';

export interface GpuOwnership {
  gpuEntityPda: string;
  ownerEntityPda: string;
  ownerType: number;
}

export interface GetWalletGpusParams {
  worldPda: string;
  playerEntityPda: string;
}

export interface OwnershipAccountData {
  pubkey: string;
  data: number[];
  ownedEntities?: string[];
  ownedEntityTypes?: number[];
  ownerType?: number;
  ownerEntity?: string;
}

export async function getWalletGpus(params: GetWalletGpusParams): Promise<OwnershipAccountData | null> {
  try {
    console.log("Fetching wallet GPUs for:", params);

    // Use a more reliable RPC endpoint with commitment level specified
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com',
      { 
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );
    
    // Validate input parameters
    if (!params.worldPda || !params.playerEntityPda) {
      throw new Error("Missing required parameters: worldPda or playerEntityPda");
    }

    const worldPda = new PublicKey(params.worldPda);
    const playerEntityPda = new PublicKey(params.playerEntityPda);

    // APPROACH 1: First try to get the player's ownership component
    console.log("APPROACH 1: Looking for player's ownership component...");
    const playerOwnershipPda = FindComponentPda({
      entity: playerEntityPda,
      componentId: new PublicKey(componentOwnership.address),
    });

    console.log("Looking for player ownership at PDA:", playerOwnershipPda.toBase58());

    let playerOwnershipAccount = null;
    try {
      playerOwnershipAccount = await connection.getAccountInfo(playerOwnershipPda, 'confirmed');
      
      if (playerOwnershipAccount) {
        console.log("Found player ownership account:", {
          address: playerOwnershipPda.toBase58(),
          dataLength: playerOwnershipAccount.data.length,
          owner: playerOwnershipAccount.owner.toBase58()
        });

        // Log binary data for debugging
        console.log("Player ownership data details:", {
          firstBytes: Array.from(playerOwnershipAccount.data.slice(0, 20)),
          dataHex: Buffer.from(playerOwnershipAccount.data).toString('hex').substring(0, 50) + '...'
        });

        // Return the raw account data for client-side decoding
        return {
          pubkey: playerOwnershipPda.toBase58(),
          data: Array.from(playerOwnershipAccount.data)
        };
      } else {
        console.log("No player ownership account found at expected PDA");
      }
    } catch (e) {
      console.warn("Error fetching player ownership:", e);
    }

    // APPROACH 2: If that fails, scan the world for GPU entities and check each one's ownership component
    console.log("APPROACH 2: Scanning for GPU entities that have this player as owner...");
    
    try {
      // Fetch the world account to get entity count
      const world = await World.fromAccountAddress(
        connection,
        worldPda,
        "confirmed"
      );
      
      console.log("World fetched. Total entities:", Number(world.entities));
      
      // Get GPU entity PDAs from world store if available
      // Otherwise scan the first 100 entities (limiting to avoid excessive RPC calls)
      const maxEntitiesToScan = Math.min(Number(world.entities), 100);
      
      // First try known GPU entity ranges
      // This is a fast path optimization that avoids scanning all entities
      console.log("Trying known GPU entity ranges first...");
      
      // The typical range where GPU entities are created
      const gpuRangeStart = Math.max(0, Number(world.entities) - maxEntitiesToScan);
      const gpuRangeEnd = Number(world.entities);
      
      // Create a queue of IDs to check, prioritizing recent entities (more likely to be GPUs)
      const idsToCheck = [];
      
      // Add the most recent entities first (higher priority)
      for (let i = gpuRangeEnd; i > gpuRangeStart; i--) {
        idsToCheck.push(i);
      }
      
      // Process all queued entity IDs
      for (let i = 0; i < idsToCheck.length; i++) {
        const entityId = world.entities.subn(Number(world.entities) - idsToCheck[i]);
        const entityPda = FindEntityPda({
          worldId: world.id,
          entityId: entityId
        });
        
        // Log every 10th entity we check to avoid console spam
        if (i % 10 === 0) {
          console.log(`Checking entity ${idsToCheck[i]} (${i+1}/${idsToCheck.length}), PDA: ${entityPda.toBase58()}`);
        }
        
        // Check if this entity has an ownership component
        const ownershipPda = FindComponentPda({
          entity: entityPda,
          componentId: new PublicKey(componentOwnership.address),
        });
        
        try {
          const ownershipAccount = await connection.getAccountInfo(ownershipPda, 'confirmed');
          if (ownershipAccount) {
            console.log(`Found ownership component for entity ${entityPda.toBase58()}`);
            
            // Manual binary check for owner entity in the account data
            // Skip first 8 bytes (discriminator) and 1 byte (owner_type)
            // Next byte is a flag for Option<Pubkey> (1 = Some, 0 = None)
            const dataView = Buffer.from(ownershipAccount.data);
            
            // Check for ownership in 2 different ways
            
            // Method 1: Check if this entity is owned by the player
            // Skip discriminator (8 bytes) and owner_type (1 byte)
            // Check if option flag is 1 (Some)
            const hasOwnerEntity = dataView[9] === 1;
            
            if (hasOwnerEntity) {
              // Extract the owner entity (32 bytes starting at offset 10)
              const ownerEntityBytes = dataView.slice(10, 10 + 32);
              const ownerEntityPubkey = new PublicKey(ownerEntityBytes);
              
              if (ownerEntityPubkey.equals(playerEntityPda)) {
                console.log(`✅ Entity ${entityPda.toBase58()} is owned by player ${playerEntityPda.toBase58()}`);
                
                // Return this ownership component for processing
                return {
                  pubkey: ownershipPda.toBase58(),
                  data: Array.from(ownershipAccount.data)
                };
              }
            }
            
            // Method 2: Look for player entity in owned_entities list
            // This is more complex as we need to parse the BorshSchema
            // We'll do a simple pattern match in the binary data
            const playerEntityBuffer = playerEntityPda.toBuffer();
            
            // Scan the whole buffer for the player's public key pattern
            for (let offset = 0; offset <= dataView.length - playerEntityBuffer.length; offset++) {
              let matches = true;
              for (let j = 0; j < playerEntityBuffer.length; j++) {
                if (dataView[offset + j] !== playerEntityBuffer[j]) {
                  matches = false;
                  break;
                }
              }
              
              if (matches) {
                console.log(`✅ Found player ${playerEntityPda.toBase58()} in entity ${entityPda.toBase58()} ownership data at offset ${offset}`);
                
                // Return this ownership component for processing
                return {
                  pubkey: ownershipPda.toBase58(),
                  data: Array.from(ownershipAccount.data)
                };
              }
            }
          }
        } catch (err) {
          console.error("Error fetching ownership component:", err);
          // Skip individual entities that have errors
          continue;
        }
      }
      
      console.log("No GPUs found with this player as owner");
    } catch (err) {
      console.error("Error scanning for GPUs:", err);
    }
    
    console.log("No ownership relationships found between player and GPUs");
    return null;

  } catch (error) {
    console.error("Error in getWalletGpus:", error);
    if (error instanceof Error) {
      error.message = `Failed to fetch wallet GPUs: ${error.message}`;
    }
    throw error;
  }
} 