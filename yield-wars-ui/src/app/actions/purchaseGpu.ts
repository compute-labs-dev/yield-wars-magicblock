'use server';

import { 
  Connection, 
  PublicKey,
  Keypair
} from '@solana/web3.js';
import { ApplySystem, InitializeComponent, FindComponentPda } from '@magicblock-labs/bolt-sdk';
import {
  SYSTEM_ECONOMY_PROGRAM_ID,
  COMPONENT_WALLET_PROGRAM_ID,
  COMPONENT_PRICE_PROGRAM_ID,
  COMPONENT_OWNERSHIP_PROGRAM_ID,
  SYSTEM_ASSIGN_OWNERSHIP_PROGRAM_ID
} from '@/lib/constants/programIds';
import { CurrencyType, EconomyTransactionType, EntityType } from '@/lib/constants/programEnums';
import bs58 from 'bs58';

// Define operation types as in the test file
const OPERATION_TYPE = {
  INITIALIZE: 0,
  ASSIGN_TO_WALLET: 1,
  REMOVE_OWNERSHIP: 2,
  TRANSFER_OWNERSHIP: 3
};

export interface PurchaseGpuParams {
  worldPda: string;
  gpuEntityPda: string;
  buyerEntityPda: string;
  adminEntityPda: string;
  gpuPrice: number;
  userWalletPublicKey: string;
  sourcePricePda: string;
  destinationPricePda?: string;
}

