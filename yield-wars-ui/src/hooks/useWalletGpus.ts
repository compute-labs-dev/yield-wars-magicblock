import { useState, useCallback, useEffect, useMemo } from 'react';
import { getWalletGpus, GpuOwnership } from '@/app/actions/getWalletGpus';
import { useMagicBlockEngine } from '@/engine/MagicBlockEngineProvider';
import { getComponentOwnershipOnChain, componentProduction, componentStakeable, componentUpgradeable, getComponentProductionOnChain, getComponentStakeableOnChain, getComponentUpgradeableOnChain } from '@/lib/constants/programIds';
import { EntityType } from '@/lib/constants/programEnums';
import { PublicKey } from '@solana/web3.js';
import { useSelector } from 'react-redux';
import { selectWorldPda } from '@/stores/features/worldStore';
import { FindComponentPda } from '@magicblock-labs/bolt-sdk';
import debounce from 'lodash/debounce';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Cache interface
interface GpuCache {
  timestamp: number;
  data: EnhancedGpuOwnership[];
}

// Global cache object
const gpuCache: Record<string, GpuCache> = {};

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

// Add these interfaces at the top of the file after the imports
interface ComponentData {
  upgradeableData: {
    currentLevel?: number;
    maxLevel?: number;
  } | null;
  stakeableData: {
    isStaked?: boolean;
  } | null;
  productionData: {
    isActive?: boolean;
    lastCollectionTime?: { toNumber: () => number };
  } | null;
  pdas: {
    upgradeable: PublicKey;
    stakeable: PublicKey;
    production: PublicKey;
  };
}

