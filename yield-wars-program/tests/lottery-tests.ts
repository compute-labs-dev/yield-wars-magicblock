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
  let lotteryEntity: PublicKey;
  let walletComponentPda: PublicKey;
  let lotteryPrizeComponentPda: PublicKey;

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
        amount: 1000000000 // 1000 USDC
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
      console.log(`Added 1000 USDC to wallet. Signature: ${txSign}`);

      // Add AiFi
      const addAifiArgs = {
        transaction_type: 2, // INITIALIZE
        currency_type: CURRENCY_TYPE.AIFI,
        destination_currency_type: CURRENCY_TYPE.AIFI,
        amount: 1000000000 // 1000 AiFi
      };

      applySystem = await ApplySystem({
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
        args: addAifiArgs,
      });

      txSign = await provider.sendAndConfirm(applySystem.transaction as any);
      console.log(`Added 1000 AiFi to wallet. Signature: ${txSign}`);

      // Verify funds were added successfully
      const walletBalance = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`Wallet balance: ${walletBalance.usdcBalance.toNumber() / 1000000} USDC, ${walletBalance.aifiBalance.toNumber() / 1000000} AiFi`);

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
});