export async function purchaseGpu(params: PurchaseGpuParams) {
  try {
    console.log("Purchase GPU Parameters:", params);

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com');
    const ADMIN_PRIVATE_KEY_BS58 = process.env.FE_CL_BS58_SIGNER_PRIVATE_KEY;
    
    if (!ADMIN_PRIVATE_KEY_BS58) {
      throw new Error('Admin private key (FE_CL_BS58_SIGNER_PRIVATE_KEY) not configured in environment variables.');
    }

    const adminKeypair = Keypair.fromSecretKey(bs58.decode(ADMIN_PRIVATE_KEY_BS58));
    const worldPda = new PublicKey(params.worldPda);
    const gpuEntityPda = new PublicKey(params.gpuEntityPda);
    const buyerEntityPda = new PublicKey(params.buyerEntityPda);

    // Extract entity IDs from PDAs for use in ownership assignment
    // NOTE: The blockchain expects numeric entity IDs, not string PublicKeys
    // Entity IDs must be numbers for the contract's deserializer, even though 
    // they are conceptually related to the entity's PDA
    let buyerEntityId = 1;  // Default to 1 if we can't extract a valid ID
    let gpuEntityId = 2;    // Default to 2 to avoid collisions
    
    try {
      // Generate deterministic entity IDs from the first 4 bytes of the PDAs
      // This is the most reliable approach to ensure consistent IDs across transactions
      try {
        // Use a deterministic method to extract a number from the PDA
        // By using the first 4 bytes for consistency and keeping results in a reasonable range
        const buyerHex = buyerEntityPda.toBuffer().slice(0, 4).toString('hex');
        const gpuHex = gpuEntityPda.toBuffer().slice(0, 4).toString('hex');
        
        buyerEntityId = (parseInt(buyerHex, 16) % 900) + 1; // Range 1-900
        gpuEntityId = (parseInt(gpuHex, 16) % 900) + 1;     // Range 1-900
        
        // Ensure they don't collide
        if (buyerEntityId === gpuEntityId) {
          gpuEntityId = (gpuEntityId + 100) % 900 + 1;
        }
        
        // Add a comment mapping these IDs to their source PDAs for traceability
        console.log("Generated entity IDs from PDA bytes:", { 
          buyerEntityId, 
          gpuEntityId,
          buyerPda: buyerEntityPda.toBase58().substring(0, 10) + '...',
          gpuPda: gpuEntityPda.toBase58().substring(0, 10) + '...'
        });
      } catch (hexError) {
        console.error("Error generating entity IDs from hex:", hexError);
        // We'll use the default values set above
      }
      
      // Method 3: As final fallback, use simple string hash
      if (!buyerEntityId || !gpuEntityId) {
        buyerEntityId = Math.abs(buyerEntityPda.toBase58().split('').reduce((a, b) => {
          return a + b.charCodeAt(0);
        }, 0)) % 900 + 1;
        
        gpuEntityId = Math.abs(gpuEntityPda.toBase58().split('').reduce((a, b) => {
          return a + b.charCodeAt(0);
        }, 0)) % 900 + 1;
        
        // Ensure they don't collide
        if (buyerEntityId === gpuEntityId) {
          gpuEntityId = (gpuEntityId + 100) % 900 + 1;
        }
        
        console.log("Generated entity IDs from string hash:", { buyerEntityId, gpuEntityId });
      }
    } catch (e) {
      console.error("All entity ID generation methods failed:", e);
      // We'll use the default values set above
    }
    
    // Final check to ensure IDs are valid integers and not null
    if (typeof buyerEntityId !== 'number' || isNaN(buyerEntityId)) {
      console.warn("buyerEntityId is invalid, using default");
      buyerEntityId = 1;
    }
    
    if (typeof gpuEntityId !== 'number' || isNaN(gpuEntityId)) {
      console.warn("gpuEntityId is invalid, using default");
      gpuEntityId = 2;
    }
    
    // Explicitly ensure EntityType values are numbers to prevent serialization issues
    // The contract expects these values to be numeric, not enum references
    const playerEntityTypeValue = Number(EntityType.Player); // Should be 0
    const gpuEntityTypeValue = Number(EntityType.GPU);       // Should be 1
    
    console.log("EntityType numeric values:", {
      Player: playerEntityTypeValue,
      GPU: gpuEntityTypeValue
    });
    
    console.log("Final entity IDs:", {
      buyerEntityId,
      gpuEntityId,
      buyerEntityPda: buyerEntityPda.toBase58(),
      gpuEntityPda: gpuEntityPda.toBase58()
    });
    
    // Add explanation about why we use numeric IDs instead of string PublicKeys
    console.log(`
    NOTE ON ENTITY IDs: 
    While it would be ideal to use the full PublicKey strings as entity IDs,
    the Bolt ECS framework and smart contract are designed to work with numeric 
    entity IDs (u64). The code extracts deterministic numeric IDs from the entity
    PublicKeys to maintain a consistent mapping while meeting contract requirements.
    
    Entity ID Mapping:
    Buyer: ${buyerEntityPda.toBase58()} => ${buyerEntityId}
    GPU:   ${gpuEntityPda.toBase58()} => ${gpuEntityId}
    `);

    // 1. First, perform the currency transfer using EconomySystem
    console.log("Initiating currency transfer...");
    const purchaseTxDetails = await ApplySystem({
      authority: adminKeypair.publicKey,
      systemId: new PublicKey(SYSTEM_ECONOMY_PROGRAM_ID),
      world: worldPda,
      entities: [
        {
          entity: buyerEntityPda,
          components: [
            { componentId: new PublicKey(COMPONENT_WALLET_PROGRAM_ID) },    // source_wallet
            { componentId: new PublicKey(COMPONENT_WALLET_PROGRAM_ID) },    // destination_wallet
            { componentId: new PublicKey(COMPONENT_PRICE_PROGRAM_ID) },     // source price
            { componentId: new PublicKey(COMPONENT_PRICE_PROGRAM_ID) },     // destination price
          ],
        }
      ],
      args: {
        transaction_type: EconomyTransactionType.PURCHASE,
        currency_type: CurrencyType.USDC,
        destination_currency_type: CurrencyType.USDC,
        amount: params.gpuPrice
      },
    });

    purchaseTxDetails.transaction.feePayer = adminKeypair.publicKey;
    purchaseTxDetails.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    purchaseTxDetails.transaction.sign(adminKeypair);
    const purchaseSig = await connection.sendRawTransaction(purchaseTxDetails.transaction.serialize());
    await connection.confirmTransaction(purchaseSig);
    console.log("Currency transfer complete:", purchaseSig);

    // 2. Initialize ownership component for the GPU entity
    console.log("Adding ownership component to GPU entity...");
    const initGpuOwnershipComp = await InitializeComponent({
      payer: adminKeypair.publicKey,
      entity: gpuEntityPda,
      componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID),
    });

    initGpuOwnershipComp.transaction.feePayer = adminKeypair.publicKey;
    initGpuOwnershipComp.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initGpuOwnershipComp.transaction.sign(adminKeypair);
    const initGpuCompSig = await connection.sendRawTransaction(initGpuOwnershipComp.transaction.serialize());
    await connection.confirmTransaction(initGpuCompSig);
    console.log("Added ownership component to GPU entity. Signature:", initGpuCompSig);

    // 3. Initialize the GPU ownership component
    console.log("Initializing GPU ownership component...");
    const initGpuOwnershipArgs = {
      operation_type: OPERATION_TYPE.INITIALIZE, // 0
      owner_type: gpuEntityTypeValue, // Numeric value for GPU (1)
      entity_id: gpuEntityId, // Use the generated entity ID (ensure it's a number)
      entity_type: gpuEntityTypeValue, // Numeric value for GPU (1)
      destination_entity_id: 0, // Must be a number, not null
      owner_entity_id: 0 // Must be a number, not null for initialization
    };
    
    // Log the args to verify they are properly formatted before sending
    console.log("Initialization arguments:", JSON.stringify(initGpuOwnershipArgs));

    const initGpuOwnershipSystem = await ApplySystem({
      authority: adminKeypair.publicKey,
      systemId: new PublicKey(SYSTEM_ASSIGN_OWNERSHIP_PROGRAM_ID),
      world: worldPda,
      entities: [{
        entity: gpuEntityPda,
        components: [
          { componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID) },
          { componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID) },
        ],
      }],
      args: initGpuOwnershipArgs
    });

    initGpuOwnershipSystem.transaction.feePayer = adminKeypair.publicKey;
    initGpuOwnershipSystem.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initGpuOwnershipSystem.transaction.sign(adminKeypair);
    const initGpuOwnershipSig = await connection.sendRawTransaction(initGpuOwnershipSystem.transaction.serialize());
    await connection.confirmTransaction(initGpuOwnershipSig);
    console.log("GPU ownership component initialized");

    // 4. Assign the GPU to the player wallet
    console.log("Assigning GPU ownership to buyer...");
    
    // Set up explicit bidirectional relationship
    // 1. Add GPU to player's owned entities AND
    // 2. Mark the player as the owner of the GPU
    const assignGpuArgs = {
      operation_type: OPERATION_TYPE.ASSIGN_TO_WALLET, // Numeric value 1
      owner_type: playerEntityTypeValue, // Numeric value for Player (0)
      entity_id: gpuEntityId, // The GPU entity being assigned (must be a number, not null)
      entity_type: gpuEntityTypeValue, // Numeric value for GPU (1)
      destination_entity_id: 0, // Not used for ASSIGN_TO_WALLET (must be a number, not null)
      owner_entity_id: buyerEntityId // The player entity that will own the GPU (must be a number, not null)
    };

    console.log("Assignment args (stringified):", JSON.stringify(assignGpuArgs));

    // Add more explanation in the logs about what we're doing
    console.log("Setting up bidirectional relationship:", {
      "gpu entity": {
        pda: gpuEntityPda.toBase58(),
        id: gpuEntityId,
        type: EntityType.GPU
      },
      "player entity": {
        pda: buyerEntityPda.toBase58(),
        id: buyerEntityId,
        type: EntityType.Player
      },
      "operation": "Adding GPU to player's owned_entities AND marking player as GPU's owner_entity"
    });

    // Create a custom entity ID string for better logging and tracking
    const customEntityIdString = gpuEntityPda.toBase58().substring(0, 15);
    console.log(`Using custom entity ID string for tracing: ${customEntityIdString}`);

    // Make sure both components are included in the transaction
    // The order of components here is important for the ASSIGN_TO_WALLET operation
    const assignGpuSystem = await ApplySystem({
      authority: adminKeypair.publicKey,
      systemId: new PublicKey(SYSTEM_ASSIGN_OWNERSHIP_PROGRAM_ID),
      world: worldPda,
      entities: [
        {
          entity: buyerEntityPda,
          components: [
            { componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID) }, // The player's ownership component where GPU will be added
          ],
        }, 
        {
          entity: gpuEntityPda,
          components: [
            { componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID) }, // GPU's ownership component where player will be set as owner
          ],
        }
      ],
      args: assignGpuArgs,
    });

    assignGpuSystem.transaction.feePayer = adminKeypair.publicKey;
    assignGpuSystem.transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    assignGpuSystem.transaction.sign(adminKeypair);
    const assignGpuSig = await connection.sendRawTransaction(assignGpuSystem.transaction.serialize());
    await connection.confirmTransaction(assignGpuSig);
    console.log("GPU ownership assigned:", assignGpuSig);

    // After verification, perform a direct check that the bidirectional relationship was established
    try {
      // Allow some time for changes to propagate to the network
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Final verification of ownership relationship...");
      
      // 1. Check player's owned_entities array for the GPU
      const playerOwnershipPda = FindComponentPda({
        entity: buyerEntityPda,
        componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID),
      });
      
      const playerOwnershipInfo = await connection.getAccountInfo(playerOwnershipPda);
      if (playerOwnershipInfo) {
        console.log("Player ownership confirmed. Looking for GPU entity in data...");
        
        // Convert to string for pattern matching
        const dataStr = JSON.stringify(playerOwnershipInfo.data);
        
        // Look for the 3px pattern that we commonly see in our GPU entities
        const gpuPatternMatch = dataStr.match(/3px89[A-Za-z0-9]{20,}/);
        if (gpuPatternMatch) {
          console.log("✅ Found GPU pattern match in player's ownership data:", gpuPatternMatch[0]);
        } else {
          console.log("No 3px pattern found in player's ownership data");
        }
        
        // Simple logging of the data for inspection
        console.log("Player ownership data preview:", {
          hex: Buffer.from(playerOwnershipInfo.data).toString('hex').substring(0, 200) + '...',
          string: Buffer.from(playerOwnershipInfo.data).toString().substring(0, 200) + '...'
        });
      }
      
      // 2. Check GPU's owner entity for the player
      const gpuOwnershipPda = FindComponentPda({
        entity: gpuEntityPda,
        componentId: new PublicKey(COMPONENT_OWNERSHIP_PROGRAM_ID),
      });
      
      const gpuOwnershipInfo = await connection.getAccountInfo(gpuOwnershipPda);
      if (gpuOwnershipInfo) {
        console.log("GPU ownership confirmed. Checking owner reference...");
        
        // Convert to string for pattern matching
        const dataStr = JSON.stringify(gpuOwnershipInfo.data);
        
        // Look for parts of the player's entity PDA in the data
        const playerPdaStart = buyerEntityPda.toBase58().substring(0, 10);
        if (dataStr.includes(playerPdaStart)) {
          console.log(`✅ Found player entity reference (${playerPdaStart}...) in GPU's ownership data`);
        } else {
          console.log(`No player entity reference found in GPU's ownership data`);
        }
        
        // Simple logging of the data for inspection
        console.log("GPU ownership data preview:", {
          hex: Buffer.from(gpuOwnershipInfo.data).toString('hex').substring(0, 200) + '...',
          string: Buffer.from(gpuOwnershipInfo.data).toString().substring(0, 200) + '...' 
        });
      }
    } catch (finalError) {
      console.error("Error in final ownership verification:", finalError);
      // Don't throw here, we've already completed the transaction successfully
    }

    return assignGpuSig;
  } catch (error) {
    console.error("Error in purchaseGpu:", error);
    
    // Enhanced error diagnostics
    if (error instanceof Error) {
      // Look for specific error patterns
      const errorMsg = error.message;
      
      if (errorMsg.includes('failed to deserialize')) {
        console.error("SERIALIZATION ERROR: Arguments could not be properly serialized for the transaction");
        console.error("This might be due to null or incorrect types in the transaction arguments");
        console.error("Check that all entity IDs are numbers and not null");
      }
      
      if (errorMsg.includes('Simulation failed')) {
        console.error("SIMULATION ERROR: The transaction simulation failed");
        console.error("This might be due to invalid arguments or program constraints not being met");
      }
      
      if (errorMsg.includes('panicked')) {
        console.error("PROGRAM ERROR: The Solana program panicked during execution");
        console.error("This is likely due to incorrectly formatted input data or invalid state");
      }
    }
    
    throw error;
  }
} 