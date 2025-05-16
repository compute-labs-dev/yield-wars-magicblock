import { 
  Connection, 
  Keypair, 
  PublicKey,
} from '@solana/web3.js';
import { ApplySystem } from '@magicblock-labs/bolt-sdk';
import {
  SYSTEM_ECONOMY_PROGRAM_ID,
  COMPONENT_WALLET_PROGRAM_ID,
  COMPONENT_PRICE_PROGRAM_ID,
} from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';
import { createKeypairFromBase58 } from '@/lib/utils/anchorUtils';
import { AnchorProvider, setProvider } from '@coral-xyz/anchor';
import { NextRequest, NextResponse } from 'next/server';

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

// Create a provider
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

// Helper function for handling rate limits
async function getAccountWithRetry(
  connection: Connection,
  pubkey: PublicKey,
  maxRetries = 3,
  baseDelay = 1000
): Promise<any> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const account = await connection.getAccountInfo(pubkey);
      return account;
    } catch (error: any) {
      if (error?.message?.includes('429') || error?.toString().includes('Too Many Requests')) {
        const delay = baseDelay * Math.pow(2, retries);
        console.log(`Rate limited, waiting ${delay}ms before retry ${retries + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        if (retries === maxRetries) {
          throw new Error(`Failed to get account info after ${maxRetries} retries due to rate limits`);
        }
      } else {
        throw error;
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const params: ExchangeCurrencyParams = await request.json();
    
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

    console.log('Starting exchange in environment:', process.env.VERCEL_ENV || 'local');
    
    const base58PrivateKey = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
    if (!base58PrivateKey) {
      return NextResponse.json(
        { error: 'Server signer key not configured.' },
        { status: 500 }
      );
    }

    const adminKeypair = createKeypairFromBase58(base58PrivateKey);

    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Create and set the provider
    const provider = createAnchorProvider(connection, adminKeypair);
    setProvider(provider);

    // Verify provider setup
    const currentProvider = provider;
    if (!currentProvider) {
      return NextResponse.json(
        { error: 'Provider not properly initialized' },
        { status: 500 }
      );
    }
    
    console.log('Provider successfully initialized with wallet:', currentProvider.wallet.publicKey.toBase58());
    console.log('RPC endpoint:', RPC_ENDPOINT);
    console.log('Admin public key:', adminKeypair.publicKey.toBase58());

    // Create PublicKey instances 
    const worldPda = new PublicKey(params.worldPda);
    const entityPda = new PublicKey(params.userEntityPda);
    const sourcePricePda = new PublicKey(params.sourcePricePda);
    const destinationPricePda = new PublicKey(params.destinationPricePda);
    const sourceCurrencyEntityPda = new PublicKey(params.sourceCurrencyEntityPda);
    const destinationCurrencyEntityPda = new PublicKey(params.destinationCurrencyEntityPda);
    const privySigner = new PublicKey(params.privySigner);
    const userWalletPublicKey = new PublicKey(params.userWalletPublicKey);

    // Verify accounts exist with retry logic
    try {
      const [entityAccount, sourcePriceAccount, destPriceAccount] = await Promise.all([
        getAccountWithRetry(connection, entityPda),
        getAccountWithRetry(connection, sourcePricePda),
        getAccountWithRetry(connection, destinationPricePda)
      ]);

      console.log("Account Info:", {
        entityExists: !!entityAccount,
        sourcePriceExists: !!sourcePriceAccount,
        destinationPriceExists: !!destPriceAccount
      });

      if (!entityAccount || !sourcePriceAccount || !destPriceAccount) {
        return NextResponse.json(
          { error: "One or more required accounts not found" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Failed to verify accounts:", error);
      return NextResponse.json(
        { error: "Failed to verify accounts" },
        { status: 500 }
      );
    }

    // Create the exchange instruction
    const exchangeIx = await ApplySystem({
      authority: adminKeypair.publicKey,
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

    // Create and send the transaction directly
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    console.log("Using blockhash:", blockhash);

    exchangeIx.transaction.feePayer = adminKeypair.publicKey;
    exchangeIx.transaction.recentBlockhash = blockhash;
    exchangeIx.transaction.sign(adminKeypair);

    const signature = await connection.sendRawTransaction(exchangeIx.transaction.serialize());
    console.log("Transaction sent with signature:", signature);

    // Return the transaction signature
    return NextResponse.json({ success: true, signature });

  } catch (error: any) {
    console.error("Exchange error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Exchange failed", 
        details: error.toString() 
      },
      { status: 500 }
    );
  }
} 