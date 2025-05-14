'use server';

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
    InitializeNewWorld, 
    AddEntity, 
    InitializeComponent,
    ApplySystem,
} from "@magicblock-labs/bolt-sdk";
import { 
    componentPrice,
    systemPriceAction,
} from "@/lib/constants/programIds";
import { CurrencyType } from '@/lib/constants/programEnums';
import bs58 from 'bs58';


interface InitializeWorldParams {
    userPublicKey: string;
}

interface InitializeWorldResult {
    worldPda: string;
    currencyEntities: {
        [key in CurrencyType]: {
            entityPda: string;
            pricePda: string;
        };
    };
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


export async function initializeNewWorld(
    params: InitializeWorldParams
): Promise<InitializeWorldResult> {
    try {
        const ADMIN_PRIVATE_KEY_BS58 = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
        if (!ADMIN_PRIVATE_KEY_BS58) {
            throw new Error('Admin private key not found in environment');
        }

        const adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_PRIVATE_KEY_BS58));
        const connection = new Connection(
            process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com'
        );

        // 1. Initialize New World
        console.log("Initializing new world...");
        const initNewWorld = await InitializeNewWorld({
            payer: adminKeypair.publicKey,
            connection: connection,
        });
        
        initNewWorld.transaction.feePayer = adminKeypair.publicKey;
        initNewWorld.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        initNewWorld.transaction.sign(adminKeypair);
        const worldTxSign = await connection.sendRawTransaction(initNewWorld.transaction.serialize());
        await connection.confirmTransaction(worldTxSign);
        
        console.log(`World initialized (ID=${initNewWorld.worldPda})`);

        const currencyEntities: any = {};

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
                
                addEntity.transaction.feePayer = adminKeypair.publicKey;
                addEntity.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                addEntity.transaction.sign(adminKeypair);
                const entityTx = await connection.sendRawTransaction(addEntity.transaction.serialize());
                await connection.confirmTransaction(entityTx);
                console.log(`Created entity for ${CurrencyType[currency]}: ${addEntity.entityPda.toBase58()}`);

                // 2b. Initialize price component
                const initPrice = await InitializeComponent({
                    payer: adminKeypair.publicKey,
                    entity: addEntity.entityPda,
                    componentId: new PublicKey(componentPrice.address),
                });
                
                initPrice.transaction.feePayer = adminKeypair.publicKey;
                initPrice.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                initPrice.transaction.sign(adminKeypair);
                const priceTx = await connection.sendRawTransaction(initPrice.transaction.serialize());
                await connection.confirmTransaction(priceTx);
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

                initPriceSystem.transaction.feePayer = adminKeypair.publicKey;
                initPriceSystem.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                initPriceSystem.transaction.sign(adminKeypair);
                const priceSystemTx = await connection.sendRawTransaction(initPriceSystem.transaction.serialize());
                await connection.confirmTransaction(priceSystemTx);
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

                enablePrice.transaction.feePayer = adminKeypair.publicKey;
                enablePrice.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                enablePrice.transaction.sign(adminKeypair);
                const enableTx = await connection.sendRawTransaction(enablePrice.transaction.serialize());
                await connection.confirmTransaction(enableTx);
                console.log(`Enabled price updates for ${CurrencyType[currency]}`);

                // Add delay between iterations to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            worldPda: initNewWorld.worldPda.toBase58(),
            currencyEntities
        };

    } catch (error) {
        console.error("Error in world initialization:", error);
        throw error;
    }
}