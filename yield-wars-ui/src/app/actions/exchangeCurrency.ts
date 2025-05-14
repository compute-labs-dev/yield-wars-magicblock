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
  COMPONENT_PRICE_PROGRAM_ID,
} from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';

export interface ExchangeCurrencyParams {
  worldPda: string;
  userEntityPda: string;
  transaction_type: number;
  currency_type: CurrencyType;
  destination_currency_type: CurrencyType;
  amount: number;
  userWalletPublicKey: string;
  privySigner: string;
  sourcePricePda: string;
  destinationPricePda: string;
  sourceCurrencyEntityPda: string;
  destinationCurrencyEntityPda: string;
}

export async function exchangeCurrency(params: ExchangeCurrencyParams) {
  try {
    console.log("Exchange Parameters:", {
      worldPda: params.worldPda,
      entityPda: params.userEntityPda,
      sourcePricePda: params.sourcePricePda,
      destinationPricePda: params.destinationPricePda,
      sourceCurrencyEntityPda: params.sourceCurrencyEntityPda,
      destinationCurrencyEntityPda: params.destinationCurrencyEntityPda,
      currency_type: params.currency_type,
      destination_currency_type: params.destination_currency_type,
      amount: params.amount
    });

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');

    // Create PublicKey instances
    const worldPda = new PublicKey(params.worldPda);
    const entityPda = new PublicKey(params.userEntityPda);
    const sourcePricePda = new PublicKey(params.sourcePricePda);
    const destinationPricePda = new PublicKey(params.destinationPricePda);
    const sourceCurrencyEntityPda = new PublicKey(params.sourceCurrencyEntityPda);
    const destinationCurrencyEntityPda = new PublicKey(params.destinationCurrencyEntityPda);
    const privySigner = new PublicKey(params.privySigner);
    const userWalletPublicKey = new PublicKey(params.userWalletPublicKey);

    // Verify accounts exist
    const accounts = await Promise.all([
      connection.getAccountInfo(entityPda),
      connection.getAccountInfo(sourcePricePda),
      connection.getAccountInfo(destinationPricePda)
    ]);

    console.log("Account Info:", {
      entityExists: !!accounts[0],
      sourcePriceExists: !!accounts[1],
      destinationPriceExists: !!accounts[2]
    });

    // Create the exchange instruction - EXACTLY matching the test structure
    const exchangeIx = await ApplySystem({
      authority: privySigner,
      systemId: SYSTEM_ECONOMY_PROGRAM_ID,
      world: worldPda,
      entities: [
        {
          entity: entityPda,  // User's entity
          components: [
            { componentId: COMPONENT_WALLET_PROGRAM_ID },   // source_wallet
            { componentId: COMPONENT_WALLET_PROGRAM_ID },   // destination_wallet
          ],
        },
        {
          entity: sourceCurrencyEntityPda,  // Source currency entity
          components: [
            { componentId: COMPONENT_PRICE_PROGRAM_ID },    // source price component
          ],
        },
        {
          entity: destinationCurrencyEntityPda,  // Destination currency entity
          components: [
            { componentId: COMPONENT_PRICE_PROGRAM_ID },    // destination price component
          ],
        }
      ],
      args: {
        transaction_type: params.transaction_type,
        currency_type: params.currency_type,
        destination_currency_type: params.destination_currency_type,
        amount: params.amount
      }
    });

    // Create and return the transaction
    const { blockhash } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: userWalletPublicKey,
      recentBlockhash: blockhash,
      instructions: [exchangeIx.instruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    return Buffer.from(transaction.serialize()).toString('base64');

  } catch (error) {
    console.error("Exchange error:", error);
    throw error;
  }
} 