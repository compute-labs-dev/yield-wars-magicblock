import { NextRequest, NextResponse } from 'next/server';
import { VersionedTransaction } from '@solana/web3.js';
import { signAndSendTransaction } from '@/hooks/server/signAndSendTransaction';

export async function POST(req: NextRequest) {
  try {
    const { transaction } = await req.json();
    if (!transaction) {
      return NextResponse.json({ error: 'Missing transaction' }, { status: 400 });
    }
    const txn = VersionedTransaction.deserialize(Buffer.from(transaction, 'base64'));
    const txHash = await signAndSendTransaction(txn);
    return NextResponse.json({ txHash });
  } catch (e: unknown) {
    console.log('error', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 });
  }
} 