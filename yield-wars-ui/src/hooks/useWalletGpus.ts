import { useState, useCallback, useEffect } from 'react';
import { getWalletGpus, GpuOwnership } from '@/app/actions/getWalletGpus';
import { useMagicBlockEngine } from '@/engine/MagicBlockEngineProvider';
import { componentOwnership, getComponentOwnershipOnChain, componentProduction, componentStakeable, componentUpgradeable, getComponentProductionOnChain, getComponentStakeableOnChain, getComponentUpgradeableOnChain } from '@/lib/constants/programIds';
import { EntityType } from '@/lib/constants/programEnums';
import { PublicKey, Connection } from '@solana/web3.js';
import { useSelector } from 'react-redux';
import { selectWorldPda, selectGpuEntities, GpuEntityDetails } from '@/stores/features/worldStore';
import { toast } from 'sonner';
import { FindComponentPda, FindEntityPda } from '@magicblock-labs/bolt-sdk';

// Enhanced GPU details interface
export interface EnhancedGpuOwnership extends GpuOwnership {
  type: string;
  production: {
    usdc: number;
    aifi: number;
    isActive?: boolean;
    lastCollectionTime?: number;
  };
  operatingCost: number;
  maxLevel: number;
  price: number;
  currentLevel?: number;
  upgradeablePda?: string;
  productionPda?: string;
  stakeablePda?: string;
  isStaked?: boolean;
}

