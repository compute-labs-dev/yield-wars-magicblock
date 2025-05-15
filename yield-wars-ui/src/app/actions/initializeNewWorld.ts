'use server';

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
    InitializeNewWorld, 
    AddEntity, 
    InitializeComponent,
    ApplySystem,
    World,
} from "@magicblock-labs/bolt-sdk";
import { 
    componentPrice,
    componentOwnership,
    componentProduction,
    componentUpgradeable,
    componentStakeable,
    componentWallet,
    systemPriceAction,
    systemResourceProduction,
    systemUpgrade,
    systemAssignOwnership,
} from "@/lib/constants/programIds";
import { CurrencyType, EntityType } from '@/lib/constants/programEnums';
import bs58 from 'bs58';

interface InitializeWorldResult {
    worldPda: string;
    currencyEntities: Record<CurrencyType, {
        entityPda: string;
        pricePda: string;
    }>;
    gpuEntities?: {
        entityPda: string;
        ownershipPda: string;
        productionPda: string;
        upgradeablePda: string;
        stakeablePda: string;
    }[];
}

// Add explicit price initialization parameters
const PRICE_INIT_PARAMS = {
    USDC: {
        price: 1000000, // $1.00 with 6 decimals
        min_price: 950000,
        max_price: 1050000,
        volatility: 100,
        update_frequency: 3600
    },
    BTC: {
        price: 60000000000, // $60,000.00 with 6 decimals
        min_price: 30000000000,
        max_price: 90000000000,
        volatility: 2000,
        update_frequency: 3600
    },
    ETH: {
        price: 3000000000, // $3,000.00
        min_price: 2000000000,
        max_price: 4000000000,
        volatility: 1500,
        update_frequency: 3600
    },
    SOL: {
        price: 100000000, // $100.00
        min_price: 50000000,
        max_price: 150000000,
        volatility: 2500,
        update_frequency: 3600
    },
    AIFI: {
        price: 10000000, // $10.00
        min_price: 5000000,
        max_price: 15000000,
        volatility: 3000,
        update_frequency: 3600
    }
} as const;

// Define GPU types with their properties
interface GpuTypeProperties {
    name: string;
    usdcPerHour: number; // With 6 decimals
    aifiPerHour: number; // With 6 decimals
    operatingCost: number; // With 6 decimals
    initialPrice: number; // With 6 decimals
    maxLevel: number;
    upgradeUsdcCost: number; // With 6 decimals
    upgradeAifiCost: number; // With 6 decimals
    usdcBoost: number; // Percentage * 100
    aifiBoost: number; // Percentage * 100
}

const GPU_TYPES: GpuTypeProperties[] = [
    {
        name: "Entry GPU",
        usdcPerHour: 3000000, // 3 USDC/hour
        aifiPerHour: 5000000, // 5 AiFi/hour
        operatingCost: 1000000, // 1 USDC/hour
        initialPrice: 50000000, // 50 USDC
        maxLevel: 3,
        upgradeUsdcCost: 25000000, // 25 USDC
        upgradeAifiCost: 10000000, // 10 AiFi
        usdcBoost: 1500, // 15%
        aifiBoost: 2000, // 20%
    },
    {
        name: "Standard GPU",
        usdcPerHour: 5000000, // 5 USDC/hour
        aifiPerHour: 10000000, // 10 AiFi/hour
        operatingCost: 1500000, // 1.5 USDC/hour
        initialPrice: 100000000, // 100 USDC
        maxLevel: 4,
        upgradeUsdcCost: 50000000, // 50 USDC
        upgradeAifiCost: 20000000, // 20 AiFi
        usdcBoost: 2000, // 20%
        aifiBoost: 2500, // 25%
    },
    {
        name: "Premium GPU",
        usdcPerHour: 10000000, // 10 USDC/hour
        aifiPerHour: 20000000, // 20 AiFi/hour
        operatingCost: 3000000, // 3 USDC/hour
        initialPrice: 200000000, // 200 USDC
        maxLevel: 5,
        upgradeUsdcCost: 100000000, // 100 USDC
        upgradeAifiCost: 40000000, // 40 AiFi
        usdcBoost: 2500, // 25%
        aifiBoost: 3000, // 30%
    }
];

