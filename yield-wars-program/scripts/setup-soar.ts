import { SoarProgram, GameType, Genre } from "@magicblock-labs/soar-sdk";
import { sendTransaction } from '@solana-developers/helpers';
import { Connection, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import fs from 'fs';
import path from 'path';
import os from 'os';
import BN from "bn.js";

// Constants for game details
const GAME_NAME = "YieldWars";
const GAME_DESCRIPTION = "A GPU mining and resource management strategy game on Solana";
const GAME_URI = "https://yieldwars.computelabs.ai";
const LEADERBOARD_NAME = "Total Wealth";
const LEADERBOARD_DESCRIPTION = "Players ranked by their total wealth in USDC";
let nftMeta = Keypair.generate().publicKey;

async function main() {
  // Setup connection
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  console.log("Using Solana RPC URL:", rpcUrl);
  const connection = new Connection(rpcUrl, "confirmed");

  // Create or load the admin wallet
  let adminKeypair = loadOrCreateAdminKeypair();
  console.log("Admin public key:", adminKeypair.publicKey.toString());

  // Create a SOAR client directly using the SDK
  const soarClient = SoarProgram.getFromConnection(connection, adminKeypair.publicKey);

  try {
    console.log("Registering game with SOAR...");
    
    // Generate a new keypair for the game
    const gameKeypair = Keypair.generate();
    console.log("Game keypair generated:", gameKeypair.publicKey.toString());
    
    // Register the game using the simplified SDK method
    const { newGame, transaction } = await soarClient.initializeNewGame(
      gameKeypair.publicKey.toString(),
      GAME_NAME,
      GAME_DESCRIPTION,
      Genre.RPG,
      GameType.Web,
      nftMeta, // No NFT meta
      [adminKeypair.publicKey] // Authorities
    );
    
    // Send and confirm transaction
    await sendAndConfirmTransaction(connection, transaction, [gameKeypair, adminKeypair], {skipPreflight: true});
    console.log("Game registered with SOAR!");
    
    // Create a leaderboard
    console.log("Creating wealth leaderboard...");
    const leaderboardKeypair = Keypair.generate();
    console.log("Leaderboard keypair generated:", leaderboardKeypair.publicKey.toString());
    

    // Add the leaderboard using the SDK
    const leaderboardTx = await soarClient.addNewGameLeaderBoard(
      newGame,
      adminKeypair.publicKey,
      LEADERBOARD_DESCRIPTION,
      nftMeta, // No NFT
      5, // scoresToRetain
      false, // Descending (higher is better)
      6, // USDC decimals
    );
    
    await sendAndConfirmTransaction(connection, leaderboardTx.transaction, [adminKeypair], {skipPreflight: true});
    console.log("Successfully created wealth leaderboard!");

    // Save configuration
    const leaderboardAddress = leaderboardTx.newLeaderBoard;
    
    const config = {
      soarProgramId: soarClient.program.programId.toString(),
      gameAddress: newGame.toString(),
      leaderboardAddress: leaderboardAddress.toString(),
    };
    
    fs.writeFileSync(
      path.join(__dirname, "soar-config.json"),
      JSON.stringify(config, null, 2)
    );
    
    console.log("\nConfiguration saved to soar-config.json");
  } catch (error) {
    console.error("Error setting up SOAR integration:", error);
    throw error;
  }
}

function loadOrCreateAdminKeypair() {
  if (process.env.ADMIN_PRIVATE_KEY) {
    console.log("Using admin private key from environment variable");
    return Keypair.fromSecretKey(
      Buffer.from(process.env.ADMIN_PRIVATE_KEY, "base64")
    );
  }
  
  console.log("No admin private key found in environment variable, trying default key location");
  const keyPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  try {
    const rawKey = fs.readFileSync(keyPath, 'utf-8');
    console.log("Raw key:", rawKey);
    return Keypair.fromSecretKey(Buffer.from(JSON.parse(rawKey)));
  } catch (err) {
    console.log('No key found at default location, generating ephemeral keypair');
    return Keypair.generate();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 