import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { setupAnchorProvider, createKeypairFromBase58 } from '@/lib/utils/anchorUtils';
import { setProvider } from '@coral-xyz/anchor';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      worldPda, 
      userEntityPda, 
      sourcePricePda, 
      destinationPricePda, 
      sourceCurrencyEntityPda, 
      destinationCurrencyEntityPda 
    } = data;

    if (!worldPda || !userEntityPda) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

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

    // Check account existence and data
    const accounts = {};
    const checks = [
      { name: 'worldPda', pubkey: worldPda },
      { name: 'userEntityPda', pubkey: userEntityPda },
      { name: 'sourcePricePda', pubkey: sourcePricePda },
      { name: 'destinationPricePda', pubkey: destinationPricePda },
      { name: 'sourceCurrencyEntityPda', pubkey: sourceCurrencyEntityPda },
      { name: 'destinationCurrencyEntityPda', pubkey: destinationCurrencyEntityPda }
    ];

    for (const check of checks) {
      if (check.pubkey) {
        try {
          const accountInfo = await connection.getAccountInfo(new PublicKey(check.pubkey));
          accounts[check.name] = {
            exists: !!accountInfo,
            size: accountInfo?.data.length || 0,
            owner: accountInfo?.owner.toBase58() || null,
            executable: accountInfo?.executable || false,
            dataPrefix: accountInfo ? Buffer.from(accountInfo.data.slice(0, 16)).toString('hex') : null
          };
        } catch (error) {
          accounts[check.name] = { exists: false, error: error.message };
        }
      } else {
        accounts[check.name] = { exists: false, reason: 'Not provided' };
      }
    }

    // Try to get the wallet component data specifically
    let walletComponentData = null;
    try {
      // Look for wallet component on the user entity
      const walletComponentPda = data.walletComponentPda;
      if (walletComponentPda) {
        const walletAccountInfo = await connection.getAccountInfo(new PublicKey(walletComponentPda));
        if (walletAccountInfo) {
          walletComponentData = {
            exists: true,
            size: walletAccountInfo.data.length,
            owner: walletAccountInfo.owner.toBase58(),
            dataPrefix: Buffer.from(walletAccountInfo.data.slice(0, 16)).toString('hex')
          };
        } else {
          walletComponentData = { exists: false, reason: 'Account does not exist' };
        }
      } else {
        walletComponentData = { exists: false, reason: 'Wallet component PDA not provided' };
      }
    } catch (error) {
      walletComponentData = { exists: false, error: error.message };
    }

    return NextResponse.json({
      success: true,
      accounts,
      walletComponentData,
      message: 'Debug information retrieved successfully'
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 