'use server';

import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  AddEntity,
  InitializeComponent,
  ApplySystem,
} from '@magicblock-labs/bolt-sdk'; // Assuming this SDK is available server-side and configured

import { componentWallet, componentPrice, systemEconomy, componentOwnership } from '@/lib/constants/programIds';


// --- Constants (should be moved to a config or .env file) ---
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
// const RPC_ENDPOINT = 'https://devnet.magicblock.app'
const ADMIN_PRIVATE_KEY_BS58 = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;

const CURRENCY_TYPE_USDC = 0;
const TRANSACTION_TYPE_INITIALIZE = 2;
const STARTING_USDC_AMOUNT = 1000 * 1_000_000; // 1000 USDC with 6 decimals (10^6)

interface InitializeUserWalletParams {
  userPublicKey: string;
  worldPda: string; // PDA of the initialized world
}

interface InitializeUserWalletResult {
  entityPda: string;
  walletComponentPda: string;
  usdcPriceComponentPda: string;
  initSignatures: string[];
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
  // The adminKeypair.publicKey (payer) creates the entity.
  // User-specific authority/ownership would typically be established by initializing
  // an OwnershipComponent linking this entityPda to the userWalletPublicKey.
  // This step can be added here if YW_OWNERSHIP_PROGRAM_ID is available and needed at init.
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

  // 2. Initialize Wallet Component for the entity
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

  // 3. Initialize Price Component (for USDC) for the entity
  console.log(`Initializing USDC price component for entity ${entityPda.toBase58()}`);
  const initPriceCompResult = await InitializeComponent({
    payer: adminKeypair.publicKey,
    entity: entityPda,
    componentId: new PublicKey(PRICE_COMPONENT_PROGRAM_ID),
  });
  initPriceCompResult.transaction.feePayer = adminKeypair.publicKey;
  initPriceCompResult.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  initPriceCompResult.transaction.sign(adminKeypair);
  const initPriceSig = await connection.sendRawTransaction(initPriceCompResult.transaction.serialize());
  await connection.confirmTransaction(initPriceSig);
  signatures.push(initPriceSig);
  console.log(`Price (USDC) component initialized: ${initPriceCompResult.componentPda.toBase58()}, Signature: ${initPriceSig}`);
  const usdcPriceComponentPda = initPriceCompResult.componentPda;

  // 4. Fund the Wallet using EconomySystem
  console.log(`Funding wallet for entity ${entityPda.toBase58()}`);
  const economySystemArgs = {
    transaction_type: TRANSACTION_TYPE_INITIALIZE,
    currency_type: CURRENCY_TYPE_USDC,
    destination_currency_type: CURRENCY_TYPE_USDC,
    amount: STARTING_USDC_AMOUNT,
  };
  console.log(`Funding wallet for entity ${entityPda.toBase58()} with amount ${STARTING_USDC_AMOUNT} by ${adminKeypair.publicKey.toBase58()}`);
  const fundWalletTxDetails = await ApplySystem({
    authority: adminKeypair.publicKey, // Admin is funding and paying fees
    systemId: new PublicKey(ECONOMY_SYSTEM_PROGRAM_ID),
    world: worldPublicKey,
    entities: [
      {
        entity: entityPda,
        components: [
          { componentId: new PublicKey(WALLET_COMPONENT_PROGRAM_ID) },
          { componentId: new PublicKey(WALLET_COMPONENT_PROGRAM_ID) }, 
          { componentId: new PublicKey(PRICE_COMPONENT_PROGRAM_ID) },
          { componentId: new PublicKey(PRICE_COMPONENT_PROGRAM_ID) },
        ],
      },
    ],
    args: economySystemArgs, 
  });

  fundWalletTxDetails.transaction.feePayer = adminKeypair.publicKey;
  fundWalletTxDetails.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  fundWalletTxDetails.transaction.sign(adminKeypair);
  const fundWalletSig = await connection.sendRawTransaction(fundWalletTxDetails.transaction.serialize());
  await connection.confirmTransaction(fundWalletSig);
  signatures.push(fundWalletSig);
  console.log(`Wallet funded for entity ${entityPda.toBase58()}. Signature: ${fundWalletSig}`);

  return {
    entityPda: entityPda.toBase58(),
    walletComponentPda: walletComponentPda.toBase58(),
    usdcPriceComponentPda: usdcPriceComponentPda.toBase58(),
    initSignatures: signatures,
  };
} 