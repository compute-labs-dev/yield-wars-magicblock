'use server';

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  AddEntity,
  InitializeComponent,
  ApplySystem,
  FindComponentPda,
  Provider as BoltProvider,
} from '@magicblock-labs/bolt-sdk';
import { AnchorProvider, setProvider } from "@coral-xyz/anchor";

import { 
  componentWallet, 
  componentPrice, 
  systemEconomy, 
  componentOwnership,
  systemAssignOwnership,
  SYSTEM_PRICE_ACTION_PROGRAM_ID, 
} from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';


// --- Constants (should be moved to a config or .env file) ---
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
// const RPC_ENDPOINT = 'https://devnet.magicblock.app'
const ADMIN_PRIVATE_KEY_BS58 = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;

const TRANSACTION_TYPE_INITIALIZE = 2;
const STARTING_USDC_AMOUNT = 1000000000; // 1,000 USDC with 6 decimals (1,000,000,000 = $1,000)

// Add price initialization parameters for all currencies
const PRICE_PARAMS = {
  USDC: {
    price: 1000000, // $1.00 (using 6 decimal places)
    min_price: 950000, // $0.95
    max_price: 1050000, // $1.05
    volatility: 100, // 1% volatility
    update_frequency: 3600 // Update once per hour
  },
  BTC: {
    price: 60000000000, // $60,000.00
    min_price: 30000000000, // $30,000
    max_price: 90000000000, // $90,000
    volatility: 2000, // 20% volatility
    update_frequency: 3600 // Update once per hour
  },
  ETH: {
    price: 3000000000, // $3,000.00
    min_price: 2000000000, // $2,000
    max_price: 4000000000, // $4,000
    volatility: 1500, // 15% volatility
    update_frequency: 3600
  },
  SOL: {
    price: 100000000, // $100.00
    min_price: 50000000, // $50
    max_price: 150000000, // $150
    volatility: 2500, // 25% volatility
    update_frequency: 3600
  },
  AIFI: {
    price: 10000000, // $10.00
    min_price: 5000000, // $5
    max_price: 15000000, // $15
    volatility: 3000, // 30% volatility
    update_frequency: 3600
  }
};

// Add after the PRICE_PARAMS constant
const ENTITY_TYPE_PLAYER = 0; // From EntityType enum in ownership component
const OPERATION_TYPE_ASSIGN_TO_WALLET = 1; // From OperationType enum in assign-ownership system

interface InitializeUserWalletParams {
  userPublicKey: string;
  worldPda: string; // PDA of the initialized world
}

interface InitializeUserWalletResult {
  entityPda: string;
  walletComponentPda: string;
  ownershipComponentPda: string;
  priceComponentPdas: PriceComponentPdas;
  initSignatures: string[];
}

// Add type for price components that matches the return type expected
interface PriceComponentPdas {
    USDC: string;
    BTC: string;
    ETH: string;
    SOL: string;
    AIFI: string;
}

