import { Connection, PublicKey } from '@solana/web3.js';

interface EndpointResult {
  connected: boolean;
  details?: {
    version?: string;
    slot?: number;
  };
  error?: string;
}

interface ValidatorResults {
  [endpoint: string]: EndpointResult;
}

/**
 * Tests connectivity to a Solana validator and returns basic details
 * 
 * @param endpoint The RPC endpoint URL
 * @returns Basic information about the validator
 */
export async function checkValidatorConnection(endpoint: string): Promise<{
  connected: boolean;
  version?: string;
  slot?: number;
  recentBlockhash?: string;
  error?: string;
}> {
  try {
    // Create connection to validator
    const connection = new Connection(endpoint, 'confirmed');
    
    // Get version
    const version = await connection.getVersion();
    
    // Get slot and blockhash
    const slot = await connection.getSlot();
    const { blockhash } = await connection.getLatestBlockhash();
    
    return {
      connected: true,
      version: version['solana-core'],
      slot,
      recentBlockhash: blockhash,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Failed to connect to validator:', error);
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Checks if a specific Bolt World is available
 * 
 * @param endpoint The RPC endpoint URL
 * @returns Information about the World account
 */
export async function checkBoltWorld(endpoint: string): Promise<{
  worldExists: boolean;
  worldAddress?: string;
  registryExists: boolean;
  registryAddress?: string;
  registryOwner?: string;
  registrySize?: number;
  error?: string;
}> {
  try {
    const connection = new Connection(endpoint, 'confirmed');
    
    // Check for Bolt World program
    const worldProgramId = new PublicKey('WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n');
    const worldInfo = await connection.getAccountInfo(worldProgramId);
    
    // Check for Bolt Registry
    const registryId = new PublicKey('EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K');
    const registryInfo = await connection.getAccountInfo(registryId);
    
    return {
      worldExists: !!worldInfo,
      worldAddress: worldProgramId.toString(),
      registryExists: !!registryInfo,
      registryAddress: registryId.toString(),
      registryOwner: registryInfo ? registryInfo.owner.toString() : undefined,
      registrySize: registryInfo ? registryInfo.data.length : undefined
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Failed to check Bolt World:', error);
    return {
      worldExists: false,
      registryExists: false,
      error: error.message
    };
  }
}

/**
 * Lists all accounts owned by a program
 * 
 * @param endpoint The RPC endpoint URL
 * @param programId The program ID
 * @returns List of account addresses owned by the program
 */
export async function listProgramAccounts(endpoint: string, programId: string): Promise<{
  success: boolean;
  accounts?: string[];
  count?: number;
  error?: string;
}> {
  try {
    const connection = new Connection(endpoint, 'confirmed');
    const program = new PublicKey(programId);
    
    // Get program accounts
    const accounts = await connection.getProgramAccounts(program);
    
    return {
      success: true,
      accounts: accounts.map(a => a.pubkey.toString()),
      count: accounts.length
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Failed to list accounts for program ${programId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tries multiple endpoint variations
 * 
 * @returns Results for each endpoint tried
 */
export async function tryMultipleEndpoints(): Promise<ValidatorResults> {
  const endpoints = [
    'http://localhost:8899',  // Common local endpoint - shown to work
    'http://127.0.0.1:8899',  // Alternative local IP - also works
    'http://0.0.0.0:8899',    // Default in Anchor.toml but often fails in browser
  ];
  
  const results: ValidatorResults = {};
  
  for (const endpoint of endpoints) {
    try {
      const connection = await checkValidatorConnection(endpoint);
      results[endpoint] = {
        connected: connection.connected,
        details: connection.connected ? 
          { version: connection.version, slot: connection.slot } : 
          undefined,
        error: connection.error
      };
    } catch (err: unknown) {
      const error = err as Error;
      results[endpoint] = {
        connected: false,
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * Checks if the Registry account exists, is owned by the World program,
 * and whether it appears to be properly initialized
 * 
 * @param endpoint The RPC endpoint URL
 * @returns Detailed registry information
 */
export async function checkBoltRegistry(endpoint: string): Promise<{
  exists: boolean;
  owner?: string;
  isInitialized?: boolean;
  size?: number;
  discriminator?: string;
  error?: string;
}> {
  try {
    const connection = new Connection(endpoint, 'confirmed');
    
    // Check for Bolt Registry
    const registryId = new PublicKey('EHLkWwAT9oebVv9ht3mtqrvHhRVMKrt54tF3MfHTey2K');
    const registryInfo = await connection.getAccountInfo(registryId);
    
    if (!registryInfo) {
      return { exists: false };
    }
    
    // Get the first 8 bytes as discriminator (if present)
    const discriminator = registryInfo.data.length >= 8 ? 
      Buffer.from(registryInfo.data.slice(0, 8)).toString('hex') : 
      'unknown';
    
    // To determine if it's properly initialized we'd need to know the specific
    // structure, but we can check the owner is the World program as a proxy
    const worldProgramId = 'WorLD15A7CrDwLcLy4fRqtaTb9fbd8o8iqiEMUDse2n';
    
    return {
      exists: true,
      owner: registryInfo.owner.toString(),
      isInitialized: registryInfo.owner.toString() === worldProgramId,
      size: registryInfo.data.length,
      discriminator
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Failed to check Bolt Registry:', error);
    return {
      exists: false,
      error: error.message
    };
  }
} 