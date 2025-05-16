import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { setupAnchorProvider, createKeypairFromBase58 } from '@/lib/utils/anchorUtils';
import { setProvider } from '@coral-xyz/anchor';
import { ApplySystem } from '@magicblock-labs/bolt-sdk';
import { SYSTEM_ECONOMY_PROGRAM_ID, COMPONENT_WALLET_PROGRAM_ID } from '@/lib/constants/programIds';
import { CurrencyType } from '@/lib/constants/programEnums';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required parameters
    if (!data.worldPda || !data.userEntityPda || !data.userWalletPublicKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters. Need worldPda, userEntityPda, and userWalletPublicKey.'
      }, { status: 400 });
    }

    const { worldPda, userEntityPda, userWalletPublicKey } = data;

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

    // Define currency types to initialize
    const currencyTypes = [
      CurrencyType.USDC,
      CurrencyType.BTC,
      CurrencyType.ETH,
      CurrencyType.SOL,
      CurrencyType.AIFI
    ];

    const results = [];

    // Initialize each currency type
    for (const currencyType of currencyTypes) {
      try {
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

        // Try simulation first
        const simulation = await connection.simulateTransaction(initIx.transaction);
        
        // If simulation fails with "already initialized", we'll consider it a success since the account exists
        const alreadyInitialized = simulation.value.logs?.some(log => 
          log.includes("Error Number: 3008") || // AccountAlreadyInitialized
          log.includes("already in use") ||
          log.includes("already initialized")
        );
        
        if (simulation.value.err && !alreadyInitialized) {
          results.push({
            currencyType,
            currencyName: CurrencyType[currencyType],
            success: false,
            error: 'Simulation failed',
            logs: simulation.value.logs
          });
          continue;
        }
        
        if (alreadyInitialized) {
          results.push({
            currencyType,
            currencyName: CurrencyType[currencyType],
            success: true,
            status: 'already_initialized'
          });
          continue;
        }

        // Send the transaction if simulation succeeded
        const signature = await connection.sendRawTransaction(initIx.transaction.serialize());
        await connection.confirmTransaction(signature, 'confirmed');
        
        results.push({
          currencyType,
          currencyName: CurrencyType[currencyType],
          success: true,
          signature,
          status: 'newly_initialized'
        });
      } catch (error) {
        console.error(`Error initializing ${CurrencyType[currencyType]}:`, error);
        
        // Check if the error indicates the account is already initialized
        const alreadyInitialized = error.message?.includes("already initialized") || 
                                  error.message?.includes("Error Number: 3008") ||
                                  error.message?.includes("already in use");
        
        if (alreadyInitialized) {
          results.push({
            currencyType,
            currencyName: CurrencyType[currencyType],
            success: true,
            status: 'already_initialized',
            error: error.message
          });
        } else {
          results.push({
            currencyType,
            currencyName: CurrencyType[currencyType],
            success: false,
            error: error.message
          });
        }
      }
    }

    // Count successful initializations
    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Initialized ${successCount}/${currencyTypes.length} currency wallet components`,
      results
    });
  } catch (error) {
    console.error('Initialize all currencies API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 