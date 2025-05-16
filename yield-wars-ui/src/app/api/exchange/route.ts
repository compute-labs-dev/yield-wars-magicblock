import { NextRequest, NextResponse } from 'next/server';
import { exchangeCurrency as exchangeCurrencyAction } from '@/app/actions/exchangeCurrency';
import { CurrencyType } from '@/lib/constants/programEnums';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required parameters
    if (!data.worldPda || !data.userEntityPda || 
        data.currency_type === undefined || data.destination_currency_type === undefined || 
        data.amount === undefined || !data.userWalletPublicKey ||
        !data.sourcePricePda || !data.destinationPricePda ||
        !data.sourceCurrencyEntityPda || !data.destinationCurrencyEntityPda) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Set the transaction_type parameter if not provided
    const params = {
      ...data,
      transaction_type: data.transaction_type ?? 0, // Exchange transaction type
      privySigner: data.userWalletPublicKey // Use the wallet address as the signer
    };

    // Execute the exchange using the server action
    const signature = await exchangeCurrencyAction(params);

    return NextResponse.json({ 
      success: true, 
      signature,
      message: 'Exchange completed successfully'
    });
  } catch (error) {
    console.error('API exchange error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 