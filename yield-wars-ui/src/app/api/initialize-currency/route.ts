import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { setupAnchorProvider, createKeypairFromBase58 } from '@/lib/utils/anchorUtils';
import { setProvider } from '@coral-xyz/anchor';
import { ApplySystem } from '@magicblock-labs/bolt-sdk';
import { SYSTEM_ECONOMY_PROGRAM_ID, COMPONENT_WALLET_PROGRAM_ID } from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required parameters
    if (!data.worldPda || !data.userEntityPda || data.currencyType === undefined || !data.userWalletPublicKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters. Need worldPda, userEntityPda, currencyType, and userWalletPublicKey.'
      }, { status: 400 });
    }

    const { worldPda, userEntityPda, currencyType, userWalletPublicKey } = data;

    // Setup connection
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
    const base58PrivateKey = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
    
    if (!base58PrivateKey) {
      throw new Error('ADMIN_PRIVATE_KEY_BS58 not configured in environment variables.');
    }

    const adminKeypair = createKeypairFromBase58(base58PrivateKey);
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Create and set the provider
    const provider = setupAnchorProvider(connection, adminKeypair);
    setProvider(provider);

    // Initialize the wallet component for this currency type
    console.log(`Initializing ${CurrencyType[currencyType]} wallet component for user entity: ${userEntityPda}`);

    // Create the initialization instruction
    const initIx = await ApplySystem({
      authority: adminKeypair.publicKey,
      systemId: SYSTEM_ECONOMY_PROGRAM_ID,
      world: new PublicKey(worldPda),
      entities: [
        {
          entity: new PublicKey(userEntityPda),
          components: [
            { componentId: COMPONENT_WALLET_PROGRAM_ID }
          ],
        }
      ],
      args: {
        transaction_type: 0, // Initialize wallet component
        currency_type: currencyType,
        amount: 0 // Initial amount is 0
      }
    });

    // Sign and send the transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    initIx.transaction.feePayer = adminKeypair.publicKey;
    initIx.transaction.recentBlockhash = blockhash;
    initIx.transaction.sign(adminKeypair);

    try {
      // Try simulation first to diagnose issues
      const simulation = await connection.simulateTransaction(initIx.transaction);
      console.log("Simulation result:", {
        err: simulation.value.err,
        logs: simulation.value.logs?.slice(0, 10) // Just show first 10 logs to avoid overly long logs
      });
      
      if (simulation.value.err) {
        return NextResponse.json({
          success: false,
          error: 'Transaction simulation failed',
          simulationError: simulation.value.err,
          logs: simulation.value.logs
        }, { status: 400 });
      }
      
      // Send the transaction if simulation succeeded
      const signature = await connection.sendRawTransaction(initIx.transaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      return NextResponse.json({
        success: true,
        signature,
        currencyType,
        currencyName: CurrencyType[currencyType],
        message: `Successfully initialized ${CurrencyType[currencyType]} wallet component`
      });
    } catch (error) {
      console.error("Error sending transaction:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        message: `Failed to initialize ${CurrencyType[currencyType]} wallet component`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Initialize currency API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 