async function initializePriceComponent(
    connection: Connection,
    adminKeypair: Keypair,
    worldPda: PublicKey,
    entityPda: PublicKey,
    currencyType: number,
    priceParams: {
        price: number,
        min_price: number,
        max_price: number,
        volatility: number,
        update_frequency: number
    }
): Promise<{ componentPda: PublicKey, signature: string }> {
    console.log(`Initializing ${CurrencyType[currencyType]} price component...`);
    
    // 1. Find the unique PDA for this currency type
    const priceComponentPda = FindComponentPda({
        componentId: new PublicKey(componentPrice.address),
        entity: entityPda,
    });
    
    console.log(`Derived price component PDA for ${CurrencyType[currencyType]}: ${priceComponentPda.toBase58()}`);
    
    // 2. Initialize the component account
    const initPriceCompResult = await InitializeComponent({
        payer: adminKeypair.publicKey,
        entity: entityPda,
        componentId: new PublicKey(componentPrice.address),
    });

    // Verify the derived PDA matches the initialization result
    if (priceComponentPda.toBase58() !== initPriceCompResult.componentPda.toBase58()) {
        throw new Error(`PDA mismatch for ${CurrencyType[currencyType]}: expected ${priceComponentPda.toBase58()} but got ${initPriceCompResult.componentPda.toBase58()}`);
    }

    // Sign and send with retry
    const initSig = await sendAndConfirmWithRetry(
        connection,
        initPriceCompResult.transaction,
        adminKeypair,
        `Initialize ${CurrencyType[currencyType]} price component`
    );
    console.log(`Price component account created for ${CurrencyType[currencyType]}: ${initPriceCompResult.componentPda.toBase58()}`);

    // 3. Initialize price data
    const initPriceArgs = {
        operation_type: 0, // INITIALIZE
        currency_type: currencyType,
        price: priceParams.price,
        min_price: priceParams.min_price,
        max_price: priceParams.max_price,
        volatility: priceParams.volatility,
        update_frequency: priceParams.update_frequency
    };

    const initPriceSystem = await ApplySystem({
        authority: adminKeypair.publicKey,
        systemId: new PublicKey(SYSTEM_PRICE_ACTION_PROGRAM_ID),
        world: worldPda,
        entities: [{
            entity: entityPda,
            components: [
                { componentId: new PublicKey(componentPrice.address) }
            ],
        }],
        args: initPriceArgs,
    });

    const initDataSig = await sendAndConfirmWithRetry(
        connection,
        initPriceSystem.transaction,
        adminKeypair,
        `Initialize ${CurrencyType[currencyType]} price data`
    );
    console.log(`Price data initialized for ${CurrencyType[currencyType]}`);

    // 4. Enable price updates
    const enablePriceArgs = {
        operation_type: 1, // ENABLE
        currency_type: currencyType,
        price: priceParams.price,
        min_price: priceParams.min_price,
        max_price: priceParams.max_price,
        volatility: priceParams.volatility,
        update_frequency: priceParams.update_frequency
    };

    const enablePriceSystem = await ApplySystem({
        authority: adminKeypair.publicKey,
        systemId: new PublicKey(SYSTEM_PRICE_ACTION_PROGRAM_ID),
        world: worldPda,
        entities: [{
            entity: entityPda,
            components: [
                { componentId: new PublicKey(componentPrice.address) }
            ],
        }],
        args: enablePriceArgs,
    });

    const enableSig = await sendAndConfirmWithRetry(
        connection,
        enablePriceSystem.transaction,
        adminKeypair,
        `Enable ${CurrencyType[currencyType]} price updates`
    );
    console.log(`Price updates enabled for ${CurrencyType[currencyType]}`);

    // Verify the component was initialized correctly
    const accountInfo = await connection.getAccountInfo(priceComponentPda);
    if (!accountInfo) {
        throw new Error(`Failed to verify price component for ${CurrencyType[currencyType]}`);
    }
    console.log(`Verified price component for ${CurrencyType[currencyType]}: ${priceComponentPda.toBase58()}`);

    return {
        componentPda: priceComponentPda,
        signature: enableSig
    };
}