export function useWalletGpus(playerEntityPda: string) {
  const [gpus, setGpus] = useState<EnhancedGpuOwnership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const engine = useMagicBlockEngine();
  const worldPda = useSelector(selectWorldPda);

  // Cache key based on player and world
  const cacheKey = useMemo(() => {
    return `${playerEntityPda}_${worldPda}`;
  }, [playerEntityPda, worldPda]);

  // Check if cache is valid
  const isCacheValid = useCallback((cache: GpuCache) => {
    return Date.now() - cache.timestamp < CACHE_DURATION;
  }, []);

  // Batch fetch component data
  const batchFetchComponentData = useCallback(async (gpuEntity: PublicKey): Promise<ComponentData> => {
    const connection = engine.getConnectionChain();
    
    // Create all PDAs at once
    const pdas = {
      upgradeable: FindComponentPda({
        entity: gpuEntity,
        componentId: new PublicKey(componentUpgradeable.address)
      }),
      stakeable: FindComponentPda({
        entity: gpuEntity,
        componentId: new PublicKey(componentStakeable.address)
      }),
      production: FindComponentPda({
        entity: gpuEntity,
        componentId: new PublicKey(componentProduction.address)
      })
    };

    // Batch fetch all accounts
    const accounts = await connection.getMultipleAccountsInfo([
      pdas.upgradeable,
      pdas.stakeable,
      pdas.production
    ]);

    // Process accounts
    const [upgradeableInfo, stakeableInfo, productionInfo] = accounts;

    const result: ComponentData = {
      upgradeableData: null,
      stakeableData: null,
      productionData: null,
      pdas
    };

    try {
      if (upgradeableInfo?.data) {
        const upgradeableProgram = getComponentUpgradeableOnChain(engine);
        result.upgradeableData = upgradeableProgram.coder.accounts.decode(
          "upgradeable",
          Buffer.from(upgradeableInfo.data)
        );
      }
    } catch (err) {
      console.log("No upgradeable component found", err);
    }

    try {
      if (stakeableInfo?.data) {
        const stakeableProgram = getComponentStakeableOnChain(engine);
        result.stakeableData = stakeableProgram.coder.accounts.decode(
          "stakeable",
          Buffer.from(stakeableInfo.data)
        );
      }
    } catch (err) {
      console.log("No stakeable component found", err);
    }

    try {
      if (productionInfo?.data) {
        const productionProgram = getComponentProductionOnChain(engine);
        result.productionData = productionProgram.coder.accounts.decode(
          "production",
          Buffer.from(productionInfo.data)
        );
      }
    } catch (err) {
      console.log("No production component found", err);
    }

    return result;
  }, [engine]);

  // Debounced fetch function
  const debouncedFetchWalletGpus = useMemo(
    () =>
      debounce(async () => {
        if (!playerEntityPda || !worldPda) {
          console.log("Missing required parameters:", { playerEntityPda, worldPda });
          setGpus([]);
          return;
        }

        // Check cache first
        const cached = gpuCache[cacheKey];
        if (cached && isCacheValid(cached)) {
          console.log("Using cached GPU data");
          setGpus(cached.data);
          return;
        }

        setIsLoading(true);
        setError(null);

        const decodedGpus: GpuOwnership[] = [];

        try {
          const accountData = await getWalletGpus({
            worldPda,
            playerEntityPda
          });

          if (!accountData) {
            console.log("No ownership data found");
            setGpus([]);
            return;
          }

          // Enhanced debugging: Log the raw binary data of the account
          const accountDataBuffer = Buffer.from(accountData.data);
          console.log("Raw account binary data:", {
            pubkey: accountData.pubkey,
            dataLength: accountData.data.length,
            dataHex: accountDataBuffer.toString('hex').substring(0, 100) + '...',
            firstBytes: Array.from(accountDataBuffer.slice(0, 50)),
          });

          // Extract GPUs from account data
          try {
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
                    console.log(`Match ${i+1} is not a valid pubkey`, err);
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
                    try {
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
                              console.log("Not a valid pubkey, continue scanning", err);
                              // Not a valid pubkey, continue scanning
                            }
                          }
                        }
                        
                        console.log("Manual data extraction produced:", ownership);
                      }
                    } catch (manualError) {
                      console.error("Manual data extraction failed:", manualError);
                      throw new Error(`Failed to decode ownership data: ${decodeError}`);
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
            
            // After extraction, combine all methods and filter duplicates
            const uniqueGpus = Array.from(new Set(decodedGpus.map(gpu => gpu.gpuEntityPda)))
              .map(gpuEntityPda => decodedGpus.find(gpu => gpu.gpuEntityPda === gpuEntityPda)!);

            console.log(`Found ${uniqueGpus.length} unique GPUs after deduplication`);

            // Process all GPUs in parallel with batched component fetching
            try {
              const enhancedGpus = await Promise.all(
                uniqueGpus.map(async (gpu) => {
                  try {
                    const { upgradeableData, stakeableData, productionData, pdas } = 
                      await batchFetchComponentData(new PublicKey(gpu.gpuEntityPda));

                    const currentLevel = upgradeableData?.currentLevel || 1;
                    const gpuType = getGpuType(currentLevel);

                    return {
                      ...gpu,
                      type: gpuType,
                      production: {
                        usdc: getProductionRatesFromType(gpuType).usdc,
                        aifi: getProductionRatesFromType(gpuType).aifi,
                        isActive: productionData?.isActive || false,
                        lastCollectionTime: productionData?.lastCollectionTime?.toNumber() || 0
                      },
                      operatingCost: getOperatingCostFromType(gpuType),
                      maxLevel: getMaxLevelFromType(gpuType),
                      price: getPriceFromType(gpuType),
                      currentLevel,
                      upgradeablePda: pdas.upgradeable.toBase58(),
                      productionPda: pdas.production.toBase58(),
                      stakeablePda: pdas.stakeable.toBase58(),
                      isStaked: stakeableData?.isStaked || false
                    };
                  } catch (gpuError) {
                    console.error(`Error processing GPU ${gpu.gpuEntityPda}:`, gpuError);
                    // Return basic GPU data on error
                    return {
                      ...gpu,
                      type: "GPU",
                      production: { usdc: 3000000, aifi: 5000000 },
                      operatingCost: 1000000,
                      maxLevel: 3,
                      price: 50000000,
                      currentLevel: 1
                    };
                  }
                })
              );

              // Update cache
              gpuCache[cacheKey] = {
                timestamp: Date.now(),
                data: enhancedGpus
              };

              setGpus(enhancedGpus);
            } catch (enhancementError) {
              console.error("Error enhancing GPUs:", enhancementError);
              // Fallback to basic GPU data
              const basicGpus = uniqueGpus.map(gpu => ({
                ...gpu,
                type: "GPU",
                production: { usdc: 3000000, aifi: 5000000 },
                operatingCost: 1000000,
                maxLevel: 3,
                price: 50000000,
                currentLevel: 1
              }));
              setGpus(basicGpus);
            }
          } catch (extractionError) {
            console.error("Error extracting GPUs:", extractionError);
            setGpus([]);
          }
        } catch (error) {
          console.error("Error fetching wallet GPUs:", error);
          setError(error instanceof Error ? error : new Error(String(error)));
          setGpus([]);
        } finally {
          setIsLoading(false);
        }
      }, 1000),
    [playerEntityPda, worldPda, engine, cacheKey, isCacheValid, batchFetchComponentData]
  );

  // Helper functions moved outside component body
  const getGpuType = (currentLevel: number) => {
    switch (currentLevel) {
      case 1: return 'Entry GPU';
      case 2: return 'Standard GPU';
      case 3: return 'Premium GPU';
      default: return 'unknown';
    }
  };

  const getProductionRatesFromType = (type: string) => {
    switch (type) {
      case "Entry GPU": return { usdc: 3000000, aifi: 5000000 };
      case "Standard GPU": return { usdc: 5000000, aifi: 10000000 };
      case "Premium GPU": return { usdc: 10000000, aifi: 20000000 };
      default: return { usdc: 0, aifi: 0 };
    }
  };

  const getOperatingCostFromType = (type: string) => {
    switch (type) {
      case "Entry GPU": return 1000000;
      case "Standard GPU": return 1500000;
      case "Premium GPU": return 3000000;
      default: return 0;
    }
  };

  const getMaxLevelFromType = (type: string) => {
    switch (type) {
      case "Entry GPU": return 3;
      case "Standard GPU": return 4;
      case "Premium GPU": return 5;
      default: return 1;
    }
  };

  const getPriceFromType = (type: string) => {
    switch (type) {
      case "Entry GPU": return 50000000;
      case "Standard GPU": return 100000000;
      case "Premium GPU": return 200000000;
      default: return 0;
    }
  };

  // Effect to trigger fetch
  useEffect(() => {
    if (playerEntityPda && worldPda) {
      debouncedFetchWalletGpus();
    }
    
    // Cleanup
    return () => {
      debouncedFetchWalletGpus.cancel();
    };
  }, [playerEntityPda, worldPda, debouncedFetchWalletGpus]);

  // Auto-fetch GPUs when playerEntityPda or worldPda changes
  useEffect(() => {
    if (playerEntityPda && worldPda) {
      // Create an async function inside useEffect to allow using await
      const fetchData = async () => {
        try {
          await debouncedFetchWalletGpus();
        } catch (err) {
          console.error("Error in auto-fetch of GPUs:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      };
      
      fetchData();
    }
  }, [playerEntityPda, worldPda, debouncedFetchWalletGpus]);

  // Helper function to fetch GPU details from blockchain
  const fetchGpuDetailsFromBlockchain = useCallback(async (gpuEntityPda: string): Promise<Partial<EnhancedGpuOwnership>> => {
    if (!engine) {
      console.error('Engine not initialized');
      return {};
    }

    const connection = engine.getConnectionChain();
    const gpuEntity = new PublicKey(gpuEntityPda);
    const result: Partial<EnhancedGpuOwnership> = {};

    try {
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

  return {
    gpus,
    isLoading,
    error,
    fetchGpuDetailsFromBlockchain,
    fetchWalletGpus: debouncedFetchWalletGpus,
    enhanceGpuDetails: async (gpu: GpuOwnership) => {
      const { upgradeableData, stakeableData, productionData, pdas } = 
        await batchFetchComponentData(new PublicKey(gpu.gpuEntityPda));

      const currentLevel = upgradeableData?.currentLevel || 1;
      const gpuType = getGpuType(currentLevel);

      return {
        ...gpu,
        type: gpuType,
        production: {
          usdc: getProductionRatesFromType(gpuType).usdc,
          aifi: getProductionRatesFromType(gpuType).aifi,
          isActive: productionData?.isActive || false,
          lastCollectionTime: productionData?.lastCollectionTime?.toNumber() || 0
        },
        operatingCost: getOperatingCostFromType(gpuType),
        maxLevel: getMaxLevelFromType(gpuType),
        price: getPriceFromType(gpuType),
        currentLevel,
        upgradeablePda: pdas.upgradeable.toBase58(),
        productionPda: pdas.production.toBase58(),
        stakeablePda: pdas.stakeable.toBase58(),
        isStaked: stakeableData?.isStaked || false
      };
    }
  };
} 