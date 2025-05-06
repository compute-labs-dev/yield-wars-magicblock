// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextRequest, NextResponse } from 'next/server'
import { Cluster, clusterApiUrl, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js'
import bs58 from 'bs58';

export type PostRequest = {
  account: string,
};

export type PostResponse = {
  transaction: string,
  message: string,
  network: Cluster,
};

export type PostError = {
  error: string
};

// Response for GET request
export async function GET() {
  return NextResponse.json({
    label: 'Yield Wars Gambling',
    icon: '/logo.svg',
  });
}

// Main body of the POST request, this returns the transaction
async function postImpl(
  account: PublicKey,
  reference: PublicKey
): Promise<PostResponse> {
  // Can also use a custom RPC here
  const endpoint = clusterApiUrl('devnet');
  const connection = new Connection(endpoint);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const pk = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
        
    if (!pk) {
      console.error('❌ No private key provided in environment variables')
    }

    
    const _signer = Keypair.fromSecretKey(bs58.decode(pk!));
  // Create any transaction
  const transaction = new Transaction({
    feePayer: _signer.publicKey,
    blockhash,
    lastValidBlockHeight,
  });

  const amount = await generateRandomAmount();
  const amountInLamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);
  const amountAsBigInt = BigInt(amountInLamports);
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: _signer.publicKey,
    toPubkey: account,
    lamports: amountAsBigInt,
  });

  // Add reference as a key to the instruction
  // This allows us to listen for this transaction
  transferInstruction.keys.push({
    pubkey: reference,
    isSigner: false,
    isWritable: false,
  });

  transaction.add(transferInstruction);
  transaction.sign(_signer);
  // Serialize the transaction and convert to base64 to return it
  const serializedTransaction = transaction.serialize({
    requireAllSignatures: false // account is a missing signature
  });
  const base64 = serializedTransaction.toString('base64');

  // Return the serialized transaction
  return {
    transaction: base64,
    message: 'Thank you for your purchase!',
    network: 'devnet',
  };
}

// We pass eg. network in query params, this function extracts the value of a query param
function getFromQuery(
  request: NextRequest,
  field: string
): string | undefined {
  const params = request.nextUrl.searchParams;
  return params.get(field) ?? undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account } = body as PostRequest;
    
    if (!account) {
      return NextResponse.json({ error: 'No account provided' }, { status: 400 });
    }

    const network = getFromQuery(request, 'network') as Cluster;
    if (!network) {
      return NextResponse.json({ error: 'No network provided' }, { status: 400 });
    }

    const reference = getFromQuery(request, 'reference');
    if (!reference) {
      return NextResponse.json({ error: 'No reference provided' }, { status: 400 });
    }

    const postResponse = await postImpl(
      new PublicKey(account),
      new PublicKey(reference),
    );
    return NextResponse.json(postResponse);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error creating transaction' }, { status: 500 });
  }
}


async function generateRandomAmount() {
  // create a random number between .001 and 2,
  // it should be a weighted distribution, so that 90% of the time it's between .001 and .1,
  // and 10% of the time it's between .1 and 2  
  const random = Math.random();
  if (random < 0.9) {
    return Math.random() * 0.1;
  } else {
    return Math.random() * 1.9;
  }
}