// Add new function to update ownership component
async function updateOwnershipComponent(
    connection: Connection,
    adminKeypair: Keypair,
    worldPda: PublicKey,
    entityPda: PublicKey,
    ownershipComponentPda: PublicKey,
    userPublicKey: PublicKey
) {
    console.log(`Initializing ownership component for entity ${entityPda.toBase58()}`);
    
    // Initialize the ownership component for the entity
    const initEntityOwnership = await InitializeComponent({
        payer: adminKeypair.publicKey,
        entity: entityPda,
        componentId: new PublicKey(componentOwnership.address),
    });

    initEntityOwnership.transaction.feePayer = adminKeypair.publicKey;
    initEntityOwnership.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initEntityOwnership.transaction.sign(adminKeypair);
    const initEntitySig = await connection.sendRawTransaction(initEntityOwnership.transaction.serialize());
    await connection.confirmTransaction(initEntitySig);
    console.log(`Entity ownership component initialized. Signature: ${initEntitySig}`);

    // Now use the AssignOwnership system to link the entity to the user's wallet
    const assignOwnershipArgs = {
        operation_type: OPERATION_TYPE_ASSIGN_TO_WALLET,
        owner_type: ENTITY_TYPE_PLAYER,
        entity_id: 123, // Using a simple test ID like in the tests
        entity_type: ENTITY_TYPE_PLAYER,
        destination_entity_id: 0,
        owner_entity_id: 1234 // Using a numeric ID for owner entity
    };

    console.log("Setting up ownership between:", {
        entityPda: entityPda.toBase58(),
        userWallet: userPublicKey.toBase58(),
        ownershipComponentPda: ownershipComponentPda.toBase58()
    });

    const assignOwnership = await ApplySystem({
        authority: adminKeypair.publicKey,
        systemId: new PublicKey(systemAssignOwnership.address),
        world: worldPda,
        entities: [{
            entity: entityPda,
            components: [
                { componentId: new PublicKey(componentOwnership.address) }, // Source ownership
                { componentId: new PublicKey(componentOwnership.address) }  // Destination ownership (same component)
            ],
        }],
        args: assignOwnershipArgs,
    });

    assignOwnership.transaction.feePayer = adminKeypair.publicKey;
    assignOwnership.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    assignOwnership.transaction.sign(adminKeypair);
    const assignSig = await connection.sendRawTransaction(assignOwnership.transaction.serialize());
    await connection.confirmTransaction(assignSig);
    console.log(`Ownership assigned to user. Signature: ${assignSig}`);

    // Verify the ownership was set correctly
    try {
        const ownershipInfo = await connection.getAccountInfo(ownershipComponentPda);
        if (ownershipInfo) {
            console.log("Verified ownership component:", {
                dataSize: ownershipInfo.data.length,
                owner: ownershipInfo.owner.toBase58(),
                data: ownershipInfo.data
            });
        }
    } catch (error) {
        console.error("Error verifying ownership:", error);
    }

    return [initEntitySig, assignSig];
}

async function sendAndConfirmWithRetry(
  connection: Connection,
  transaction: Transaction,
  signer: Keypair,
  operation: string
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      transaction.feePayer = signer.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.sign(signer);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature);
      console.log(`${operation} succeeded on attempt ${attempt + 1}. Signature: ${signature}`);
      return signature;
    } catch (error) {
      lastError = error as Error;
      console.error(`${operation} failed on attempt ${attempt + 1}:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  throw new Error(`${operation} failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}

// Add this function to create a keypair from base58 string
function createKeypairFromBase58(base58PrivateKey: string): Keypair {
  const decodedKey = bs58.decode(base58PrivateKey);
  return Keypair.fromSecretKey(decodedKey);
}

// Add this function to create a provider
function createAnchorProvider(connection: Connection, keypair: Keypair): AnchorProvider {
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map(tx => {
        tx.sign(keypair);
        return tx;
      });
    },
  };

  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

