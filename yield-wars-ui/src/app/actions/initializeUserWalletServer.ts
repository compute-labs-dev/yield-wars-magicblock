export async function initializeUserWalletServer(
  params: InitializeUserWalletParams
): Promise<InitializeUserWalletResult> {
  let adminKeypair: Keypair;

  try {
    if (!ADMIN_PRIVATE_KEY_BS58) {
      throw new Error('Admin private key (FE_CL_BS58_SIGNER_PRIVATE_KEY) not configured in environment variables.');
    }

    // Try to decode the BS58 private key directly
    try {
      adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_PRIVATE_KEY_BS58));
    } catch (error) {
      console.error('Failed to decode BS58 private key:', error);
      throw new Error('Invalid admin private key format. Must be BS58 encoded.');
    }

    if (!RPC_ENDPOINT) {
      throw new Error('NEXT_PUBLIC_RPC_ENDPOINT not configured.');
    }

    console.log('Initializing with RPC endpoint:', RPC_ENDPOINT);

    // Rest of the initialization code...
    const WALLET_COMPONENT_PROGRAM_ID = componentWallet.address;
  } catch (error) {
    console.error('Error initializing user wallet server:', error);
    throw error;
  }
} 