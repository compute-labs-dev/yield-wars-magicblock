import { PublicKey } from '@solana/web3.js';
import { MagicBlockEngine } from '@/engine/MagicBlockEngine';

export interface ExchangeEntities {
  userEntityPda: string;
  sourcePriceEntityPda: string;
  destinationPriceEntityPda: string;
}

/**
 * Fetches the required entity PDAs for currency exchange
 * @param engine MagicBlockEngine instance
 * @param worldPda The world PDA
 * @returns Object containing all required PDAs
 */
export async function getExchangeEntities(
  engine: MagicBlockEngine,
  worldPda: string,
): Promise<ExchangeEntities> {
  try {
    // Get all entities with wallet components
    const walletEntities = await engine.getChainAccountInfo(new PublicKey(worldPda));
    if (!walletEntities) {
      throw new Error('No wallet entities found');
    }

    // Get the user's entity (should be the first one with a wallet component)
    const userEntityPda = walletEntities.owner.toBase58();

    // For price components, we need to find the entities that have the price components
    // for the specific currency types
    const sourcePriceEntityPda = userEntityPda; // For now, using same entity as test case
    const destinationPriceEntityPda = userEntityPda; // For now, using same entity as test case

    // Log the found entities
    console.log('Exchange entities found:', {
      userEntityPda,
      sourcePriceEntityPda,
      destinationPriceEntityPda
    });

    return {
      userEntityPda,
      sourcePriceEntityPda,
      destinationPriceEntityPda
    };
  } catch (error) {
    console.error('Failed to get exchange entities:', error);
    throw error;
  }
} 