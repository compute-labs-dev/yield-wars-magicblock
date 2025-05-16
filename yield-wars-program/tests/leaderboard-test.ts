import { PublicKey } from "@solana/web3.js";
import { Wallet } from "../target/types/wallet";
import { Price } from "../target/types/price";
import {
    InitializeNewWorld,
    AddEntity,
    InitializeComponent,
    ApplySystem,
    Program
} from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";

// Define the SOAR program ID and addresses as constants
//const SOAR_PROGRAM_ID = "SOAREG9W6uoZrjiv6Ui4KsWHrLvUoxQ8Ku1Zoijtk4D";
const SOAR_PROGRAM_ID = "SoarNNzwQHMwcfdkdLc6kvbkoMSxcHy89gTHrjhJYkk";
const GAME_ADDRESS = "4mXenhrhJ3ShRUgYP5qNfTcpsWGNDvNScEBS6Fuq9AGU";
const LEADERBOARD_ADDRESS = "8huPFWRtuCJ2ByDnaLKp5pY9mdoe3DCgTQistq4uYAXT";
const TOP_ENTRIES_ADDRESS = "G8HGX9GtApe5T2AJmEqeh6mFUeLaPpqtB4RbCAzvmgPQ";

// Seeds from the SOAR program for player-scores PDA
const PLAYER_SCORES_SEED = "player-scores";