export async function initializeUserWalletServer(
  params: InitializeUserWalletParams
): Promise<InitializeUserWalletResult> {
  let adminKeypair: Keypair;

  try {
    console.log('Starting wallet initialization in environment:', process.env.VERCEL_ENV || 'local');
    
    const base58PrivateKey = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
    if (!base58PrivateKey) {
      throw new Error('ADMIN_PRIVATE_KEY_BS58 not configured in environment variables.');
    }

    adminKeypair = createKeypairFromBase58(base58PrivateKey);
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Create and set the provider
    const provider = createAnchorProvider(connection, adminKeypair);
    setProvider(provider);

    // Verify provider setup
    const currentProvider = provider;
    if (!currentProvider) {
      throw new Error('Provider not properly initialized');
    }
    
    console.log('Provider successfully initialized with wallet:', currentProvider.wallet.publicKey.toBase58());
    console.log('RPC endpoint:', RPC_ENDPOINT);
    console.log('Admin public key:', adminKeypair.publicKey.toBase58());

    // Add verification that the wallet has SOL
    const balance = await connection.getBalance(adminKeypair.publicKey);
    console.log('Admin wallet balance:', balance / 1e9, 'SOL');
    
    if (balance === 0) {
      throw new Error('Admin wallet has no SOL balance');
    }

    const WALLET_COMPONENT_PROGRAM_ID = componentWallet.address;
    const PRICE_COMPONENT_PROGRAM_ID = componentPrice.address;
    const ECONOMY_SYSTEM_PROGRAM_ID = systemEconomy.address;
    const OWNERSHIP_COMPONENT_PROGRAM_ID = componentOwnership.address;

    const userWalletPublicKey = new PublicKey(params.userPublicKey);
    const worldPublicKey = new PublicKey(params.worldPda);
    const signatures: string[] = [];

    // 1. Add Entity for the user
    console.log(`Adding entity for user ${userWalletPublicKey.toBase58()} in world ${worldPublicKey.toBase58()}`);
    const addEntityResult = await AddEntity({
      payer: adminKeypair.publicKey,
      world: worldPublicKey,
      connection: connection,
    });
    const addEntitySig = await sendAndConfirmWithRetry(
      connection,
      addEntityResult.transaction,
      adminKeypair,
      'Add entity'
    );
    signatures.push(addEntitySig);
    console.log(`Entity added: ${addEntityResult.entityPda.toBase58()}, Signature: ${addEntitySig}`);
    const entityPda = addEntityResult.entityPda;

    // 2. Initialize Ownership Component for the entity
    console.log(`Initializing ownership component for entity ${entityPda.toBase58()}`);
    const initOwnershipCompResult = await InitializeComponent({
      payer: adminKeypair.publicKey,
      entity: entityPda,
      componentId: new PublicKey(OWNERSHIP_COMPONENT_PROGRAM_ID),
    });
    const initOwnershipSig = await sendAndConfirmWithRetry(
      connection,
      initOwnershipCompResult.transaction,
      adminKeypair,
      'Initialize ownership component'
    );
    signatures.push(initOwnershipSig);
    console.log(`Ownership component initialized: ${initOwnershipCompResult.componentPda.toBase58()}, Signature: ${initOwnershipSig}`);

    // After initializing ownership component, update it with owner
    const ownershipSigs = await updateOwnershipComponent(
      connection,
      adminKeypair,
      worldPublicKey,
      entityPda,
      initOwnershipCompResult.componentPda,
      userWalletPublicKey
    );
    signatures.push(...ownershipSigs);

    // 3. Initialize Wallet Component for the entity
    console.log(`Initializing wallet component for entity ${entityPda.toBase58()}`);
    const initWalletCompResult = await InitializeComponent({
      payer: adminKeypair.publicKey,
      entity: entityPda,
      componentId: new PublicKey(WALLET_COMPONENT_PROGRAM_ID),
    });
    const initWalletSig = await sendAndConfirmWithRetry(
      connection,
      initWalletCompResult.transaction,
      adminKeypair,
      'Initialize wallet component'
    );
    signatures.push(initWalletSig);
    console.log(`Wallet component initialized: ${initWalletCompResult.componentPda.toBase58()}, Signature: ${initWalletSig}`);
    const walletComponentPda = initWalletCompResult.componentPda;

    // 4. Initialize and Enable Price Components for all currencies
    console.log("Initializing price components for each currency...");

    const priceComponents: Record<CurrencyType, string> = {} as Record<CurrencyType, string>;

    // Initialize price components for each currency type
    const currencyTypes = [
      CurrencyType.USDC,
      CurrencyType.BTC,
      CurrencyType.ETH,
      CurrencyType.SOL,
      CurrencyType.AIFI
    ] as const;

    for (const currencyType of currencyTypes) {
      try {
        console.log(`\nInitializing price component for ${CurrencyType[currencyType]}...`);
        
        // Get the price parameters for this currency
        const priceParams = PRICE_PARAMS[CurrencyType[currencyType] as keyof typeof PRICE_PARAMS];
        if (!priceParams) {
          throw new Error(`No price parameters found for ${CurrencyType[currencyType]}`);
        }

        const result = await initializePriceComponent(
          connection,
          adminKeypair,
          worldPublicKey,
          entityPda,
          currencyType,
          priceParams
        );

        // Store the PDA with numeric currency type as key
        priceComponents[currencyType] = result.componentPda.toBase58();
        
        console.log(`Successfully initialized ${CurrencyType[currencyType]} price component:`, {
          currencyType,
          pda: result.componentPda.toBase58()
        });

        // Add a small delay between initializations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to initialize price component for ${CurrencyType[currencyType]}:`, error);
        throw error; // Re-throw to handle it in the calling function
      }
    }

    // Verify all required price components were initialized
    const missingComponents = currencyTypes.filter(type => !priceComponents[type]);
    if (missingComponents.length > 0) {
      throw new Error(`Failed to initialize price components for: ${missingComponents.map(type => CurrencyType[type]).join(', ')}`);
    }

    console.log("Final price components:", {
      components: priceComponents,
      mapping: Object.entries(priceComponents).reduce((acc, [key, value]) => ({
        ...acc,
        [CurrencyType[Number(key)]]: value
      }), {} as Record<string, string>)
    });

    // 5. Fund the Wallet using EconomySystem
    console.log(`Funding wallet with ${STARTING_USDC_AMOUNT/1000000} USDC`);
    const fundWalletTxDetails = await ApplySystem({
      authority: adminKeypair.publicKey,
      systemId: new PublicKey(ECONOMY_SYSTEM_PROGRAM_ID),
      world: worldPublicKey,
      entities: [
          {
              entity: entityPda,
              components: [
                  { componentId: new PublicKey(WALLET_COMPONENT_PROGRAM_ID) },    // source_wallet
                  { componentId: new PublicKey(WALLET_COMPONENT_PROGRAM_ID) },    // destination_wallet (same wallet)
                  { componentId: new PublicKey(PRICE_COMPONENT_PROGRAM_ID) },     // source price
                  { componentId: new PublicKey(PRICE_COMPONENT_PROGRAM_ID) },     // destination price
              ],
          }
      ],
      args: {
          transaction_type: TRANSACTION_TYPE_INITIALIZE,
          currency_type: CurrencyType.USDC,
          destination_currency_type: CurrencyType.USDC,  // Same as source for initialization
          amount: STARTING_USDC_AMOUNT
      },
  });

  console.log("Funding transaction created with args:", {
      transaction_type: TRANSACTION_TYPE_INITIALIZE,
      currency_type: CurrencyType.USDC,
      destination_currency_type: CurrencyType.USDC,
      amount: STARTING_USDC_AMOUNT
  });

  const fundWalletSig = await sendAndConfirmWithRetry(
      connection,
      fundWalletTxDetails.transaction,
      adminKeypair,
      'Fund wallet with initial USDC'
  );
  console.log(`Wallet funded with ${STARTING_USDC_AMOUNT/1000000} USDC. Signature: ${fundWalletSig}`);

    return {
      entityPda: entityPda.toBase58(),
      walletComponentPda: walletComponentPda.toBase58(),
      ownershipComponentPda: initOwnershipCompResult.componentPda.toBase58(),
      priceComponentPdas: priceComponents as unknown as PriceComponentPdas,
      initSignatures: signatures,
    };
  } catch (error) {
    console.error('Wallet initialization failed:', {
      error,
      environment: process.env.VERCEL_ENV || 'local',
      rpcEndpoint: RPC_ENDPOINT,
      isProduction: process.env.NODE_ENV === 'production'
    });
    throw error;
  }
} 