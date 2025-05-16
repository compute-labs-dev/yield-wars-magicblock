'use server';

import { 
  Connection, 
  PublicKey,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';
import { ApplySystem } from '@magicblock-labs/bolt-sdk';
import {
  SYSTEM_ECONOMY_PROGRAM_ID,
  COMPONENT_WALLET_PROGRAM_ID,
  COMPONENT_PRICE_PROGRAM_ID
} from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';
import { setupAnchorProvider } from '@/lib/utils/anchorUtils';

export interface TransferCurrencyParams {
  worldPda: string;
  sourceEntityPda: string;
  destinationEntityPda: string;
  currencyType: CurrencyType;
  amount: number;
  userWalletPublicKey: string;
  privySigner: string;
}

export async function transferCurrency(params: TransferCurrencyParams) {
  try {
    // Create connection with confirmed commitment
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com', 'confirmed');

    // Setup admin keypair and provider
    const base58PrivateKey = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
    if (!base58PrivateKey) {
      throw new Error('Admin private key not configured in environment variables.');
    }
    
    const { provider, keypair: adminKeypair } = setupAnchorProvider(connection, base58PrivateKey);

    // Convert string public keys to PublicKey objects
    const privySigner = new PublicKey(params.privySigner);

    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create the ApplySystem instruction
    const applySystem = await ApplySystem({
      authority: privySigner,
      systemId: SYSTEM_ECONOMY_PROGRAM_ID,
      world: new PublicKey(params.worldPda),
      entities: [{
        entity: new PublicKey(params.sourceEntityPda),
        components: [
          { componentId: COMPONENT_WALLET_PROGRAM_ID },    // source_wallet
        ],
      }, {
        entity: new PublicKey(params.destinationEntityPda),
        components: [
          { componentId: COMPONENT_WALLET_PROGRAM_ID },    // destination_wallet
        ],
      }, {
        entity: new PublicKey(params.sourceEntityPda),     // Using source entity for price components
        components: [
          { componentId: COMPONENT_PRICE_PROGRAM_ID },     // source_price
          { componentId: COMPONENT_PRICE_PROGRAM_ID },     // destination_price
        ],
      }],
      args: {
        transaction_type: 0, // TRANSFER
        currency_type: params.currencyType,
        destination_currency_type: params.currencyType,
        amount: params.amount
      },
    });

    // Create the transaction message
    const message = new TransactionMessage({
      payerKey: privySigner,
      recentBlockhash: blockhash,
      instructions: [applySystem.instruction]
    }).compileToV0Message();

    // Create versioned transaction
    const versionedTransaction = new VersionedTransaction(message);

    // Return the serialized transaction message
    return {
      transaction: Buffer.from(versionedTransaction.serialize()).toString('base64'),
      message: "Transaction created successfully"
    };

  } catch (error) {
    console.error('Error in transferCurrency:', error);
    throw error;
  }
} 