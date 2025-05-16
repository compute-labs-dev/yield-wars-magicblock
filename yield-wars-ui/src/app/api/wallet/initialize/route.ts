import { NextRequest, NextResponse } from 'next/server';
import { initializeUserWalletServer } from '@/app/actions/initializeUserWallet';

export const maxDuration = 120; // Set maximum duration to 120 seconds
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userPublicKey, worldPda } = body;

        if (!userPublicKey || !worldPda) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const result = await initializeUserWalletServer({
            userPublicKey,
            worldPda
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Wallet initialization failed:', error);
        return NextResponse.json(
            { 
                error: 'Wallet initialization failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 