async function sendAndConfirmTransaction(
    connection: Connection, 
    transaction: any, 
    signer: Keypair,
    operationName: string,
    skipConfirmation: boolean = true // Default to skipping confirmation for faster development
): Promise<string> {
    // Get the latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    
    // Prepare the transaction
    transaction.feePayer = signer.publicKey;
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.sign(signer);
    
    try {
        // Send the transaction
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed"
        });
        
        console.log(`${operationName} transaction sent with signature: ${signature}`);
        
        // Only confirm if not skipping confirmation
        if (!skipConfirmation) {
            try {
                console.log(`Confirming ${operationName} transaction...`);
                const confirmation = await connection.confirmTransaction({
                    signature,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
                }, "confirmed");
                
                if (confirmation.value.err) {
                    console.warn(`${operationName} transaction confirmed with error:`, confirmation.value.err);
                } else {
                    console.log(`${operationName} transaction confirmed successfully`);
                }
            } catch (confirmError) {
                console.warn(`Error confirming ${operationName} transaction:`, confirmError);
                console.log(`Note: The ${operationName} transaction may still have succeeded.`);
            }
        }
        
        return signature;
    } catch (error) {
        console.error(`Error sending ${operationName} transaction:`, error);
        throw error;
    }
}

export async function initializeNewWorld(): Promise<InitializeWorldResult> {
    try {
        const ADMIN_PRIVATE_KEY_BS58 = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
        if (!ADMIN_PRIVATE_KEY_BS58) {
            throw new Error('Admin private key not found in environment');
        }

        const adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_PRIVATE_KEY_BS58));
        
        // Try using a more reliable RPC endpoint
        const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
        console.log(`Using RPC endpoint: ${rpcEndpoint}`);
        const connection = new Connection(rpcEndpoint, "confirmed");

        // 1. Initialize New World
        console.log("Initializing new world...");
        const initNewWorld = await InitializeNewWorld({
            payer: adminKeypair.publicKey,
            connection: connection,
        });
        
        // Use the helper function for sending and confirming
        const worldTxSign = await sendAndConfirmTransaction(
            connection,
            initNewWorld.transaction,
            adminKeypair,
            "World initialization",
            false
        );
        
        console.log(`World initialized (ID=${initNewWorld.worldPda})`);

        // Attempt to fetch the world with retries
        console.log("Attempting to fetch world data...");
        let world = null;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (retryCount < maxRetries) {
            try {
                // Wait a bit between retries
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Attempt to fetch the world
                world = await World.fromAccountAddress(
                    connection,
                    initNewWorld.worldPda,
                    "confirmed"
                );
                
                console.log(`Successfully fetched world data (entities: ${world.entities.toString()})`);
                break; // Success, exit the loop
            } catch (error: any) {
                retryCount++;
                console.log(`Attempt ${retryCount}/${maxRetries} to fetch world failed: ${error.message}`);
                
                if (retryCount === maxRetries) {
                    console.log("Max retries reached. Will try to continue without verified world data.");
                }
            }
        }

        const currencyEntities: Record<CurrencyType, { entityPda: string; pricePda: string }> = {} as Record<CurrencyType, { entityPda: string; pricePda: string }>;

        // Add this at the beginning of the function, after setting up constants
        let adminEntityPda: PublicKey | null = null;

        // Add this after world initialization but before creating currency entities
        // Create an admin entity for ownership assignments
        console.log("Creating admin entity for ownership assignments...");
        const addAdminEntity = await AddEntity({
            payer: adminKeypair.publicKey,
            world: initNewWorld.worldPda,
            connection: connection,
        });

        const adminEntityTx = await sendAndConfirmTransaction(
            connection,
            addAdminEntity.transaction,
            adminKeypair,
            "Admin entity creation",
            false
        );
        adminEntityPda = addAdminEntity.entityPda;
        console.log(`Created admin entity: ${adminEntityPda.toBase58()}`);

        // Initialize ownership component for admin entity
        const initAdminOwnership = await InitializeComponent({
            payer: adminKeypair.publicKey,
            entity: adminEntityPda,
            componentId: new PublicKey(componentOwnership.address),
        });

        const adminOwnershipTx = await sendAndConfirmTransaction(
            connection,
            initAdminOwnership.transaction,
            adminKeypair,
            "Admin ownership component initialization",
            false
        );
        console.log(`Initialized admin ownership component: ${initAdminOwnership.componentPda.toBase58()}`);

        // Initialize the admin ownership data
        const initAdminOwnershipArgs = {
            operation_type: 0, // INITIALIZE
            owner_type: EntityType.Player, // Admin is a player
            entity_id: 0,
            entity_type: 0,
            destination_entity_id: 0,
            owner_entity_id: 0
        };

        const initAdminOwnershipSystem = await ApplySystem({
            authority: adminKeypair.publicKey,
            systemId: new PublicKey(systemAssignOwnership.address),
            world: initNewWorld.worldPda,
            entities: [{
                entity: adminEntityPda,
                components: [
                    { componentId: new PublicKey(componentOwnership.address) },
                    { componentId: new PublicKey(componentOwnership.address) }
                ],
            }],
            args: initAdminOwnershipArgs
        });

        const adminOwnershipInitTx = await sendAndConfirmTransaction(
            connection,
            initAdminOwnershipSystem.transaction,
            adminKeypair,
            "Admin ownership initialization",
            false
        );
        console.log(`Initialized admin ownership data`);

        // 2. Create and initialize each currency entity one at a time
        for (const currency of Object.values(CurrencyType)) {
            if (typeof currency === 'number') {  // Skip string enum values
                console.log(`Initializing entity and components for ${CurrencyType[currency]}...`);
                
                // 2a. Create entity
                const addEntity = await AddEntity({
                    payer: adminKeypair.publicKey,
                    world: initNewWorld.worldPda,
                    connection: connection,
                });
                
                const entityTx = await sendAndConfirmTransaction(
                    connection,
                    addEntity.transaction,
                    adminKeypair,
                    `${CurrencyType[currency]} entity creation`,
                    false
                );
                console.log(`Created entity for ${CurrencyType[currency]}: ${addEntity.entityPda.toBase58()}`);

                // 2b. Initialize price component
                const initPrice = await InitializeComponent({
                    payer: adminKeypair.publicKey,
                    entity: addEntity.entityPda,
                    componentId: new PublicKey(componentPrice.address),
                });
                
                const priceTx = await sendAndConfirmTransaction(
                    connection,
                    initPrice.transaction,
                    adminKeypair,
                    `${CurrencyType[currency]} price component initialization`,
                    false
                );
                console.log(`Initialized price component: ${initPrice.componentPda.toBase58()}`);

                // Store entity and component PDAs
                currencyEntities[currency] = {
                    entityPda: addEntity.entityPda.toBase58(),
                    pricePda: initPrice.componentPda.toBase58()
                };

                // 2c. Initialize price data
                const priceParams = PRICE_INIT_PARAMS[CurrencyType[currency] as keyof typeof PRICE_INIT_PARAMS];
                if (!priceParams) {
                    console.log(`No price parameters found for ${CurrencyType[currency]}, skipping price data initialization`);
                    continue;
                }

                const initPriceSystem = await ApplySystem({
                    authority: adminKeypair.publicKey,
                    systemId: new PublicKey(systemPriceAction.address),
                    world: initNewWorld.worldPda,
                    entities: [{
                        entity: addEntity.entityPda,
                        components: [
                            { componentId: new PublicKey(componentPrice.address) }
                        ],
                    }],
                    args: {
                        operation_type: 0, // INITIALIZE
                        currency_type: currency,
                        ...priceParams
                    }
                });

                const priceSystemTx = await sendAndConfirmTransaction(
                    connection,
                    initPriceSystem.transaction,
                    adminKeypair,
                    `${CurrencyType[currency]} price data initialization`,
                    false
                );
                console.log(`Initialized price data for ${CurrencyType[currency]}`);

                // 2d. Enable price updates
                const enablePrice = await ApplySystem({
                    authority: adminKeypair.publicKey,
                    systemId: new PublicKey(systemPriceAction.address),
                    world: initNewWorld.worldPda,
                    entities: [{
                        entity: addEntity.entityPda,
                        components: [
                            { componentId: new PublicKey(componentPrice.address) }
                        ],
                    }],
                    args: {
                        operation_type: 1, // ENABLE
                        currency_type: currency,
                        ...priceParams
                    }
                });

                const enableTx = await sendAndConfirmTransaction(
                    connection,
                    enablePrice.transaction,
                    adminKeypair,
                    `${CurrencyType[currency]} price updates enable`,
                    false
                );
                console.log(`Enabled price updates for ${CurrencyType[currency]}`);

                // Add delay between iterations to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 3. Create GPU entities for players to buy and use
        console.log("Creating GPU entities...");
        const gpuEntities = [];
        const currentTime = Math.floor(Date.now() / 1000);

        // Create one of each GPU type
        for (let i = 0; i < GPU_TYPES.length; i++) {
            console.log(`Creating ${GPU_TYPES[i].name}...`);
            
            // 3a. Create entity for the GPU
            const addGpuEntity = await AddEntity({
                payer: adminKeypair.publicKey,
                world: initNewWorld.worldPda,
                connection: connection,
            });
            
            const gpuEntityTx = await sendAndConfirmTransaction(
                connection,
                addGpuEntity.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} entity creation`,
                false
            );
            console.log(`Created entity for ${GPU_TYPES[i].name}: ${addGpuEntity.entityPda.toBase58()}`);

            // 3b. Initialize ownership component
            const initOwnership = await InitializeComponent({
                payer: adminKeypair.publicKey,
                entity: addGpuEntity.entityPda,
                componentId: new PublicKey(componentOwnership.address),
            });
            
            const ownershipTx = await sendAndConfirmTransaction(
                connection,
                initOwnership.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} ownership component initialization`,
                false
            );
            console.log(`Initialized ownership component: ${initOwnership.componentPda.toBase58()}`);

            // 3c. Initialize ownership data with basic properties first
            const initOwnershipArgs = {
                operation_type: 0, // INITIALIZE
                owner_type: EntityType.GPU, // This is a GPU type entity
                entity_id: 0,
                entity_type: 0,
                destination_entity_id: 0,
                owner_entity_id: 0 // Not used for initialization
            };
            
            const initOwnershipSystem = await ApplySystem({
                authority: adminKeypair.publicKey,
                systemId: new PublicKey(systemAssignOwnership.address),
                world: initNewWorld.worldPda,
                entities: [{
                    entity: addGpuEntity.entityPda,
                    components: [
                        { componentId: new PublicKey(componentOwnership.address) },
                        { componentId: new PublicKey(componentOwnership.address) }
                    ],
                }],
                args: initOwnershipArgs
            });
            
            const ownershipInitTx = await sendAndConfirmTransaction(
                connection,
                initOwnershipSystem.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} ownership initialization`,
                false
            );
            console.log(`Initialized ownership data for ${GPU_TYPES[i].name}`);

            // Now assign the GPU to the admin (will be transferred to players when purchased)
            const assignOwnershipArgs = {
                operation_type: 1, // ASSIGN_TO_WALLET
                owner_type: EntityType.Player,
                entity_id: i + 100, // Using a simple ID based on index
                entity_type: EntityType.GPU,
                destination_entity_id: 0,
                owner_entity_id: 999 // Using admin entity ID
            };
            
            const assignOwnershipSystem = await ApplySystem({
                authority: adminKeypair.publicKey,
                systemId: new PublicKey(systemAssignOwnership.address),
                world: initNewWorld.worldPda,
                entities: [{
                    entity: adminEntityPda, // Admin entity (owner)
                    components: [
                        { componentId: new PublicKey(componentOwnership.address) }, // Admin's ownership component
                    ],
                }, {
                    entity: addGpuEntity.entityPda, // GPU entity (owned)
                    components: [
                        { componentId: new PublicKey(componentOwnership.address) }, // GPU's ownership component
                    ],
                }],
                args: assignOwnershipArgs
            });
            
            const ownershipAssignTx = await sendAndConfirmTransaction(
                connection,
                assignOwnershipSystem.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} ownership assignment`,
                false
            );
            console.log(`Assigned ${GPU_TYPES[i].name} to admin`);

            // 3d. Initialize production component
            const initProduction = await InitializeComponent({
                payer: adminKeypair.publicKey,
                entity: addGpuEntity.entityPda,
                componentId: new PublicKey(componentProduction.address),
            });
            
            const productionTx = await sendAndConfirmTransaction(
                connection,
                initProduction.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} production component initialization`,
                false
            );
            console.log(`Initialized production component: ${initProduction.componentPda.toBase58()}`);

            // 3d-2. Initialize wallet component for the GPU
            const initWallet = await InitializeComponent({
                payer: adminKeypair.publicKey,
                entity: addGpuEntity.entityPda,
                componentId: new PublicKey(componentWallet.address),
            });
            
            const walletTx = await sendAndConfirmTransaction(
                connection,
                initWallet.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} wallet component initialization`,
                false
            );
            console.log(`Initialized wallet component: ${initWallet.componentPda.toBase58()}`);

            // 3e. Initialize production data
            const initProductionSystem = await ApplySystem({
                authority: adminKeypair.publicKey,
                systemId: new PublicKey(systemResourceProduction.address),
                world: initNewWorld.worldPda,
                entities: [{
                    entity: addGpuEntity.entityPda,
                    components: [
                        { componentId: new PublicKey(componentProduction.address) }, // Production component first
                        { componentId: new PublicKey(componentWallet.address) }      // Wallet component second
                    ],
                }],
                args: {
                    operation_type: 0, // INITIALIZE
                    usdc_per_hour: GPU_TYPES[i].usdcPerHour,
                    aifi_per_hour: GPU_TYPES[i].aifiPerHour,
                    current_time: currentTime,
                    producer_type: EntityType.GPU,
                    level: 1, // Start at level 1
                    is_active: false, // Start inactive
                    operating_cost: GPU_TYPES[i].operatingCost,
                    efficiency_multiplier: 10000 // 100% efficiency (10000 = 100%)
                }
            });
            
            const productionSystemTx = await sendAndConfirmTransaction(
                connection,
                initProductionSystem.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} production data initialization`,
                false
            );
            console.log(`Initialized production data for ${GPU_TYPES[i].name}`);

            // 3f. Initialize upgradeable component
            const initUpgradeable = await InitializeComponent({
                payer: adminKeypair.publicKey,
                entity: addGpuEntity.entityPda,
                componentId: new PublicKey(componentUpgradeable.address),
            });
            
            const upgradeableTx = await sendAndConfirmTransaction(
                connection,
                initUpgradeable.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} upgradeable component initialization`,
                false
            );
            console.log(`Initialized upgradeable component: ${initUpgradeable.componentPda.toBase58()}`);

            // 3g. Initialize upgrade data - wrapped in try-catch to continue if it fails
            try {
                const initUpgradeSystem = await ApplySystem({
                    authority: adminKeypair.publicKey,
                    systemId: new PublicKey(systemUpgrade.address),
                    world: initNewWorld.worldPda,
                    entities: [{
                        entity: addGpuEntity.entityPda,
                        components: [
                            { componentId: new PublicKey(componentUpgradeable.address) }, // upgradeable component
                            { componentId: new PublicKey(componentWallet.address) },      // wallet component
                            { componentId: new PublicKey(componentProduction.address) }   // production component
                        ],
                    }],
                    args: {
                        operation_type: 0, // INITIALIZE
                        entity_type: EntityType.GPU,
                        current_level: 1, // Start at level 1
                        max_level: GPU_TYPES[i].maxLevel,
                        upgrade_cooldown: 3600, // 1 hour cooldown
                        next_upgrade_usdc_cost: GPU_TYPES[i].upgradeUsdcCost,
                        next_upgrade_aifi_cost: GPU_TYPES[i].upgradeAifiCost,
                        next_usdc_boost: GPU_TYPES[i].usdcBoost,
                        next_aifi_boost: GPU_TYPES[i].aifiBoost,
                        current_time: currentTime,
                    }
                });
                
                const upgradeSystemTx = await sendAndConfirmTransaction(
                    connection,
                    initUpgradeSystem.transaction,
                    adminKeypair,
                    `${GPU_TYPES[i].name} upgrade data initialization`,
                    false
                );
                console.log(`Initialized upgrade data for ${GPU_TYPES[i].name}`);
            } catch (error) {
                console.error(`Error initializing upgrade data for ${GPU_TYPES[i].name}:`, error);
                console.log("Continuing with other initialization steps...");
            }

            // 3h. Initialize stakeable component
            const initStakeable = await InitializeComponent({
                payer: adminKeypair.publicKey,
                entity: addGpuEntity.entityPda,
                componentId: new PublicKey(componentStakeable.address),
            });
            
            const stakeableTx = await sendAndConfirmTransaction(
                connection,
                initStakeable.transaction,
                adminKeypair,
                `${GPU_TYPES[i].name} stakeable component initialization`,
                false
            );
            console.log(`Initialized stakeable component: ${initStakeable.componentPda.toBase58()}`);

            // 3i. Initialize stakeable data - wrapped in try-catch to continue if it fails
            try {
                // Following the same pattern as other systems
                const initStakeableSystem = await ApplySystem({
                    authority: adminKeypair.publicKey,
                    systemId: new PublicKey("2E9xsWfTZGSXcKQTyJYWxKT7SSJHFJC8GMcJd8xsqprW"), // Hardcoded staking system ID
                    world: initNewWorld.worldPda,
                    entities: [{
                        entity: addGpuEntity.entityPda,
                        components: [
                            { componentId: new PublicKey(componentStakeable.address) }, // stakeable component
                            { componentId: new PublicKey(componentWallet.address) },    // wallet component
                            { componentId: new PublicKey(componentProduction.address) } // production component
                        ],
                    }],
                    args: {
                        operation_type: 0, // INITIALIZE
                        staking_type: EntityType.GPU,
                        min_staking_period: 86400, // 1 day in seconds
                        reward_rate: 15000, // 150% of base rate (10000 = 100%)
                        unstaking_penalty: 5000, // 50% penalty for early unstaking
                        base_usdc_per_hour: GPU_TYPES[i].usdcPerHour,
                        base_aifi_per_hour: GPU_TYPES[i].aifiPerHour,
                        current_time: currentTime,
                        stake: false, // Not used for initialization
                        can_claim_rewards: true // Rewards can be claimed
                    }
                });
                
                const stakeableSystemTx = await sendAndConfirmTransaction(
                    connection,
                    initStakeableSystem.transaction,
                    adminKeypair,
                    `${GPU_TYPES[i].name} stakeable data initialization`,
                    false
                );
                console.log(`Initialized stakeable data for ${GPU_TYPES[i].name}`);
            } catch (error) {
                console.error(`Error initializing stakeable data for ${GPU_TYPES[i].name}:`, error);
                console.log("Continuing with GPU entity initialization...");
            }

            // Add this GPU to our list
            gpuEntities.push({
                entityPda: addGpuEntity.entityPda.toBase58(),
                ownershipPda: initOwnership.componentPda.toBase58(),
                productionPda: initProduction.componentPda.toBase58(),
                upgradeablePda: initUpgradeable.componentPda.toBase58(),
                stakeablePda: initStakeable.componentPda.toBase58()
            });

            // Add delay between iterations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return {
            worldPda: initNewWorld.worldPda.toBase58(),
            currencyEntities,
            gpuEntities
        };

    } catch (error) {
        console.error("Error in world initialization:", error);
        throw error;
    }
}

