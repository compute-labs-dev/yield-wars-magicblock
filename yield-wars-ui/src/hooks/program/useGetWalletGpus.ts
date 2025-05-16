import { useCallback, useState } from 'react';
import { getWalletGpus } from '@/app/actions/getWalletGpus';
import type { GpuOwnership } from '@/app/actions/getWalletGpus';
import { useMagicBlockEngine } from '@/engine/MagicBlockEngineProvider';
import { getComponentOwnershipOnChain } from '@/lib/constants/programIds';
import { EntityType } from '@/lib/constants/programEnums';
import { PublicKey } from '@solana/web3.js';

export interface UseGetWalletGpusResult {
  isLoading: boolean;
  error: Error | null;
  gpus: GpuOwnership[];
  fetchWalletGpus: (params: {
    worldPda: string;
    playerEntityPda: string;
  }) => Promise<GpuOwnership[]>;
}

export function useGetWalletGpus(): UseGetWalletGpusResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [gpus, setGpus] = useState<GpuOwnership[]>([]);
  const engine = useMagicBlockEngine();

  const fetchWalletGpus = useCallback(async (params: {
    worldPda: string;
    playerEntityPda: string;
  }): Promise<GpuOwnership[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const ownershipData = await getWalletGpus(params);
      if (!ownershipData) {
        console.log("No ownership data found");
        setGpus([]);
        return [];
      }

      console.log("Ownership data received:", {
        pubkey: ownershipData.pubkey,
        dataLength: ownershipData.data.length
      });

      // Enhanced debugging: Log the raw binary data
      const accountDataBuffer = Buffer.from(ownershipData.data);
      console.log("Raw ownership binary data:", {
        // Convert to hex for easier visual inspection
        dataHex: accountDataBuffer.toString('hex').substring(0, 100) + '...',
        // Show first 50 bytes
        firstBytes: Array.from(accountDataBuffer.slice(0, 50)),
      });

      // Use the working ownership program from constants
      const ownershipProgram = getComponentOwnershipOnChain(engine);
      if (!ownershipProgram) {
        throw new Error("Failed to get ownership program from engine");
      }

      // Decode the account data
      const decodedGpus: GpuOwnership[] = [];
      
      // Safely decode the ownership data with proper error handling
      let ownership;
      try {
        // Decode the account data using the working pattern found in getWorldData
        ownership = ownershipProgram.coder.accounts.decode(
          "ownership", // Use lowercase as that's how it's defined in the program
          Buffer.from(ownershipData.data)
        );
        console.log("Successfully decoded ownership component");
      } catch (decodeError) {
        console.error("Error decoding ownership component:", decodeError);
        
        // Add detailed logging of the error
        if (decodeError instanceof Error) {
          console.error("Error details:", {
            message: decodeError.message,
            stack: decodeError.stack,
            name: decodeError.name
          });
        }
        
        // Try to recover by checking if we're using the wrong case for the account name
        try {
          console.log("Attempting fallback decode with 'Ownership' (uppercase)...");
          ownership = ownershipProgram.coder.accounts.decode(
            "Ownership",
            Buffer.from(ownershipData.data)
          );
          console.log("Fallback decode successful");
        } catch (fallbackError) {
          console.error("Fallback decode also failed:", fallbackError);
          setError(new Error(`Failed to decode ownership data: ${decodeError}`));
          return [];
        }
      }

      // Guard against undefined ownership
      if (!ownership) {
        const errMsg = "Ownership data is undefined after decoding";
        console.error(errMsg);
        setError(new Error(errMsg));
        return [];
      }

      // Enhanced logging with more details about the ownership structure
      console.log("Decoded ownership data:", {
        ownerType: ownership.owner_type,
        ownerEntity: ownership.owner_entity?.toBase58() || "None",
        ownedEntities: ownership.owned_entities?.map((e: PublicKey) => e.toBase58()) || [],
        ownedEntityTypesLength: ownership.owned_entity_types ? 
          (Array.isArray(ownership.owned_entity_types) ? 
            ownership.owned_entity_types.length : 
            Buffer.isBuffer(ownership.owned_entity_types) ? 
              ownership.owned_entity_types.length : 
              'unknown format') : 'none',
        rawData: JSON.stringify(ownership).substring(0, 200) + '...'
      });

      const componentParts = ownershipData.pubkey.split('_');
      const accountEntityPda = componentParts[0]; 
      
      // Determine if this is a player entity or a GPU entity
      const isPlayerOwnership = accountEntityPda === params.playerEntityPda || 
                             (componentParts.length > 0 && 
                              accountEntityPda.includes(params.playerEntityPda.substring(0, 10)));

      console.log("Is player ownership component:", isPlayerOwnership);

      if (isPlayerOwnership) {
        // This is the player's ownership component - process owned GPUs
        console.log("Processing player ownership component");
        
        if (ownership.owned_entities && ownership.owned_entity_types) {
          console.log(`Found ${ownership.owned_entities.length} owned entities`);
          
          // Log details about owned_entity_types to debug format issues
          console.log("owned_entity_types details:", {
            type: typeof ownership.owned_entity_types,
            isArray: Array.isArray(ownership.owned_entity_types),
            isBuffer: Buffer.isBuffer(ownership.owned_entity_types),
            length: ownership.owned_entity_types.length,
            sample: Array.isArray(ownership.owned_entity_types) ? 
              ownership.owned_entity_types.slice(0, 5) : 
              Buffer.isBuffer(ownership.owned_entity_types) ? 
                Array.from(ownership.owned_entity_types.slice(0, 5)) : 
                'unknown format'
          });
          
          for (let i = 0; i < ownership.owned_entities.length; i++) {
            // Get entity type with proper type checking
            let entityType;
            if (Array.isArray(ownership.owned_entity_types) && i < ownership.owned_entity_types.length) {
              entityType = ownership.owned_entity_types[i];
            } else if (Buffer.isBuffer(ownership.owned_entity_types) && i < ownership.owned_entity_types.length) {
              entityType = ownership.owned_entity_types[i];
            } else {
              console.log(`Entity type not found for index ${i}`);
              continue;
            }

            if (entityType === EntityType.GPU) {
              const gpuEntityPda = ownership.owned_entities[i].toBase58();
              
              console.log("Found GPU entity:", {
                pda: gpuEntityPda,
                type: entityType,
                typeName: EntityType[entityType]
              });
              
              decodedGpus.push({
                gpuEntityPda,
                ownerEntityPda: params.playerEntityPda,
                ownerType: EntityType.Player
              });
            }
          }
        } else {
          console.log("No owned entities or entity types found in player ownership data", {
            hasOwnedEntities: !!ownership.owned_entities,
            hasOwnedEntityTypes: !!ownership.owned_entity_types
          });
        }
      } else {
        // This is a GPU's ownership component - check if owner is our player
        console.log("Processing GPU ownership component");
        
        if (ownership.owner_entity) {
          const ownerEntityString = ownership.owner_entity.toBase58();
          console.log("GPU owner entity:", ownerEntityString);
          
          // Check if owner matches our player
          const isOwner = ownerEntityString === params.playerEntityPda || 
                         params.playerEntityPda.includes(ownerEntityString.substring(0, 10)) ||
                         ownerEntityString.includes(params.playerEntityPda.substring(0, 10));
          
          if (isOwner) {
            console.log("GPU is owned by player entity");
            
            decodedGpus.push({
              gpuEntityPda: accountEntityPda,
              ownerEntityPda: params.playerEntityPda,
              ownerType: EntityType.Player
            });
          }
        } else {
          console.log("GPU has no owner entity set");
        }
      }

      console.log("Final GPUs list:", decodedGpus);
      setGpus(decodedGpus);
      return decodedGpus;

    } catch (error) {
      console.error("Error in fetchWalletGpus:", error);
      setError(error instanceof Error ? error : new Error(String(error)));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [engine]);

  return {
    isLoading,
    error,
    gpus,
    fetchWalletGpus,
  };
} 