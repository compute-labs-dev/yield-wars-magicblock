'use server';

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  AddEntity,
  InitializeComponent,
  ApplySystem,
} from '@magicblock-labs/bolt-sdk'; // Assuming this SDK is available server-side and configured

import { 
  componentWallet, 
  componentPrice, 
  systemEconomy, 
  componentOwnership,
  SYSTEM_PRICE_ACTION_PROGRAM_ID 
} from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';


// --- Constants (should be moved to a config or .env file) ---
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
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

interface InitializeUserWalletParams {
  userPublicKey: string;
  worldPda: string; // PDA of the initialized world
}

interface InitializeUserWalletResult {
  entityPda: string;
  walletComponentPda: string;
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
    
    // 1. Initialize the component account - exactly like the test
    const initPriceCompResult = await InitializeComponent({
        payer: adminKeypair.publicKey,
        entity: entityPda,
        componentId: new PublicKey(componentPrice.address),
    });

    // Sign and send exactly like the test
    initPriceCompResult.transaction.feePayer = adminKeypair.publicKey;
    initPriceCompResult.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initPriceCompResult.transaction.sign(adminKeypair);
    const initSig = await connection.sendRawTransaction(initPriceCompResult.transaction.serialize());
    await connection.confirmTransaction(initSig);
    console.log(`Price component account created: ${initPriceCompResult.componentPda.toBase58()}`);

    // 2. Initialize price data - match test file args exactly
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
                { componentId: new PublicKey(componentPrice.address) } // Use the program ID like the test
            ],
        }],
        args: initPriceArgs,
    });

    initPriceSystem.transaction.feePayer = adminKeypair.publicKey;
    initPriceSystem.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initPriceSystem.transaction.sign(adminKeypair);
    const initDataSig = await connection.sendRawTransaction(initPriceSystem.transaction.serialize());
    await connection.confirmTransaction(initDataSig);
    console.log(`Price data initialized for ${CurrencyType[currencyType]}`);

    // 3. Enable price updates - match test file args exactly
    const enablePriceArgs = {
        operation_type: 1, // ENABLE
        currency_type: currencyType,
        price: priceParams.price,        // Keep original price
        min_price: priceParams.min_price, // Keep original bounds
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
                { componentId: new PublicKey(componentPrice.address) } // Use the program ID like the test
            ],
        }],
        args: enablePriceArgs,
    });

    enablePriceSystem.transaction.feePayer = adminKeypair.publicKey;
    enablePriceSystem.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    enablePriceSystem.transaction.sign(adminKeypair);
    const enableSig = await connection.sendRawTransaction(enablePriceSystem.transaction.serialize());
    await connection.confirmTransaction(enableSig);
    console.log(`Price updates enabled for ${CurrencyType[currencyType]}`);

    return {
        componentPda: initPriceCompResult.componentPda,
        signature: enableSig
    };
}