export function useWalletGpus(playerEntityPda: string) {
  const [gpus, setGpus] = useState<EnhancedGpuOwnership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const engine = useMagicBlockEngine();
  const worldPda = useSelector(selectWorldPda);
  
  // Get available GPUs from Redux store for reference data
  const availableGpuEntities = useSelector(selectGpuEntities);

  const fetchWalletGpus = useCallback(async () => {
    if (!playerEntityPda || !worldPda) {
      console.log("Missing required parameters:", { playerEntityPda, worldPda });
      setGpus([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching wallet GPUs with params:", { worldPda, playerEntityPda });
      
      const accountData = await getWalletGpus({
        worldPda,
        playerEntityPda
      });

      if (!accountData) {
        console.log("No ownership data found");
        setGpus([]);
        setIsLoading(false);
        return;
      }

      // Enhanced debugging: Log the raw binary data of the account
      const accountDataBuffer = Buffer.from(accountData.data);
      console.log("Raw account binary data:", {
        pubkey: accountData.pubkey,
        dataLength: accountData.data.length,
        // Convert to hex for easier visual inspection
        dataHex: accountDataBuffer.toString('hex').substring(0, 100) + '...',
        // Show first 50 bytes
        firstBytes: Array.from(accountDataBuffer.slice(0, 50)),
      });

      // Log the structure of the ownership schema for reference
      console.log("Expected ownership schema:", {
        discriminator: "8 bytes",
        owner_type: "1 byte",
        owned_entities: "vec<pubkey> - variable length",
        owned_entity_types: "bytes - variable length",
        owner_entity: "Option<pubkey> - 1 byte flag + 32 bytes if present",
        bolt_metadata: "BoltMetadata struct"
      });

      const decodedGpus: GpuOwnership[] = [];
      
      // EXTRACTION METHOD 1: Regex pattern for base58 encoded Solana public keys
      try {
        console.log("Trying regex extraction method for public keys...");
        // Convert the raw data to string for regex matching
        const rawDataStr = JSON.stringify(accountData);
        
        // DIRECT EXTRACTION: Focus specifically on the raw ownership pattern we see in logs
        // Example: {"ownerType":0,"ownedEntities":["3px89dYY7o6UWKZw...1fer"],"data":[1,1]},"ownerEntity":"4UoFyj5tqV..."
        try {
          // Parse the ownership data from the JSON string if available
          const rawOwnershipMatch = rawDataStr.match(/"rawOwnership":\s*"(.*?)"/);
          if (rawOwnershipMatch && rawOwnershipMatch[1]) {
            console.log("Found rawOwnership field in the data");
            
            // Get the raw ownership string
            const rawOwnership = rawOwnershipMatch[1].replace(/\\"/g, '"');
            console.log("Raw ownership data:", rawOwnership);
            
            // Look for the specific GPU entity pattern in the ownedEntities array
            const gpuEntityMatch = rawOwnership.match(/"ownedEntities":\s*\["([^"]+)"/);
            if (gpuEntityMatch && gpuEntityMatch[1]) {
              const gpuEntity = gpuEntityMatch[1];
              console.log("Found GPU entity in rawOwnership:", gpuEntity);
              
              try {
                // Validate if it looks like a proper public key
                if (gpuEntity.length >= 32) {
                  decodedGpus.push({
                    gpuEntityPda: gpuEntity,
                    ownerEntityPda: playerEntityPda,
                    ownerType: EntityType.Player
                  });
                  
                  console.log("Successfully added GPU from rawOwnership field:", gpuEntity);
                }
              } catch (err) {
                console.error("Error processing GPU entity from rawOwnership:", err);
              }
            }
          }
        } catch (rawOwnershipError) {
          console.error("Error extracting from rawOwnership:", rawOwnershipError);
        }
        
        // SPECIFIC EXTRACTION: Look for the 3px89 pattern specifically
        try {
          const regex3px = /3px89[A-Za-z0-9]{20,}/g;
          const matches3px = rawDataStr.match(regex3px);
          
          if (matches3px && matches3px.length > 0) {
            console.log(`Found ${matches3px.length} instances of the 3px89 pattern`);
            
            for (const match of matches3px) {
              console.log(`Processing 3px89 pattern match: ${match}`);
              
              try {
                // Typically these entities are 32+ characters
                if (match.length >= 32) {
                  // Check if this is already in our GPUs list
                  const alreadyExists = decodedGpus.some(gpu => gpu.gpuEntityPda === match);
                  
                  if (!alreadyExists) {
                    decodedGpus.push({
                      gpuEntityPda: match,
                      ownerEntityPda: playerEntityPda,
                      ownerType: EntityType.Player
                    });
                    
                    console.log(`Added GPU from 3px89 pattern: ${match}`);
                  }
                } else {
                  console.log(`3px89 pattern match too short: ${match}`);
                }
              } catch (err) {
                console.error(`Error processing 3px89 pattern match: ${match}`, err);
              }
            }
          } else {
            console.log("No 3px89 pattern matches found");
          }
        } catch (specificPatternError) {
          console.error("Error in specific pattern extraction:", specificPatternError);
        }
        
        // Match either "ownedEntities":["<pubkey>"] or similar patterns
        const ownedEntitiesMatches = rawDataStr.match(/"ownedEntities":\["([^"]+)"/);
        if (ownedEntitiesMatches && ownedEntitiesMatches[1]) {
          const entityPda = ownedEntitiesMatches[1];
          console.log("Found entity PDA through ownedEntities extraction:", entityPda);
          
          try {
            // Validate it's a proper public key
            const entityPubkey = new PublicKey(entityPda);
            
            decodedGpus.push({
              gpuEntityPda: entityPubkey.toBase58(),
              ownerEntityPda: playerEntityPda,
              ownerType: EntityType.Player
            });
            
            console.log("Successfully added GPU through direct extraction:", entityPubkey.toBase58());
          } catch (pubkeyError) {
            console.error("Invalid pubkey from direct extraction:", pubkeyError);
          }
        }
        
        // General pattern for base58 public keys in the raw data
        const pubkeyPattern = /([123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32,44})/g;
        const pubkeyMatches = rawDataStr.match(pubkeyPattern);
        
        if (pubkeyMatches && pubkeyMatches.length > 0) {
          console.log(`Found ${pubkeyMatches.length} potential public keys in the raw data`);
          
          // Process the first 10 matches to avoid potential false positives
          const maxMatches = Math.min(pubkeyMatches.length, 10);
          
          for (let i = 0; i < maxMatches; i++) {
            try {
              const pubkeyStr = pubkeyMatches[i];
              
              // Skip if this looks like a repeated pattern (likely not a valid pubkey)
              if (pubkeyStr.match(/(.)\1{10,}/)) {
                console.log(`Skipping likely invalid pubkey pattern: ${pubkeyStr.substring(0, 8)}...`);
                continue;
              }
              
              // Try to create a PublicKey to validate it
              const pubkey = new PublicKey(pubkeyStr);
              console.log(`Validated pubkey ${i+1}/${maxMatches}: ${pubkey.toBase58().substring(0, 8)}...`);
              
              // Check if this is not the player entity itself to avoid duplicates
              if (pubkey.toBase58() !== playerEntityPda) {
                // Add this as a potential GPU
                const alreadyExists = decodedGpus.some(gpu => gpu.gpuEntityPda === pubkey.toBase58());
                
                if (!alreadyExists) {
                  decodedGpus.push({
                    gpuEntityPda: pubkey.toBase58(),
                    ownerEntityPda: playerEntityPda,
                    ownerType: EntityType.Player
                  });
                  
                  console.log(`Added potential GPU from regex match: ${pubkey.toBase58().substring(0, 8)}...`);
                }
              }
            } catch (err) {
              // Skip invalid pubkeys
              console.log(`Match ${i+1} is not a valid pubkey`);
            }
          }
        }
      } catch (extractionError) {
        console.error("Error in regex extraction method:", extractionError);
      }

      // Use the working ownership program from constants
      const ownershipProgram = getComponentOwnershipOnChain(engine);
      
      if (!ownershipProgram) {
        throw new Error("Failed to get ownership program from engine");
      }

      console.log("Using ownership program:", {
        programId: ownershipProgram.programId.toBase58()
      });

      // Safely decode the ownership data with proper error handling
      let ownership;
      try {
        // Use lowercase "ownership" - this is the key point to fix the decoding
        ownership = ownershipProgram.coder.accounts.decode(
          "ownership", // Use lowercase as that's how it's defined in the program
          Buffer.from(accountData.data)
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
        
        // Try multiple fallback approaches
        try {
          console.log("Attempting fallback decode with 'Ownership' (uppercase)...");
          ownership = ownershipProgram.coder.accounts.decode(
            "Ownership",
            Buffer.from(accountData.data)
          );
          console.log("Fallback decode with uppercase successful");
        } catch (fallbackError) {
          console.error("Fallback decode with uppercase also failed:", fallbackError);
          
          try {
            // Try using a generic fallback approach
            console.log("Attempting manual data extraction...");
            
            // Skip past the 8-byte discriminator
            const dataView = accountDataBuffer;
            if (dataView.length > 9) {
              // Extract owner_type (1 byte at offset 8)
              const ownerType = dataView[8];
              console.log("Extracted owner_type:", ownerType);
              
              // Check for owned_entities vector - should start at offset 9
              const vectorLengthOffset = 9;
              if (vectorLengthOffset + 4 <= dataView.length) {
                const vectorLength = dataView.readUInt32LE(vectorLengthOffset);
                console.log("Owned entities vector length:", vectorLength);
                
                // Create a basic ownership structure
                ownership = {
                  owner_type: ownerType,
                  owned_entities: [] as PublicKey[],
                  owned_entity_types: Buffer.alloc(0),
                  owner_entity: null as PublicKey | null
                };
                
                // Try to extract owned entities if the vector has reasonable length
                if (vectorLength > 0 && vectorLength < 100) {
                  const entityStart = vectorLengthOffset + 4;
                  
                  const ownedEntities = [];
                  for (let i = 0; i < vectorLength; i++) {
                    const offset = entityStart + (i * 32);
                    if (offset + 32 <= dataView.length) {
                      try {
                        const entityBytes = dataView.slice(offset, offset + 32);
                        const entityPk = new PublicKey(entityBytes);
                        ownedEntities.push(entityPk);
                      } catch (err) {
                        console.error(`Error extracting entity at index ${i}:`, err);
                      }
                    }
                  }
                  
                  if (ownedEntities.length > 0) {
                    ownership.owned_entities = ownedEntities as PublicKey[];
                    console.log(`Manually extracted ${ownedEntities.length} owned entities`);
                    
                    // Try to find entity types - they should follow the owned entities vector
                    const entityTypesStart = entityStart + (vectorLength * 32);
                    if (entityTypesStart + 4 <= dataView.length) {
                      const typesVectorLength = dataView.readUInt32LE(entityTypesStart);
                      console.log("Entity types vector length:", typesVectorLength);
                      
                      if (typesVectorLength === vectorLength) {
                        // Extract entity types
                        const typesStart = entityTypesStart + 4;
                        if (typesStart + typesVectorLength <= dataView.length) {
                          ownership.owned_entity_types = dataView.slice(typesStart, typesStart + typesVectorLength);
                          console.log("Manually extracted entity types:", Array.from(ownership.owned_entity_types));
                        }
                      }
                    }
                  }
                }
                
                // Look for owner_entity after the owned_entity_types
                // This is an Option<Pubkey> so look for a 1 byte followed by 32 bytes
                for (let offset = 50; offset < dataView.length - 33; offset++) {
                  // Skip long sequences of 0s which are likely not valid pubkeys
                  let allZeroes = true;
                  for (let j = 0; j < 32; j++) {
                    if (dataView[offset + j + 1] !== 0) {
                      allZeroes = false;
                      break;
                    }
                  }
                  if (allZeroes) continue;
                  
                  // Skip long sequences of 1s or FFs which are likely not valid pubkeys
                  let allOnes = true;
                  for (let j = 0; j < 32; j++) {
                    if (dataView[offset + j + 1] !== 1 && dataView[offset + j + 1] !== 255) {
                      allOnes = false;
                      break;
                    }
                  }
                  if (allOnes) continue;
                  
                  if (dataView[offset] === 1) {
                    try {
                      const pubkeyBytes = dataView.slice(offset + 1, offset + 33);
                      const ownerPubkey = new PublicKey(pubkeyBytes);
                      ownership.owner_entity = ownerPubkey;
                      console.log("Found potential owner_entity at offset", offset, ownership.owner_entity.toBase58());
                      break;
                    } catch (err) {
                      // Not a valid pubkey, continue scanning
                    }
                  }
                }
                
                console.log("Manual data extraction produced:", ownership);
              }
            }
          } catch (manualError) {
            console.error("Manual data extraction failed:", manualError);
            throw new Error(`Failed to decode ownership data: ${decodeError}`);
          }
        }
      }

      // Process extracted ownership data if we got it
      if (ownership) {
        console.log("Successfully extracted ownership data:", {
          owner_type: ownership.owner_type,
          owned_entities: ownership.owned_entities 
            ? ownership.owned_entities.map((e: PublicKey) => e.toBase58().substring(0, 10) + '...') 
            : 'none',
          owned_entity_types: ownership.owned_entity_types 
            ? Buffer.isBuffer(ownership.owned_entity_types) 
              ? Array.from(ownership.owned_entity_types.slice(0, 10)) 
              : 'not a buffer' 
            : 'none',
          owner_entity: ownership.owner_entity ? ownership.owner_entity.toBase58().substring(0, 10) + '...' : 'none'
        });
        
        // NEW EXTRACTION METHOD: Check for ownership data format by analyzing the binary structure
        try {
          // Ownership schema typically has:
          // - 8 bytes discriminator
          // - 1 byte owner_type
          // - 4 bytes for owned_entities vector length
          // - Sequence of 32-byte pubkeys for each owned entity
          
          // Create Buffer from account data if not already a buffer
          const accountDataBuffer = Buffer.isBuffer(accountData.data) 
            ? accountData.data 
            : Buffer.from(accountData.data);
          
          if (accountDataBuffer.length >= 13) { // At least discriminator + owner_type + vector length
            // Check owned_entities vector length at offset 9 (after discriminator and owner_type)
            const vectorLengthOffset = 9; 
            const vectorLength = accountDataBuffer.readUInt32LE(vectorLengthOffset);
            
            console.log(`Raw binary data shows ${vectorLength} owned entities in vector`);
            
            if (vectorLength > 0 && vectorLength < 100) { // Reasonable number of entities
              // Vector data starts after the length field (4 bytes)
              const entitiesStartOffset = vectorLengthOffset + 4;
              
              // Try to extract each entity (32 bytes each)
              for (let i = 0; i < vectorLength; i++) {
                const entityOffset = entitiesStartOffset + (i * 32);
                
                // Ensure we have enough data
                if (entityOffset + 32 <= accountDataBuffer.length) {
                  try {
                    // Extract the 32-byte entity pubkey
                    const entityBytes = accountDataBuffer.slice(entityOffset, entityOffset + 32);
                    const entityPubkey = new PublicKey(entityBytes);
                    const entityAddress = entityPubkey.toBase58();
                    
                    console.log(`Found entity #${i+1} at offset ${entityOffset}: ${entityAddress.substring(0, 10)}...`);
                    
                    // Skip if this is the player entity itself
                    if (entityAddress === playerEntityPda) {
                      console.log("Skipping self-reference entity");
                      continue;
                    }
                    
                    // Check if this entity is already in our list
                    const alreadyExists = decodedGpus.some(gpu => gpu.gpuEntityPda === entityAddress);
                    if (!alreadyExists) {
                      decodedGpus.push({
                        gpuEntityPda: entityAddress,
                        ownerEntityPda: playerEntityPda,
                        ownerType: EntityType.Player
                      });
                      
                      console.log(`Added entity ${entityAddress} as GPU (binary extraction)`);
                    }
                  } catch (err) {
                    console.error(`Error extracting entity at index ${i}:`, err);
                  }
                }
              }
            }
          }
        } catch (binaryParseError) {
          console.error("Error in binary structure analysis:", binaryParseError);
        }
        
        // FALLBACK 1: Process owned_entities array directly
        try {
          if (ownership.owned_entities && ownership.owned_entities.length > 0) {
            console.log(`FALLBACK: Processing ${ownership.owned_entities.length} owned entities from decoded data`);
            
            // Add each entity from the owned_entities array
            for (const entityPk of ownership.owned_entities) {
              try {
                const entityPubkey = new PublicKey(entityPk);
                const entityAddr = entityPubkey.toBase58();
                
                // Skip if this is the player entity itself
                if (entityAddr === playerEntityPda) {
                  console.log("Skipping self-reference entity:", entityAddr.substring(0, 8) + '...');
                  continue;
                }
                
                // Check if not already added
                const alreadyExists = decodedGpus.some(gpu => gpu.gpuEntityPda === entityAddr);
                if (!alreadyExists) {
                  decodedGpus.push({
                    gpuEntityPda: entityAddr,
                    ownerEntityPda: playerEntityPda,
                    ownerType: EntityType.Player
                  });
                  
                  console.log(`Added GPU from owned_entities fallback: ${entityAddr.substring(0, 8)}...`);
                }
              } catch (err) {
                console.error("Error processing entity from owned_entities:", err);
              }
            }
          } else {
            console.log("No owned_entities found in ownership data");
          }
        } catch (ownedEntitiesError) {
          console.error("Error processing owned_entities fallback:", ownedEntitiesError);
        }
        
        // FALLBACK 2: Check owner_entity if this is a GPU's ownership component
        try {
          if (ownership.owner_entity) {
            const ownerEntityAddr = ownership.owner_entity.toBase58();
            console.log("Found owner_entity:", ownerEntityAddr.substring(0, 8) + '...');
            
            // Check if this owner matches our player
            if (ownerEntityAddr === playerEntityPda) {
              console.log("This entity is owned by our player");
              
              // The current account could be the GPU, add it
              const gpuEntityPda = accountData.pubkey;
              const alreadyExists = decodedGpus.some(gpu => gpu.gpuEntityPda === gpuEntityPda);
              
              if (!alreadyExists) {
                decodedGpus.push({
                  gpuEntityPda,
                  ownerEntityPda: playerEntityPda,
                  ownerType: EntityType.Player
                });
                
                console.log(`Added GPU from owner_entity reference fallback: ${gpuEntityPda.substring(0, 8)}...`);
              }
            }
          }
        } catch (ownerEntityError) {
          console.error("Error processing owner_entity fallback:", ownerEntityError);
        }
      }

      console.log("Final decoded GPUs:", decodedGpus);
      
      // Combine all extraction methods and filter any duplicates
      const uniqueGpus = Array.from(new Set(decodedGpus.map(gpu => gpu.gpuEntityPda)))
        .map(gpuEntityPda => {
          return decodedGpus.find(gpu => gpu.gpuEntityPda === gpuEntityPda)!;
        });
      
      console.log(`Found ${uniqueGpus.length} unique GPUs after deduplication`);
      
      // Enhance each GPU with detailed specifications
      // Need to handle async enhanceGpuDetails function
      setIsLoading(true);
      try {
        // Process all GPUs asynchronously
        const enhancementPromises = uniqueGpus.map(gpu => enhanceGpuDetails(gpu));
        const enhancedGpus = await Promise.all(enhancementPromises);
        
        console.log("Enhanced GPUs with details:", enhancedGpus);
        setGpus(enhancedGpus);
      } catch (enhancementError) {
        console.error("Error enhancing GPU details:", enhancementError);
        // Fallback to using unenhanced GPUs
        setGpus(uniqueGpus.map(gpu => ({
          ...gpu,
          type: "GPU",
          production: { usdc: 3, aifi: 5 },
          operatingCost: 1,
          maxLevel: 3,
          price: 50,
          currentLevel: 1
        })));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching wallet GPUs:", error);
      if (error instanceof Error) {
        setError(error);
      } else {
        setError(new Error(String(error)));
      }
      setGpus([]);
      setIsLoading(false);
    }
  }, [playerEntityPda, worldPda, engine]);

  // Auto-fetch GPUs when playerEntityPda or worldPda changes
  useEffect(() => {
    if (playerEntityPda && worldPda) {
      // Create an async function inside useEffect to allow using await
      const fetchData = async () => {
        try {
          await fetchWalletGpus();
        } catch (err) {
          console.error("Error in auto-fetch of GPUs:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      };
      
      fetchData();
    }
  }, [playerEntityPda, worldPda, fetchWalletGpus]);

  // Helper function to fetch GPU details from blockchain
  const fetchGpuDetailsFromBlockchain = useCallback(async (gpuEntityPda: string): Promise<Partial<EnhancedGpuOwnership>> => {
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com',
        { commitment: 'confirmed' }
      );
      const gpuEntity = new PublicKey(gpuEntityPda);
      const result: Partial<EnhancedGpuOwnership> = {};
      
      console.log(`Fetching on-chain details for GPU: ${gpuEntityPda}`);
      
      // 1. Try to get production component
      try {
        const productionPda = FindComponentPda({
          entity: gpuEntity,
          componentId: new PublicKey(componentProduction.address),
        });
        
        const productionInfo = await connection.getAccountInfo(productionPda);
        
        if (productionInfo) {
          result.productionPda = productionPda.toBase58();
          
          // Try to decode the production component
          try {
            const productionProgram = getComponentProductionOnChain(engine);
            if (productionProgram) {
              const production = productionProgram.coder.accounts.decode(
                "production",
                Buffer.from(productionInfo.data)
              );
              
              // Production rates stored in lamports (millionths)
              const usdcPerHour = Number(production.usdc_per_hour) / 1_000_000;
              const aifiPerHour = Number(production.aifi_per_hour) / 1_000_000;
              
              result.production = {
                usdc: usdcPerHour,
                aifi: aifiPerHour,
                isActive: production.is_active,
                lastCollectionTime: Number(production.last_collection_time)
              };
              
              // Operating cost is typically a fraction of production
              result.operatingCost = usdcPerHour * 0.3; // Approximate
              
              console.log("Successfully decoded production component:", {
                usdcPerHour,
                aifiPerHour,
                isActive: production.is_active
              });
            }
          } catch (decodeError) {
            console.error("Error decoding production component:", decodeError);
          }
        }
      } catch (productionError) {
        console.error("Error fetching production component:", productionError);
      }
      
      // 2. Try to get upgradeable component
      try {
        const upgradeablePda = FindComponentPda({
          entity: gpuEntity,
          componentId: new PublicKey(componentUpgradeable.address),
        });
        
        const upgradeableInfo = await connection.getAccountInfo(upgradeablePda);
        
        if (upgradeableInfo) {
          result.upgradeablePda = upgradeablePda.toBase58();
          
          // Try to decode the upgradeable component
          try {
            const upgradeableProgram = getComponentUpgradeableOnChain(engine);
            if (upgradeableProgram) {
              const upgradeable = upgradeableProgram.coder.accounts.decode(
                "upgradeable",
                Buffer.from(upgradeableInfo.data)
              );
              
              result.currentLevel = Number(upgradeable.current_level);
              result.maxLevel = Number(upgradeable.max_level);
              
              console.log("Successfully decoded upgradeable component:", {
                currentLevel: result.currentLevel,
                maxLevel: result.maxLevel
              });
            }
          } catch (decodeError) {
            console.error("Error decoding upgradeable component:", decodeError);
          }
        }
      } catch (upgradeableError) {
        console.error("Error fetching upgradeable component:", upgradeableError);
      }
      
      // 3. Try to get stakeable component
      try {
        const stakeablePda = FindComponentPda({
          entity: gpuEntity,
          componentId: new PublicKey(componentStakeable.address),
        });
        
        const stakeableInfo = await connection.getAccountInfo(stakeablePda);
        
        if (stakeableInfo) {
          result.stakeablePda = stakeablePda.toBase58();
          
          // Try to decode the stakeable component
          try {
            const stakeableProgram = getComponentStakeableOnChain(engine);
            if (stakeableProgram) {
              const stakeable = stakeableProgram.coder.accounts.decode(
                "stakeable",
                Buffer.from(stakeableInfo.data)
              );
              
              result.isStaked = stakeable.is_staked;
              
              console.log("Successfully decoded stakeable component:", {
                isStaked: result.isStaked
              });
            }
          } catch (decodeError) {
            console.error("Error decoding stakeable component:", decodeError);
          }
        }
      } catch (stakeableError) {
        console.error("Error fetching stakeable component:", stakeableError);
      }
      
      // Try to determine GPU type based on component data
      if (result.production) {
        if (result.production.usdc <= 3.5) {
          result.type = "Entry GPU";
          result.price = 50;
        } else if (result.production.usdc <= 7) {
          result.type = "Standard GPU";
          result.price = 100;
        } else {
          result.type = "Premium GPU";
          result.price = 200;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching blockchain data for GPU ${gpuEntityPda}:`, error);
      return {};
    }
  }, [engine]);

  // Helper function to determine GPU type and specs based on entity ID patterns or store data
  const enhanceGpuDetails = useCallback(async (gpu: GpuOwnership): Promise<EnhancedGpuOwnership> => {
    // Step 1: Try to get data from blockchain first (approach #1)
    try {
      const blockchainData = await fetchGpuDetailsFromBlockchain(gpu.gpuEntityPda);
      
      // If we got meaningful data from the blockchain, use it
      if (blockchainData.type || blockchainData.production) {
        console.log(`Using blockchain data for GPU ${gpu.gpuEntityPda}`);
        
        return {
          ...gpu,
          type: blockchainData.type || "GPU",
          production: blockchainData.production || { usdc: 0, aifi: 0 },
          operatingCost: blockchainData.operatingCost || 0,
          maxLevel: blockchainData.maxLevel || 3,
          price: blockchainData.price || 50,
          currentLevel: blockchainData.currentLevel || 1,
          upgradeablePda: blockchainData.upgradeablePda,
          productionPda: blockchainData.productionPda,
          stakeablePda: blockchainData.stakeablePda,
          isStaked: blockchainData.isStaked
        };
      }
    } catch (blockchainError) {
      console.error("Error fetching blockchain data, falling back to lookup:", blockchainError);
    }
    
    // Step 2: If blockchain data failed or was incomplete, fall back to lookup table (approach #2)
    console.log(`Falling back to lookup table for GPU ${gpu.gpuEntityPda}`);
    
    // First try to match with known GPU entities from the store
    const matchedStoreGpu = availableGpuEntities.find(
      storeGpu => storeGpu.entityPda === gpu.gpuEntityPda
    );
    
    if (matchedStoreGpu) {
      return {
        ...gpu,
        type: matchedStoreGpu.type || "GPU",
        production: getProductionRatesFromType(matchedStoreGpu.type || ""),
        operatingCost: getOperatingCostFromType(matchedStoreGpu.type || ""),
        maxLevel: getMaxLevelFromType(matchedStoreGpu.type || ""),
        price: getPriceFromType(matchedStoreGpu.type || ""),
        currentLevel: 1,
        upgradeablePda: matchedStoreGpu.upgradeablePda,
        productionPda: matchedStoreGpu.productionPda,
        stakeablePda: matchedStoreGpu.stakeablePda
      };
    }
    
    // If no match in store, try to determine type from entity ID pattern
    // First few characters of the entity ID often indicate the type
    const entityIdStart = gpu.gpuEntityPda.substring(0, 10).toLowerCase();
    
    // Common patterns in our entity IDs
    if (entityIdStart.includes("rgcra") || entityIdStart.includes("mbek") || 
        gpu.gpuEntityPda.includes("MBEK") || gpu.gpuEntityPda.includes("RCrA")) {
      // Entry GPU pattern
      return {
        ...gpu,
        type: "Entry GPU",
        production: { usdc: 3, aifi: 5 },
        operatingCost: 1,
        maxLevel: 3,
        price: 50,
        currentLevel: 1
      };
    } else if (entityIdStart.includes("sotsr") || entityIdStart.includes("dotsk") || 
               gpu.gpuEntityPda.includes("DOTSK") || gpu.gpuEntityPda.includes("SoSr")) {
      // Standard GPU pattern
      return {
        ...gpu,
        type: "Standard GPU",
        production: { usdc: 5, aifi: 10 },
        operatingCost: 1.5,
        maxLevel: 4,
        price: 100,
        currentLevel: 1
      };
    } else if (entityIdStart.includes("jnnr") || entityIdStart.includes("dptr") || 
               gpu.gpuEntityPda.includes("DPTR") || gpu.gpuEntityPda.includes("JNNR")) {
      // Premium GPU pattern
      return {
        ...gpu,
        type: "Premium GPU",
        production: { usdc: 10, aifi: 20 },
        operatingCost: 3,
        maxLevel: 5,
        price: 200,
        currentLevel: 1
      };
    }
    
    // Default fallback if we can't determine the type
    return {
      ...gpu,
      type: "GPU",
      production: { usdc: 3, aifi: 5 }, // Default to entry-level specs
      operatingCost: 1,
      maxLevel: 3,
      price: 50,
      currentLevel: 1
    };
  }, [availableGpuEntities, fetchGpuDetailsFromBlockchain]);
  
  // Helper functions to get specs based on GPU type
  function getProductionRatesFromType(type: string) {
    switch (type) {
      case "Entry GPU": return { usdc: 3, aifi: 5 };
      case "Standard GPU": return { usdc: 5, aifi: 10 };
      case "Premium GPU": return { usdc: 10, aifi: 20 };
      default: return { usdc: 3, aifi: 5 }; // Default to entry level
    }
  }
  
  function getOperatingCostFromType(type: string) {
    switch (type) {
      case "Entry GPU": return 1;
      case "Standard GPU": return 1.5;
      case "Premium GPU": return 3;
      default: return 1; // Default to entry level
    }
  }
  
  function getMaxLevelFromType(type: string) {
    switch (type) {
      case "Entry GPU": return 3;
      case "Standard GPU": return 4;
      case "Premium GPU": return 5;
      default: return 3; // Default to entry level
    }
  }
  
  function getPriceFromType(type: string) {
    switch (type) {
      case "Entry GPU": return 50;
      case "Standard GPU": return 100;
      case "Premium GPU": return 200;
      default: return 50; // Default to entry level
    }
  }

  return {
    gpus,
    isLoading,
    error,
    fetchWalletGpus,
    enhanceGpuDetails
  };
} 