export async function logWorldConstants(result: InitializeWorldResult): Promise<void> {
    console.log("\n\n========== COPY THESE CONSTANTS TO src/lib/consts.ts ==========\n");
    
    console.log(`// Game World Constants`);
    console.log(`export const WORLD_ADDRESS = new PublicKey(`);
    console.log(`    "${result.worldPda}"`);
    console.log(`);\n`);
    
    console.log(`// Token Entity PDAs`);
    const currencyNames = ["USDC", "BTC", "ETH", "SOL", "AIFI"];
    Object.entries(result.currencyEntities).forEach(([key, value]) => {
        const currencyName = currencyNames[Number(key)];
        console.log(`export const ${currencyName}_ENTITY = new PublicKey(`);
        console.log(`    "${value.entityPda}"`);
        console.log(`);\n`);
    });
    
    console.log(`// Price Feed PDAs`);
    Object.entries(result.currencyEntities).forEach(([key, value]) => {
        const currencyName = currencyNames[Number(key)];
        console.log(`export const ${currencyName}_PRICE_PDA = new PublicKey(`);
        console.log(`    "${value.pricePda}"`);
        console.log(`);\n`);
    });
    
    if (result.gpuEntities && result.gpuEntities.length > 0) {
        console.log(`// GPU Entity PDAs`);
        const gpuTypes = ["ENTRY", "STANDARD", "PREMIUM"];
        result.gpuEntities.forEach((gpu, index) => {
            const gpuName = gpuTypes[index] || `GPU_${index + 1}`;
            
            console.log(`export const ${gpuName}_GPU_ENTITY = new PublicKey(`);
            console.log(`    "${gpu.entityPda}"`);
            console.log(`);\n`);
            
            console.log(`export const ${gpuName}_GPU_OWNERSHIP = new PublicKey(`);
            console.log(`    "${gpu.ownershipPda}"`);
            console.log(`);\n`);
            
            console.log(`export const ${gpuName}_GPU_PRODUCTION = new PublicKey(`);
            console.log(`    "${gpu.productionPda}"`);
            console.log(`);\n`);
            
            console.log(`export const ${gpuName}_GPU_UPGRADEABLE = new PublicKey(`);
            console.log(`    "${gpu.upgradeablePda}"`);
            console.log(`);\n`);
            
            console.log(`export const ${gpuName}_GPU_STAKEABLE = new PublicKey(`);
            console.log(`    "${gpu.stakeablePda}"`);
            console.log(`);\n`);
        });
    }
    
    console.log(`// Admin Entity PDA (for purchases)`);
    console.log(`export const ADMIN_ENTITY = "${process.env.NEXT_PUBLIC_ADMIN_ENTITY || ""}";`);
    
    console.log("\n========== END CONSTANTS ==========\n\n");
}