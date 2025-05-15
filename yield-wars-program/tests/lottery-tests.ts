import { PublicKey } from "@solana/web3.js";
import { Wallet } from "../target/types/wallet";
import { Price } from "../target/types/price";
import { Economy } from "../target/types/economy";
import { Lottery } from "../target/types/lottery";
import { LotteryPrize } from "../target/types/lottery_prize";
import { VrfClient } from "../target/types/vrf_client";
import {
  InitializeNewWorld,
  AddEntity,
  InitializeComponent,
  ApplySystem,
  Program
} from "@magicblock-labs/bolt-sdk"
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import * as crypto from "crypto";

// Shared setup for all tests
describe("Lottery Tests", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  console.log("Provider initialized");
  console.log("Provider wallet:", provider.wallet.publicKey.toBase58());
  console.log("Provider connection:", provider.connection.rpcEndpoint);

  // Common variables used across tests
  let worldPda: PublicKey;
  let entityPda: PublicKey;
  let entity2Pda: PublicKey;
  let lotteryEntity: PublicKey;
  let walletComponentPda: PublicKey;
  let lotteryPrizeComponentPda: PublicKey;
  let usdcPriceComponentPda: PublicKey;
  let aifiPriceComponentPda: PublicKey;
  
  const walletComponent = anchor.workspace.Wallet as Program<Wallet>;
  const lotteryPrizeComponent = anchor.workspace.LotteryPrize as Program<LotteryPrize>;
  const systemLottery = anchor.workspace.Lottery as Program<Lottery>;
  const systemEconomy = anchor.workspace.Economy as Program<Economy>;
  const priceComponent = anchor.workspace.Price as Program<Price>;

  // Common constants
  const CURRENCY_TYPE = {
    USDC: 0,
    BTC: 1,
    ETH: 2,
    SOL: 3,
    AIFI: 4
  };

  // Setup the test environment once before all tests
  before(async () => {
    // Initialize world
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection as any,
    });
    const worldTxSign = await provider.sendAndConfirm(initNewWorld.transaction as any);
    worldPda = initNewWorld.worldPda;
    console.log(`Initialized a new world (ID=${worldPda}). Initialization signature: ${worldTxSign}`);

    // Add player entity
    const addPlayerEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection as any,
    });
    const playerTxSign = await provider.sendAndConfirm(addPlayerEntity.transaction as any);
    entityPda = addPlayerEntity.entityPda;
    console.log(`Initialized a player entity (ID=${entityPda}). Initialization signature: ${playerTxSign}`);

    // Add wallet component to player
    const initializeWallet = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: walletComponent.programId,
    });
    const walletTxSign = await provider.sendAndConfirm(initializeWallet.transaction as any);
    walletComponentPda = initializeWallet.componentPda;
    console.log(`Initialized the wallet component. Initialization signature: ${walletTxSign}`);

    // Add price component for AiFi transactions
    const initializePrice = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: priceComponent.programId,
    });
    await provider.sendAndConfirm(initializePrice.transaction as any);

    try {
      console.log("Adding funds to wallet...");

      // Add USDC
      const addUsdcArgs = {
        transaction_type: 2, // INITIALIZE
        currency_type: CURRENCY_TYPE.USDC,
        destination_currency_type: CURRENCY_TYPE.USDC,
        amount: 6000000000 // 6000 USDC
      };

      let applySystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemEconomy.programId,
        world: worldPda,
        entities: [{
          entity: entityPda,
          components: [
            { componentId: walletComponent.programId },
            { componentId: walletComponent.programId },
            { componentId: priceComponent.programId },
            { componentId: priceComponent.programId },
          ],
        }],
        args: addUsdcArgs,
      });

      let txSign = await provider.sendAndConfirm(applySystem.transaction as any);
      console.log(`Added 6000 USDC to wallet. Signature: ${txSign}`);
      
      // Verify funds were added successfully
      const walletBalance = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`Wallet balance: ${walletBalance.usdcBalance.toNumber() / 1000000} USDC, ${walletBalance.aifiBalance.toNumber() / 1000000} AiFi`);

      // Exchange 5000 USDC for AiFi
      console.log("Setting up AiFi price component and exchanging USDC for AiFi...");

      // First add a price component for AiFi (on a new entity)
      const addAiFiEntity = await AddEntity({
        payer: provider.wallet.publicKey,
        world: worldPda,
        connection: provider.connection as any,
      });
      const aiFiEntityPda = addAiFiEntity.entityPda;
      await provider.sendAndConfirm(addAiFiEntity.transaction as any);

      const initAiFiPriceComp = await InitializeComponent({
        payer: provider.wallet.publicKey,
        entity: aiFiEntityPda,
        componentId: priceComponent.programId,
      });

      const aiFiPriceComponentPda = initAiFiPriceComp.componentPda;
      await provider.sendAndConfirm(initAiFiPriceComp.transaction as any);

      // Initialize price components for USDC and AiFi with PriceAction system
      const systemPriceAction = anchor.workspace.PriceAction;

      // Initialize USDC price first
      const initUsdcPriceArgs = {
        operation_type: 0, // INITIALIZE operation
        currency_type: CURRENCY_TYPE.USDC,
        price: 1000000, // $1.00 (using 6 decimal places)
        min_price: 950000, // $0.95
        max_price: 1050000, // $1.05
        volatility: 100, // 1% volatility (in basis points)
        update_frequency: 3600 // Update once per hour (in seconds)
      };

      // Apply the PriceAction system to initialize USDC price
      let priceActionSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: entityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: initUsdcPriceArgs,
      });

      await provider.sendAndConfirm(priceActionSystem.transaction as any, undefined, { skipPreflight: true });
      console.log("Initialized USDC price component");

      // Initialize AiFi price with a 5:1 USDC to AiFi ratio
      const initAiFiPriceArgs = {
        operation_type: 0, // INITIALIZE operation
        currency_type: CURRENCY_TYPE.AIFI,
        price: 5150000, // $5.15 (using 6 decimal places) - for 5:1 ratio with USDC
        min_price: 4000000, // $4.00
        max_price: 6000000, // $6.00
        volatility: 100, // 1% volatility
        update_frequency: 3600 // Update once per hour
      };

      // Apply the PriceAction system to initialize AiFi price
      priceActionSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: aiFiEntityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: initAiFiPriceArgs,
      });

      await provider.sendAndConfirm(priceActionSystem.transaction as any, undefined, { skipPreflight: true });
      console.log("Initialized AiFi price component");

      // Enable price updates for both components
      const enableUsdcPriceArgs = {
        operation_type: 1, // ENABLE operation
        currency_type: CURRENCY_TYPE.USDC,
        price: 0, // Not used for enable operation
        min_price: 0,
        max_price: 0,
        volatility: 0,
        update_frequency: 0
      };

      priceActionSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: entityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: enableUsdcPriceArgs,
      });

      await provider.sendAndConfirm(priceActionSystem.transaction as any);

      // Enable AiFi price updates
      const enableAiFiPriceArgs = {
        operation_type: 1, // ENABLE operation
        currency_type: CURRENCY_TYPE.AIFI, 
        price: 0,
        min_price: 0,
        max_price: 0,
        volatility: 0,
        update_frequency: 0
      };

      priceActionSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: aiFiEntityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: enableAiFiPriceArgs,
      });

      await provider.sendAndConfirm(priceActionSystem.transaction as any);
      console.log("Price updates enabled for both USDC and AiFi");

      // Update prices before exchange
      const updateUsdcPriceArgs = {
        operation_type: 2, // UPDATE operation
        currency_type: CURRENCY_TYPE.USDC,
        price: 0, // Not used for update
        min_price: 0,
        max_price: 0,
        volatility: 0,
        update_frequency: 0
      };

      priceActionSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: entityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: updateUsdcPriceArgs,
      });

      await provider.sendAndConfirm(priceActionSystem.transaction as any);

      // Update AiFi price
      const updateAiFiPriceArgs = {
        operation_type: 2, // UPDATE operation
        currency_type: CURRENCY_TYPE.AIFI,
        price: 0, // Not used for update
        min_price: 0,
        max_price: 0,
        volatility: 0,
        update_frequency: 0
      };

      priceActionSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: aiFiEntityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: updateAiFiPriceArgs,
      });

      await provider.sendAndConfirm(priceActionSystem.transaction as any);
      console.log("Updated prices for both USDC and AiFi");

      // Now perform the exchange of 5000 USDC to AiFi
      const exchangeAmount = 5000000000; // 5000 USDC
      console.log(`Exchanging ${exchangeAmount/1000000} USDC for AiFi...`);

      const exchangeArgs = {
        transaction_type: 1, // EXCHANGE (not TRANSFER which is 0)
        currency_type: CURRENCY_TYPE.USDC,
        destination_currency_type: CURRENCY_TYPE.AIFI,
        amount: exchangeAmount
      };

      const exchangeSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemEconomy.programId,
        world: worldPda,
        entities: [
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId },   // source_wallet
              { componentId: walletComponent.programId },   // destination_wallet (same wallet)
              { componentId: priceComponent.programId },    // USDC price
            ],
          },
          {
            entity: aiFiEntityPda,
            components: [
              { componentId: priceComponent.programId },    // AiFi price
            ],
          }
        ],
        args: exchangeArgs,
      });

      txSign = await provider.sendAndConfirm(exchangeSystem.transaction as any);
      console.log(`Exchange transaction signature: ${txSign}`);

      // Verify the exchange worked
      const walletAfter = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`Wallet balance after exchange: ${walletAfter.usdcBalance.toNumber()/1000000} USDC, ${walletAfter.aifiBalance.toNumber()/1000000} AiFi`);

    } catch (error) {
      console.error("Failed to add funds to wallet:", error);
      console.warn("WARNING: Tests requiring funds will fail.");
    }

    // Create the lottery entity
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection as any,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction as any);
    lotteryEntity = addEntity.entityPda;
    console.log(`Initialized a new lottery Entity (ID=${addEntity.entityPda}). Initialization signature: ${txSign}`);
  });

  describe("LotteryPrize Component Tests", () => { 
    // Test initializing the LotteryPrize component
    it("should initialize the lottery prize component", async () => {
      const initializeComponent = await InitializeComponent({
        payer: provider.wallet.publicKey,
        entity: lotteryEntity,
        componentId: lotteryPrizeComponent.programId,
      });
      const txSign = await provider.sendAndConfirm(initializeComponent.transaction as any);
      lotteryPrizeComponentPda = initializeComponent.componentPda;
      console.log(`\tInitialized the lottery prize component. Initialization signature: ${txSign}`);
      
      // Verify the component was initialized with default values
      const lotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      expect(lotteryPrizeAccount.minBetAmount.toString()).to.equal("0");
      expect(lotteryPrizeAccount.winProbability.toString()).to.equal("0");
      expect(lotteryPrizeAccount.maxWinMultiplier.toString()).to.equal("0");
      expect(lotteryPrizeAccount.isActive).to.equal(false); // Should be inactive by default
      expect(lotteryPrizeAccount.totalBets.toString()).to.equal("0");
      expect(lotteryPrizeAccount.totalWins.toString()).to.equal("0");
      expect(lotteryPrizeAccount.recentWinners.length).to.equal(0);
      expect(lotteryPrizeAccount.recentPrizes.length).to.equal(0);
    });

    // Test setting lottery parameters
    it("should configure lottery prize parameters", async () => {
      // Set up initial parameters for the lottery
      const minBetAmount = 1000000; // 1 AiFi token
      const winProbability = 2000;   // 20% chance to win (2000 out of 10000)
      const maxWinMultiplier = 5000; // Up to 5x multiplier on wins

      // Create structured arguments
      const args = {
        Initialize: {
          min_bet_amount: minBetAmount,
          win_probability: winProbability,
          max_win_multiplier: maxWinMultiplier,
        }
      };

      // Use the ApplySystem to initialize the lottery
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });

      const txSign = await provider.sendAndConfirm(tx.transaction as any);
      console.log(`\tConfigured the lottery parameters. Tx signature: ${txSign}`);

      // Verify the parameters were set correctly
      const lotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      expect(lotteryPrizeAccount.minBetAmount.toString()).to.equal(minBetAmount.toString());
      expect(lotteryPrizeAccount.winProbability.toString()).to.equal(winProbability.toString());
      expect(lotteryPrizeAccount.maxWinMultiplier.toString()).to.equal(maxWinMultiplier.toString());
      expect(lotteryPrizeAccount.isActive).to.equal(true);
    });

    // Test updating lottery parameters
    it("should update lottery prize parameters", async () => {
      // New parameters for the lottery
      const minBetAmount = 2000000; // 2 AiFi tokens
      const winProbability = 1000;   // 10% chance to win
      const maxWinMultiplier = 8000; // Up to 8x multiplier
      const isActive = true;         // Keep active

      // Create structured arguments
      const args = {
        UpdateParams: {
          min_bet_amount: minBetAmount,
          win_probability: winProbability,
          max_win_multiplier: maxWinMultiplier,
          is_active: isActive
        }
      };

      // Use the ApplySystem to update the parameters
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });

      const txSign = await provider.sendAndConfirm(tx.transaction as any);
      console.log(`\tUpdated the lottery parameters. Tx signature: ${txSign}`);

      // Verify the parameters were updated correctly
      const lotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      expect(lotteryPrizeAccount.minBetAmount.toString()).to.equal(minBetAmount.toString());
      expect(lotteryPrizeAccount.winProbability.toString()).to.equal(winProbability.toString());
      expect(lotteryPrizeAccount.maxWinMultiplier.toString()).to.equal(maxWinMultiplier.toString());
      expect(lotteryPrizeAccount.isActive).to.equal(isActive);
    });

    // Test deactivating the lottery
    it("should deactivate the lottery", async () => {
      const lotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      
      // Use literal number values
      const args = {
        UpdateParams: {
          min_bet_amount: 2000000, // Use the same values that worked in earlier tests
          win_probability: 1000,
          max_win_multiplier: 8000,
          is_active: false
        }
      };

      // Use the ApplySystem to deactivate
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });

      const txSign = await provider.sendAndConfirm(tx.transaction as any);
      console.log(`\tDeactivated the lottery. Tx signature: ${txSign}`);

      // Verify the lottery is now inactive
      const updatedLotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      expect(updatedLotteryPrizeAccount.isActive).to.equal(false);
    });

    // Test reactivating the lottery
    it("should reactivate the lottery", async () => {
      // Use literal number values
      const args = {
        UpdateParams: {
          min_bet_amount: 2000000, // Use the same values that worked in earlier tests
          win_probability: 1000,
          max_win_multiplier: 8000,
          is_active: true
        }
      };

      // Use the ApplySystem to reactivate
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });

      const txSign = await provider.sendAndConfirm(tx.transaction as any);
      console.log(`\tReactivated the lottery. Tx signature: ${txSign}`);

      // Verify the lottery is now active again
      const updatedLotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      expect(updatedLotteryPrizeAccount.isActive).to.equal(true);
    });
  });

  describe("Lottery System Tests", () => {
    
    // Test placing a single bet
    it("should place a bet and handle the outcome correctly", async () => {
      // Parameters for the bet
      const betAmount = 10000000; // 10 AiFi tokens

      // Check current wallet balance
      const walletAccountBefore = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`\tAiFi balance before bet: ${walletAccountBefore.aifiBalance.toNumber() / 1000000} AiFi`);

      // Generate randomness as a plain array
      const randomnessArray = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));

      // Create structured arguments
      const args = {
        PlaceBet: {
          bet_amount: betAmount,
          randomness: randomnessArray
        }
      };

      // Before state
      const lotteryPrizeAccountBefore = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      const initialBalance = walletAccountBefore.aifiBalance;
      const initialTotalBets = lotteryPrizeAccountBefore.totalBets;

      // Use the ApplySystem to place a bet
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });

      const txSign = await provider.sendAndConfirm(tx.transaction as any);
      console.log(`\tPlaced a bet in the lottery. Tx signature: ${txSign}`);

      // After state
      const walletAccountAfter = await walletComponent.account.wallet.fetch(walletComponentPda);
      const lotteryPrizeAccountAfter = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);

      console.log("\tInitial AiFi balance:", initialBalance.toString());
      console.log("\tFinal AiFi balance:", walletAccountAfter.aifiBalance.toString());
      console.log("\tBet amount:", betAmount.toString());

      // Check if player won
      const playerWon = lotteryPrizeAccountAfter.totalWins.toNumber() > lotteryPrizeAccountBefore.totalWins.toNumber();
      console.log("\tPlayer won:", playerWon);

      if (playerWon) {
        // If the player won, their balance might be higher than before
        console.log("\tPlayer won! Prize amount:",
          (BigInt(walletAccountAfter.aifiBalance.toString()) -
            BigInt(initialBalance.toString()) +
            BigInt(betAmount)).toString());

        expect(lotteryPrizeAccountAfter.recentWinners.length).to.be.greaterThan(0);
      } else {
        // If player lost, their balance should be lower by exactly the bet amount
        expect(initialBalance.sub(walletAccountAfter.aifiBalance).toString()).to.equal(betAmount.toString());
      }

      // Total bets should always increase by 1
      expect(lotteryPrizeAccountAfter.totalBets.toNumber()).to.equal(initialTotalBets.toNumber() + 1);
    });

    // Test multiple bets to verify randomness and win/loss patterns
    it("should allow multiple bets with random outcomes", async () => {
      // We'll place 5 bets and track results
      const betAmount = 5000000; // 5 AiFi per bet

      // Check current wallet balance
      const walletAccountBefore = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`\tAiFi balance before multiple bets: ${walletAccountBefore.aifiBalance.toNumber() / 1000000} AiFi`);

      const initialBalance = walletAccountBefore.aifiBalance;
      let totalBets = 0;
      let wins = 0;

      // Get baseline stats
      const lotteryPrizeAccountBefore = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      const initialWins = lotteryPrizeAccountBefore.totalWins.toNumber();
      const initialTotalBets = lotteryPrizeAccountBefore.totalBets.toNumber();
      
      // Get the win probability for reference
      const winProbability = lotteryPrizeAccountBefore.winProbability.toString();
      console.log(`\tCurrent win probability: ${winProbability} out of 10000 (${parseInt(winProbability)/100}%)`);

      // Place multiple bets
      for (let i = 0; i < 5; i++) {
        // Generate randomness with a pattern to ensure some wins
        // For the first and third bets, use a value that will result in a win
        let randomnessArray;
        
        if (i === 1 || i === 3) {
          // These are "rigged" to win - filling with low values to ensure
          // that when converted to u64 and modulo 10000, it will be <= winProbability
          randomnessArray = Array(32).fill(0);
          randomnessArray[0] = parseInt(winProbability) > 100 ? 1 : 0; // A value that will be small after conversion
        } else {
          // Regular random values (likely to lose)
          randomnessArray = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
        }

        // Create structured arguments
        const args = {
          PlaceBet: {
            bet_amount: betAmount,
            randomness: randomnessArray
          }
        };

        // Place the bet
        const tx = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemLottery.programId,
          world: worldPda,
          entities: [
            {
              entity: lotteryEntity,
              components: [
                { componentId: lotteryPrizeComponent.programId }
              ]
            },
            {
              entity: entityPda,
              components: [
                { componentId: walletComponent.programId }
              ]
            }
          ],
          args
        });

        await provider.sendAndConfirm(tx.transaction as any);
        totalBets++;

        // Check lottery state after bet
        const lotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);

        // If wins increased, player won this round
        if (lotteryPrizeAccount.totalWins.toNumber() > initialWins + wins) {
          wins++;
          console.log(`\tRound ${i + 1}: Player WON!`);
        } else {
          console.log(`\tRound ${i + 1}: Player lost`);
        }
      }

      // Final state
      const walletAccountAfter = await walletComponent.account.wallet.fetch(walletComponentPda);
      const lotteryPrizeAccountAfter = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);

      console.log("\t-------- Lottery Summary --------");
      console.log(`\tTotal bets placed: ${totalBets}`);
      console.log(`\tWins: ${wins} (${(wins / totalBets * 100).toFixed(1)}% win rate)`);
      console.log(`\tInitial AiFi balance: ${initialBalance.toString()}`);
      console.log(`\tFinal AiFi balance: ${walletAccountAfter.aifiBalance.toString()}`);
      console.log(`\tNet profit/loss: ${walletAccountAfter.aifiBalance.sub(initialBalance).toString()}`);
      console.log("\t--------------------------------");

      // Check that the lottery total bets increased correctly
      expect(lotteryPrizeAccountAfter.totalBets.toNumber()).to.equal(initialTotalBets + totalBets);
      
      // Verify the win count matches our tracking
      expect(lotteryPrizeAccountAfter.totalWins.toNumber()).to.equal(initialWins + wins);
    });

    // Test placing a bet on inactive lottery (should fail)
    it("should prevent betting when lottery is inactive", async () => {
      // First deactivate the lottery using literal number values
      const deactivateArgs = {
        UpdateParams: {
          min_bet_amount: 2000000, // Use the same values that worked in earlier tests
          win_probability: 1000,
          max_win_multiplier: 8000,
          is_active: false
        }
      };

      // Deactivate the lottery
      let tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args: deactivateArgs
      });

      await provider.sendAndConfirm(tx.transaction as any);
      
      // Now try to place a bet
      const betAmount = 5000000; // 5 AiFi
      const randomnessArray = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
      
      const betArgs = {
        PlaceBet: {
          bet_amount: betAmount,
          randomness: randomnessArray
        }
      };
      
      // Try to place bet on inactive lottery
      tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args: betArgs
      });
      
      try {
        await provider.sendAndConfirm(tx.transaction as any);
        // If we get here, the test failed
        expect.fail("Should not be able to place bet on inactive lottery");
      } catch (error) {
        // Expected error - verify it's because the lottery is inactive
        expect(error.toString()).to.include("LotteryNotActive");
        console.log("\tCorrectly prevented bet on inactive lottery");
      }
      
      // Reactivate lottery for subsequent tests using literal number values
      const reactivateArgs = {
        UpdateParams: {
          min_bet_amount: 2000000, // Use the same values that worked in earlier tests
          win_probability: 1000,
          max_win_multiplier: 8000,
          is_active: true
        }
      };
      
      tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args: reactivateArgs
      });
      
      await provider.sendAndConfirm(tx.transaction as any);
    });

    // Test placing a bet with insufficient funds
    it("should prevent betting with insufficient funds", async () => {
      // Get current wallet balance
      const walletAccountBefore = await walletComponent.account.wallet.fetch(walletComponentPda);
      // Try to bet more than available balance
      const betAmount = walletAccountBefore.aifiBalance.toNumber() + 1000000; // More than available
      
      const randomnessArray = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
      
      const args = {
        PlaceBet: {
          bet_amount: betAmount,
          randomness: randomnessArray
        }
      };
      
      // Try to place bet with insufficient funds
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });
      
      try {
        await provider.sendAndConfirm(tx.transaction as any);
        // If we get here, the test failed
        expect.fail("Should not be able to place bet with insufficient funds");
      } catch (error) {
        // Expected error - verify it's because of insufficient funds
        expect(error.toString()).to.include("InsufficientFunds");
        console.log("\tCorrectly prevented bet with insufficient funds");
      }
    });

    // Test placing a bet below minimum amount
    it("should prevent betting below minimum amount", async () => {
      // Get current minimum bet amount
      const lotteryPrizeAccount = await lotteryPrizeComponent.account.lotteryPrize.fetch(lotteryPrizeComponentPda);
      const minBetAmount = lotteryPrizeAccount.minBetAmount.toNumber();
      
      // Try to bet less than minimum
      const betAmount = Math.max(1, minBetAmount - 1); // One less than minimum
      
      const randomnessArray = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
      
      const args = {
        PlaceBet: {
          bet_amount: betAmount,
          randomness: randomnessArray
        }
      };
      
      // Try to place bet below minimum amount
      const tx = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemLottery.programId,
        world: worldPda,
        entities: [
          {
            entity: lotteryEntity,
            components: [
              { componentId: lotteryPrizeComponent.programId }
            ]
          },
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId }
            ]
          }
        ],
        args
      });
      
      try {
        await provider.sendAndConfirm(tx.transaction as any);
        // If we get here, the test failed
        expect.fail("Should not be able to place bet below minimum amount");
      } catch (error) {
        // Expected error - verify it's because of bet amount too low
        expect(error.toString()).to.include("BetAmountTooLow");
        console.log("\tCorrectly prevented bet below minimum amount");
      }
    });
  });
});