export async function initializeUserWalletServer(
  params: InitializeUserWalletParams
): Promise<InitializeUserWalletResult> {
  if (!ADMIN_PRIVATE_KEY_BS58) {
    throw new Error('Admin private key (FE_CL_BS58_SIGNER_PRIVATE_KEY) not configured in environment variables.');
  }
  if (!RPC_ENDPOINT) {
    throw new Error('RPC_ENDPOINT not configured.');
  }

  const WALLET_COMPONENT_PROGRAM_ID = componentWallet.address;
  const PRICE_COMPONENT_PROGRAM_ID = componentPrice.address;
  const ECONOMY_SYSTEM_PROGRAM_ID = systemEconomy.address;
  const OWNERSHIP_COMPONENT_PROGRAM_ID = componentOwnership.address;

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_PRIVATE_KEY_BS58));
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
  addEntityResult.transaction.feePayer = adminKeypair.publicKey; // Ensure fee payer is set
  addEntityResult.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  addEntityResult.transaction.sign(adminKeypair); // Payer signs
  const addEntitySig = await connection.sendRawTransaction(addEntityResult.transaction.serialize());
  await connection.confirmTransaction(addEntitySig);
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
  initOwnershipCompResult.transaction.feePayer = adminKeypair.publicKey;
  initOwnershipCompResult.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  initOwnershipCompResult.transaction.sign(adminKeypair);
  const initOwnershipSig = await connection.sendRawTransaction(initOwnershipCompResult.transaction.serialize());
  await connection.confirmTransaction(initOwnershipSig);
  signatures.push(initOwnershipSig);
  console.log(`Ownership component initialized: ${initOwnershipCompResult.componentPda.toBase58()}, Signature: ${initOwnershipSig}`);

  // 3. Initialize Wallet Component for the entity
  console.log(`Initializing wallet component for entity ${entityPda.toBase58()}`);
  const initWalletCompResult = await InitializeComponent({
    payer: adminKeypair.publicKey,
    entity: entityPda,
    componentId: new PublicKey(WALLET_COMPONENT_PROGRAM_ID),
  });
  initWalletCompResult.transaction.feePayer = adminKeypair.publicKey;
  initWalletCompResult.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  initWalletCompResult.transaction.sign(adminKeypair);
  const initWalletSig = await connection.sendRawTransaction(initWalletCompResult.transaction.serialize());
  await connection.confirmTransaction(initWalletSig);
  signatures.push(initWalletSig);
  console.log(`Wallet component initialized: ${initWalletCompResult.componentPda.toBase58()}, Signature: ${initWalletSig}`);
  const walletComponentPda = initWalletCompResult.componentPda;

  // 4. Initialize and Enable Price Components for all currencies
  console.log("Initializing price components for each currency...");

  const priceComponents: Partial<PriceComponentPdas> = {};

  // Initialize USDC price component
  const usdcPrice = await initializePriceComponent(
    connection,
    adminKeypair,
    worldPublicKey,
    entityPda,
    CurrencyType.USDC,
    PRICE_PARAMS.USDC
  );
  priceComponents.USDC = usdcPrice.componentPda.toBase58();
  console.log(`USDC price component initialized: ${usdcPrice.componentPda.toBase58()}`);

  // Initialize BTC price component
  const btcPrice = await initializePriceComponent(
    connection,
    adminKeypair,
    worldPublicKey,
    entityPda,
    CurrencyType.BTC,
    PRICE_PARAMS.BTC
  );
  priceComponents.BTC = btcPrice.componentPda.toBase58();
  console.log(`BTC price component initialized: ${btcPrice.componentPda.toBase58()}`);

  // Initialize ETH price component
  const ethPrice = await initializePriceComponent(
    connection,
    adminKeypair,
    worldPublicKey,
    entityPda,
    CurrencyType.ETH,
    PRICE_PARAMS.ETH
  );
  priceComponents.ETH = ethPrice.componentPda.toBase58();
  console.log(`ETH price component initialized: ${ethPrice.componentPda.toBase58()}`);

  // Initialize SOL price component
  const solPrice = await initializePriceComponent(
    connection,
    adminKeypair,
    worldPublicKey,
    entityPda,
    CurrencyType.SOL,
    PRICE_PARAMS.SOL
  );
  priceComponents.SOL = solPrice.componentPda.toBase58();
  console.log(`SOL price component initialized: ${solPrice.componentPda.toBase58()}`);

  // Initialize AIFI price component
  const aifiPrice = await initializePriceComponent(
    connection,
    adminKeypair,
    worldPublicKey,
    entityPda,
    CurrencyType.AIFI,
    PRICE_PARAMS.AIFI
  );
  priceComponents.AIFI = aifiPrice.componentPda.toBase58();
  console.log(`AIFI price component initialized: ${aifiPrice.componentPda.toBase58()}`);

  async function verifyPriceComponent(
    connection: Connection,
    pricePda: PublicKey,
    currencyType: CurrencyType
  ) {
    const accountInfo = await connection.getAccountInfo(pricePda);
    if (!accountInfo) {
      throw new Error(`Price component for ${CurrencyType[currencyType]} not initialized`);
    }
    console.log(`Verified ${CurrencyType[currencyType]} price component:`, {
      address: pricePda.toBase58(),
      dataSize: accountInfo.data.length,
      owner: accountInfo.owner.toBase58()
    });
  }
  
  // Add verification calls after each price initialization
  await verifyPriceComponent(connection, usdcPrice.componentPda, CurrencyType.USDC);
  await verifyPriceComponent(connection, btcPrice.componentPda, CurrencyType.BTC);
  await verifyPriceComponent(connection, ethPrice.componentPda, CurrencyType.ETH);
  await verifyPriceComponent(connection, solPrice.componentPda, CurrencyType.SOL);
  await verifyPriceComponent(connection, aifiPrice.componentPda, CurrencyType.AIFI);

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

fundWalletTxDetails.transaction.feePayer = adminKeypair.publicKey;
fundWalletTxDetails.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
fundWalletTxDetails.transaction.sign(adminKeypair);
const fundWalletSig = await connection.sendRawTransaction(fundWalletTxDetails.transaction.serialize());
await connection.confirmTransaction(fundWalletSig);
console.log(`Wallet funded with ${STARTING_USDC_AMOUNT/1000000} USDC. Signature: ${fundWalletSig}`);

  return {
    entityPda: entityPda.toBase58(),
    walletComponentPda: walletComponentPda.toBase58(),
    priceComponentPdas: priceComponents as PriceComponentPdas,
    initSignatures: signatures,
  };
} 