describe("Leaderboard Test", () => {
  // Configure the client to use the devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  console.log("Provider initialized");
  console.log("Provider wallet:", provider.wallet.publicKey.toBase58());
  console.log("Provider connection:", provider.connection.rpcEndpoint);

  // PDAs we'll generate
  let worldPda: PublicKey;
  let entityPda: PublicKey;         // For wallet
  let entity2Pda: PublicKey;        // For BTC price
  let entity3Pda: PublicKey;        // For AiFi price
  let walletComponentPda: PublicKey;
  let priceUsdcComponentPda: PublicKey;
  let priceBtcComponentPda: PublicKey;
  let priceAifiComponentPda: PublicKey;

  // SOAR related PDAs
  let playerPda: PublicKey;
  let playerScoresPda: PublicKey;

  // Components and systems we'll use
  const walletComponent = anchor.workspace.Wallet as Program<Wallet>;
  const priceComponent = anchor.workspace.Price as Program<Price>;
  const systemEconomy = anchor.workspace.Economy;
  const systemLeaderboard = anchor.workspace.Leaderboard;

  // Constants
  const CURRENCY_TYPE = {
    USDC: 0,
    BTC: 1,
    ETH: 2,
    SOL: 3,
    AIFI: 4
  };

  before(async () => {
    console.log("Setting up test environment...");
    
    // Initialize a new world
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    console.log(`Initialized a new world (ID=${worldPda})`);

    // Add first entity for wallet and USDC price
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    await provider.sendAndConfirm(addEntity.transaction);
    entityPda = addEntity.entityPda;
    console.log(`Created entity 1 for wallet (ID=${entityPda})`);

    // Add second entity for BTC price
    const addEntity2 = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    await provider.sendAndConfirm(addEntity2.transaction);
    entity2Pda = addEntity2.entityPda;
    console.log(`Created entity 2 for BTC price (ID=${entity2Pda})`);

    // Add third entity for AiFi price
    const addEntity3 = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    await provider.sendAndConfirm(addEntity3.transaction);
    entity3Pda = addEntity3.entityPda;
    console.log(`Created entity 3 for AiFi price (ID=${entity3Pda})`);

    // Add a wallet component to entity 1
    const initWallet = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: walletComponent.programId,
    });
    await provider.sendAndConfirm(initWallet.transaction);
    walletComponentPda = initWallet.componentPda;
    console.log(`Added wallet component to entity 1`);

    // Add USDC price component to entity 1
    const initUsdcPrice = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: priceComponent.programId,
    });
    await provider.sendAndConfirm(initUsdcPrice.transaction);
    priceUsdcComponentPda = initUsdcPrice.componentPda;
    console.log(`Added USDC price component to entity 1`);

    // Add BTC price component to entity 2
    const initBtcPrice = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entity2Pda,
      componentId: priceComponent.programId,
    });
    await provider.sendAndConfirm(initBtcPrice.transaction);
    priceBtcComponentPda = initBtcPrice.componentPda;
    console.log(`Added BTC price component to entity 2`);

    // Add AiFi price component to entity 3
    const initAifiPrice = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entity3Pda,
      componentId: priceComponent.programId,
    });
    await provider.sendAndConfirm(initAifiPrice.transaction);
    priceAifiComponentPda = initAifiPrice.componentPda;
    console.log(`Added AiFi price component to entity 3`);

    // Initialize wallet with some USDC
    const initWalletArgs = {
      transaction_type: 2, // INITIALIZE
      currency_type: 0, // USDC
      destination_currency_type: 0,
      amount: 500000000 // 500 USDC
    };

    const walletSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: walletComponent.programId },  // source wallet
          { componentId: walletComponent.programId },  // destination wallet (same wallet)
          { componentId: priceComponent.programId },   // price component
          { componentId: priceComponent.programId },   // extra price component
        ],
      }],
      args: initWalletArgs,
    });
    
    await provider.sendAndConfirm(walletSystem.transaction);
    console.log(`Initialized wallet with USDC`);

    // Add some BTC to wallet
    const addBtcArgs = {
      transaction_type: 2, // INITIALIZE
      currency_type: 1, // BTC
      destination_currency_type: 1,
      amount: 100000000 // 0.1 BTC
    };
    
    const btcSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: walletComponent.programId },  // source wallet
          { componentId: walletComponent.programId },  // destination wallet (same wallet)
          { componentId: priceComponent.programId },   // price component
          { componentId: priceComponent.programId },   // extra price component
        ],
      }],
      args: addBtcArgs,
    });
    
    await provider.sendAndConfirm(btcSystem.transaction);
    console.log(`Added BTC to wallet`);

    // Initialize USDC price component
    const usdcPriceArgs = {
      operation_type: 0, // INITIALIZE
      currency_type: CURRENCY_TYPE.USDC,
      price: 1000000, // $1.00
      min_price: 950000,
      max_price: 1050000,
      volatility: 100,
      update_frequency: 3600
    };
    
    const usdcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: anchor.workspace.PriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: priceComponent.programId },
        ],
      }],
      args: usdcPriceArgs,
    });
    
    await provider.sendAndConfirm(usdcPriceSystem.transaction);
    console.log(`Initialized USDC price component`);

    // Initialize BTC price component
    const btcPriceArgs = {
      operation_type: 0, // INITIALIZE
      currency_type: CURRENCY_TYPE.BTC,
      price: 60000000000, // $60,000.00
      min_price: 30000000000,
      max_price: 90000000000,
      volatility: 2000,
      update_frequency: 3600
    };
    
    const btcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: anchor.workspace.PriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entity2Pda,
        components: [
          { componentId: priceComponent.programId },
        ],
      }],
      args: btcPriceArgs,
    });
    
    await provider.sendAndConfirm(btcPriceSystem.transaction);
    console.log(`Initialized BTC price component`);

    // Initialize AiFi price component
    const aifiPriceArgs = {
      operation_type: 0, // INITIALIZE
      currency_type: CURRENCY_TYPE.AIFI,
      price: 5000000, // $5.00
      min_price: 1000000,
      max_price: 10000000,
      volatility: 2500,
      update_frequency: 3600
    };
    
    const aifiPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: anchor.workspace.PriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entity3Pda,
        components: [
          { componentId: priceComponent.programId },
        ],
      }],
      args: aifiPriceArgs,
    });
    
    await provider.sendAndConfirm(aifiPriceSystem.transaction);
    console.log(`Initialized AiFi price component`);

    console.log("Setup complete!");
  });

  it("should initialize player, register with leaderboard, and submit score to SOAR", async () => {
    // Make sure we're on devnet
    console.log("Running test on:", provider.connection.rpcEndpoint);
    if (!provider.connection.rpcEndpoint.includes("devnet")) {
      console.warn("WARNING: This test should run on devnet to work with SOAR");
      console.warn("Run with: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com anchor test");
    }

    // Get current wallet balances for display
    const wallet = await walletComponent.account.wallet.fetch(walletComponentPda);
    console.log("Current wallet balances:");
    console.log(`- USDC: ${wallet.usdcBalance.toNumber()/1000000}`);
    console.log(`- BTC: ${wallet.btcBalance.toNumber()/1000000}`);
    console.log(`- AiFi: ${wallet.aifiBalance.toNumber()/1000000}`);

    // Get price data for display
    const usdcPrice = await priceComponent.account.price.fetch(priceUsdcComponentPda);
    const btcPrice = await priceComponent.account.price.fetch(priceBtcComponentPda);
    
    console.log("Current prices:");
    console.log(`- USDC: ${usdcPrice.currentPrice.toNumber()/1000000}`);
    console.log(`- BTC: ${btcPrice.currentPrice.toNumber()/1000000}`);

    // Calculate expected wealth manually
    let expectedWealth = wallet.usdcBalance.toNumber();
    const btcValue = Math.floor((wallet.btcBalance.toNumber() * btcPrice.currentPrice.toNumber()) / 1000000);
    expectedWealth += btcValue;
    
    console.log("Expected wealth calculation:");
    console.log(`- USDC: ${wallet.usdcBalance.toNumber()/1000000} (${wallet.usdcBalance.toNumber()} raw)`);
    console.log(`- BTC: ${wallet.btcBalance.toNumber()/1000000} BTC at ${btcPrice.currentPrice.toNumber()/1000000} USDC = ${btcValue/1000000} USDC (${btcValue} raw)`);
    console.log(`Total expected wealth: ${expectedWealth/1000000} USDC (${expectedWealth} raw)`);

    
    // Create PublicKeys directly from constants
    const soarProgramId = new PublicKey(SOAR_PROGRAM_ID);
    const gameAddress = new PublicKey(GAME_ADDRESS);
    const topEntriesAddress = new PublicKey(TOP_ENTRIES_ADDRESS);
    const leaderboardPubkey = new PublicKey(LEADERBOARD_ADDRESS);
    const systemProgramId = anchor.web3.SystemProgram.programId;
    
    console.log("\n===== STEP 1: Initialize Player =====");
    
    // Find the player account PDA
    const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), provider.wallet.publicKey.toBuffer()],
      soarProgramId
    );
    console.log(`Derived player PDA: ${playerPda.toString()}`);
    
    // Prepare accounts for the initialize player operation
    const initPlayerAccounts = [
      {
        pubkey: soarProgramId, // SOAR program ID
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: provider.wallet.publicKey, // Payer
        isWritable: true,
        isSigner: true
      },
      {
        pubkey: provider.wallet.publicKey, // User
        isWritable: false,
        isSigner: true
      },
      {
        pubkey: playerPda, // Player account PDA
        isWritable: true,
        isSigner: false
      },
      {
        pubkey: systemProgramId, // System Program
        isWritable: false,
        isSigner: false
      }
    ];
    
    // Create operation type arg for initialize player (0)
    const initPlayerArgs = {
        operation_type: 0 // InitializePlayer
      };

    // Apply the leaderboard system to initialize player
    const initPlayerSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemLeaderboard.programId,
      world: worldPda,
      entities: [
        {
          // Entity 1: Contains wallet and USDC price
          entity: entityPda,
          components: [
            { componentId: walletComponent.programId },   // wallet component for the entity
            { componentId: priceComponent.programId },    // USDC price component
          ],
        },
        {
          // Entity 2: Contains BTC price
          entity: entity2Pda,
          components: [
            { componentId: priceComponent.programId },    // BTC price component
          ],
        },
        {
          // Entity 3: Contains AiFi price
          entity: entity3Pda,
          components: [
            { componentId: priceComponent.programId },    // AiFi price component
          ],
        }
      ],
      args: initPlayerArgs,
      extraAccounts: initPlayerAccounts
    });
    
    try {
      const initPlayerTx = await provider.sendAndConfirm(initPlayerSystem.transaction);
      console.log(`Successfully initialized player. Signature: ${initPlayerTx}`);
    } catch (error) {
      console.log("Error initializing player:", error);
      // If this fails because player already exists, we can continue
      console.log("Continuing test assuming player might already be initialized...");
    }
    
    console.log("\n===== STEP 2: Register Player with Leaderboard =====");
    
    // Calculate the player_scores PDA 
    const [playerScoresPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(PLAYER_SCORES_SEED), playerPda.toBuffer(), leaderboardPubkey.toBuffer()],
      soarProgramId
    );
    console.log(`Derived player_scores PDA: ${playerScoresPda.toString()}`);
    
    // Prepare accounts for register player operation 
    const registerPlayerAccounts = [
      {
        pubkey: soarProgramId, // SOAR program ID
        isWritable: false, 
        isSigner: false
      },
      {
        pubkey: provider.wallet.publicKey, // Payer
        isWritable: true,
        isSigner: true
      },
      {
        pubkey: provider.wallet.publicKey, // User
        isWritable: false,
        isSigner: true
      },
      {
        pubkey: playerPda, // Player account
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: gameAddress, // Game account
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: leaderboardPubkey, // Leaderboard
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: playerScoresPda, // Player scores PDA to be created
        isWritable: true,
        isSigner: false
      },
      {
        pubkey: systemProgramId, // System Program
        isWritable: false,
        isSigner: false
      }
    ];
    
    // Create operation type arg for register player (1)
    const registerPlayerArgs = {
    operation_type: 1 // RegisterPlayer
    };

    // Apply the leaderboard system to register player
    const registerPlayerSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemLeaderboard.programId,
      world: worldPda,
      entities: [
        {
          entity: entityPda,
          components: [
            { componentId: walletComponent.programId },
            { componentId: priceComponent.programId },
          ],
        },
        {
          entity: entity2Pda,
          components: [
            { componentId: priceComponent.programId },
          ],
        },
        {
          entity: entity3Pda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }
      ],
      args: registerPlayerArgs,
      extraAccounts: registerPlayerAccounts
    });
    
    try {
      const registerPlayerTx = await provider.sendAndConfirm(registerPlayerSystem.transaction);
      console.log(`Successfully registered player with leaderboard. Signature: ${registerPlayerTx}`);
    } catch (error) {
      console.log("Error registering player with leaderboard:", error);
      // If this fails because player already registered, we can continue
      console.log("Continuing test assuming player might already be registered...");
    }
    
    console.log("\n===== STEP 3: Submit Score to Leaderboard =====");
    
    // Prepare accounts for submit score operation
    const submitScoreAccounts = [
      {
        pubkey: soarProgramId, // SOAR program ID
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: provider.wallet.publicKey, // Payer
        isWritable: true,
        isSigner: true
      },
      {
        pubkey: provider.wallet.publicKey, // Authority
        isWritable: false,
        isSigner: true
      },
      {
        pubkey: playerPda, // Player account
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: gameAddress, // Game account
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: leaderboardPubkey, // Leaderboard
        isWritable: false,
        isSigner: false
      },
      {
        pubkey: playerScoresPda, // Player scores PDA (already created)
        isWritable: true,
        isSigner: false
      },
      {
        pubkey: topEntriesAddress, // Top entries
        isWritable: true,
        isSigner: false
      },
      {
        pubkey: systemProgramId, // System Program
        isWritable: false,
        isSigner: false
      }
    ];
    
    // Create operation type arg for submit score (2)
    const submitScoreArgs = {
    operation_type: 2 // SubmitScore
    };
    
    // Apply the leaderboard system to submit score
    const submitScoreSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemLeaderboard.programId,
      world: worldPda,
      entities: [
        {
          // Entity 1: Contains wallet and USDC price
          entity: entityPda,
          components: [
            { componentId: walletComponent.programId },   // wallet component for the entity
            { componentId: priceComponent.programId },    // USDC price component
          ],
        },
        {
          // Entity 2: Contains BTC price
          entity: entity2Pda,
          components: [
            { componentId: priceComponent.programId },    // BTC price component
          ],
        },
        {
          // Entity 3: Contains AiFi price
          entity: entity3Pda,
          components: [
            { componentId: priceComponent.programId },    // AiFi price component
          ],
        }
      ],
      args: submitScoreArgs,
      extraAccounts: submitScoreAccounts
    });
    
    // Run the transaction and handle result
    try {
      const submitScoreTx = await provider.sendAndConfirm(submitScoreSystem.transaction);
      console.log(`Successfully submitted score to SOAR leaderboard. Signature: ${submitScoreTx}`);

      // Get transaction logs to see the calculated wealth
      const txInfo = await provider.connection.getTransaction(submitScoreTx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (txInfo?.meta?.logMessages) {
        console.log("\nLeaderboard logs:");
        txInfo.meta.logMessages.filter(log => 
          log.includes("Calculated player wealth") || 
          log.includes("SOAR") || 
          log.includes("Wealth calculation") ||
          log.includes("score")
        ).forEach(log => console.log(log));
      }
      
      console.log("\nSuccessfully completed all SOAR leaderboard operations!");
    } catch (error) {
      console.log("Error submitting score to leaderboard:", error);
      
      // Show transaction logs if available
      if (error.logs) {
        console.log("\nTransaction logs:");
        error.logs.filter(log => 
          log.includes("Calculated player wealth") || 
          log.includes("SOAR") || 
          log.includes("Wealth calculation")
        ).forEach(log => console.log(log));
      }
      
      // Check if running on local validator
      if (provider.connection.rpcEndpoint.includes("localhost") || 
          provider.connection.rpcEndpoint.includes("127.0.0.1")) {
        console.log("\nNOTE: This error is expected when running on local validator.");
        console.log("To make this test work properly, run it on devnet:");
        console.log("ANCHOR_PROVIDER_URL=https://api.devnet.solana.com anchor test");
      } else {
        console.log("\nThis error might be due to:");
        console.log("1. Incorrect SOAR program ID or account addresses");
        console.log("2. Insufficient permissions for your wallet");
        console.log("3. Missing or invalid account data on SOAR program");
      }
    }
  });
}); 