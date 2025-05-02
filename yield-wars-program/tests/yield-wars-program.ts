import { PublicKey } from "@solana/web3.js";
import { Position } from "../target/types/position";
import { Movement } from "../target/types/movement";
import { Wallet } from "../target/types/wallet";
import { Ownership } from "../target/types/ownership";
import { Production } from "../target/types/production";
import { Upgradeable } from "../target/types/upgradeable";
import { Stakeable } from "../target/types/stakeable";
import { Price } from "../target/types/price";
import { Economy } from "../target/types/economy";
import {
    InitializeNewWorld,
    AddEntity,
    InitializeComponent,
    ApplySystem,
    Program
} from "@magicblock-labs/bolt-sdk"
import {expect} from "chai";
import * as anchor from "@coral-xyz/anchor";

describe("yield-wars-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  console.log("Provider initialized");
  console.log("Provider wallet:", provider.wallet.publicKey.toBase58());
  console.log("Provider connection:", provider.connection.rpcEndpoint);

  // Constants used to test the program.
  let worldPda: PublicKey;
  let entityPda: PublicKey;
  let entity2Pda: PublicKey; // Second entity for transfer tests
  let positionComponentPda: PublicKey;
  let walletComponentPda: PublicKey;
  let wallet2ComponentPda: PublicKey; // Second wallet for transfer tests
  let ownershipComponentPda: PublicKey;
  let productionComponentPda: PublicKey;
  let upgradeableComponentPda: PublicKey;
  let stakeableComponentPda: PublicKey;
  let priceComponentPda: PublicKey;
  let priceBtcComponentPda: PublicKey; // BTC price component for exchange tests 
  let priceEthComponentPda: PublicKey; // ETH price component for exchange tests

  const positionComponent = anchor.workspace.Position as Program<Position>;
  const systemMovement = anchor.workspace.Movement as Program<Movement>;
  const walletComponent = anchor.workspace.Wallet as Program<Wallet>;
  const ownershipComponent = anchor.workspace.Ownership as Program<Ownership>;
  const productionComponent = anchor.workspace.Production as Program<Production>;
  const upgradeableComponent = anchor.workspace.Upgradeable as Program<Upgradeable>;
  const stakeableComponent = anchor.workspace.Stakeable as Program<Stakeable>;
  const priceComponent = anchor.workspace.Price as Program<Price>;
  const systemEconomy = anchor.workspace.Economy as Program<Economy>;

  // Entity type enum values
  const ENTITY_TYPE = {
    PLAYER: 0,
    GPU: 1,
    DATA_CENTER: 2,
    LAND: 3,
    ENERGY_CONTRACT: 4,
    UNKNOWN: 255
  };

  // Currency type enum values
  const CURRENCY_TYPE = {
    USDC: 0,
    BTC: 1,
    ETH: 2,
    SOL: 3,
    AIFI: 4
  };

  // Transaction type enum values
  const TRANSACTION_TYPE = {
    TRANSFER: 0,
    EXCHANGE: 1,
    INITIALIZE: 2
  };

  it("InitializeNewWorld", async () => {
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    console.log(`Initialized a new world (ID=${worldPda}). Initialization signature: ${txSign}`);
  });

  it("Add an entity", async () => {
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    entityPda = addEntity.entityPda;
    console.log(`Initialized a new Entity (ID=${addEntity.entityPda}). Initialization signature: ${txSign}`);
  });

  it("Add a second entity for transfer testing", async () => {
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    entity2Pda = addEntity.entityPda;
    console.log(`Initialized a second Entity (ID=${addEntity.entityPda}). Initialization signature: ${txSign}`);
  });

  it("Add a position component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: positionComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    positionComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the position component. Initialization signature: ${txSign}`);
  });

  it("Add a wallet component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: walletComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    walletComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the wallet component. Initialization signature: ${txSign}`);
  });

  it("Add a wallet component to the second entity", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entity2Pda,
      componentId: walletComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    wallet2ComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the second wallet component. Initialization signature: ${txSign}`);
  });

  it("Add an ownership component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: ownershipComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    ownershipComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the ownership component. Initialization signature: ${txSign}`);
  });

  it("Add a production component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: productionComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    productionComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the production component. Initialization signature: ${txSign}`);
  });

  it("Add an upgradeable component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: upgradeableComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    upgradeableComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the upgradeable component. Initialization signature: ${txSign}`);
  });

  it("Add a stakeable component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: stakeableComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    stakeableComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the stakeable component. Initialization signature: ${txSign}`);
  });

  it("Add a price component for USDC", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: priceComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    priceComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the price component. Initialization signature: ${txSign}`);
  });

  it("Add a price component for BTC", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entity2Pda,
      componentId: priceComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    priceBtcComponentPda = initializeComponent.componentPda;
    console.log(`Initialized the BTC price component. Initialization signature: ${txSign}`);
  });

  it("Verify wallet initial state", async () => {
    // Check that the wallet component has been initialized with default values
    const wallet = await walletComponent.account.wallet.fetch(
      walletComponentPda
    );
    expect(wallet.usdcBalance.toNumber()).to.equal(0);
    expect(wallet.btcBalance.toNumber()).to.equal(0);
    expect(wallet.ethBalance.toNumber()).to.equal(0);
    expect(wallet.solBalance.toNumber()).to.equal(0);
    expect(wallet.aifiBalance.toNumber()).to.equal(0);
  });

  it("Verify ownership initial state", async () => {
    // Check that the ownership component has been initialized with default values
    const ownership = await ownershipComponent.account.ownership.fetch(
      ownershipComponentPda
    );
    expect(ownership.ownerType).to.equal(0);
    expect(ownership.ownedEntities.length).to.equal(0);
    expect(ownership.ownedEntityTypes.length).to.equal(0);
  });

  it("Verify production initial state", async () => {
    // Check that the production component has been initialized with default values
    const production = await productionComponent.account.production.fetch(
      productionComponentPda
    );
    expect(production.usdcPerHour.toNumber()).to.equal(0);
    expect(production.aifiPerHour.toNumber()).to.equal(0);
    expect(production.lastCollectionTime.toNumber()).to.equal(0);
    expect(production.efficiencyMultiplier).to.equal(0);
    expect(production.producerType).to.equal(0);
    expect(production.level).to.equal(0);
    expect(production.isActive).to.equal(false);
    expect(production.operatingCost.toNumber()).to.equal(0);
  });

  it("Verify upgradeable initial state", async () => {
    // Check that the upgradeable component has been initialized with default values
    const upgradeable = await upgradeableComponent.account.upgradeable.fetch(
      upgradeableComponentPda
    );
    expect(upgradeable.currentLevel).to.equal(0);
    expect(upgradeable.maxLevel).to.equal(0);
    expect(upgradeable.lastUpgradeTime.toNumber()).to.equal(0);
    expect(upgradeable.canUpgrade).to.equal(false);
    expect(upgradeable.upgradeableType).to.equal(0);
    expect(upgradeable.nextUpgradeUsdcCost.toNumber()).to.equal(0);
    expect(upgradeable.nextUpgradeAifiCost.toNumber()).to.equal(0);
    expect(upgradeable.upgradeCooldown).to.equal(0);
    expect(upgradeable.nextUsdcBoost).to.equal(0);
    expect(upgradeable.nextAifiBoost).to.equal(0);
  });

  it("Verify stakeable initial state", async () => {
    // Check that the stakeable component has been initialized with default values
    const stakeable = await stakeableComponent.account.stakeable.fetch(
      stakeableComponentPda
    );
    expect(stakeable.isStaked).to.equal(false);
    expect(stakeable.stakingStartTime.toNumber()).to.equal(0);
    expect(stakeable.minStakingPeriod).to.equal(0);
    expect(stakeable.rewardRate).to.equal(0);
    expect(stakeable.unstakingPenalty).to.equal(0);
    expect(stakeable.accumulatedUsdcRewards.toNumber()).to.equal(0);
    expect(stakeable.accumulatedAifiRewards.toNumber()).to.equal(0);
    expect(stakeable.lastClaimTime.toNumber()).to.equal(0);
    expect(stakeable.stakeableType).to.equal(0);
    expect(stakeable.canClaimRewards).to.equal(false);
    expect(stakeable.baseUsdcPerHour.toNumber()).to.equal(0);
    expect(stakeable.baseAifiPerHour.toNumber()).to.equal(0);
  });

  it("Verify price initial state", async () => {
    // Check that the price component has been initialized with default values
    const price = await priceComponent.account.price.fetch(
      priceComponentPda
    );
    expect(price.currentPrice.toNumber()).to.equal(0);
    expect(price.previousPrice.toNumber()).to.equal(0);
    expect(price.lastUpdateTime.toNumber()).to.equal(0);
    expect(price.minPrice.toNumber()).to.equal(0);
    expect(price.maxPrice.toNumber()).to.equal(0);
    expect(price.volatility).to.equal(0);
    expect(price.updateFrequency).to.equal(0);
    expect(price.priceType).to.equal(0);
    expect(price.priceUpdatesEnabled).to.equal(false);
    expect(price.priceTrend).to.equal(0);
    expect(price.priceHistory.every(p => p.toNumber() === 0)).to.be.true;
    expect(price.historyIndex).to.equal(0);
    expect(price.supplyFactor).to.equal(0);
    expect(price.demandFactor).to.equal(0);
  });

  it("Initialize wallet with starting funds using EconomySystem", async () => {
    // First set up the wallet with proper data
    const startingFunds = 1000000000; // 1,000 USDC (1,000,000,000 = $1,000 with 6 decimal places)

    // Direct simple args object
    const args = {
      transaction_type: 2, // INITIALIZE
      currency_type: 0,
      destination_currency_type: 0,
      amount: startingFunds
    };

    // Run the economy system to initialize the wallet
    const applySystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: walletComponent.programId },      // source_wallet (the one we're initializing)
          { componentId: walletComponent.programId },      // destination_wallet
          { componentId: priceComponent.programId },       // source_price
          { componentId: priceComponent.programId },       // destination_price
        ],
      }],
      args: args,
    });
    
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`Applied economy system to initialize wallet. Signature: ${txSign}`);

    // Check that the wallet has been updated with the starting funds
    const walletAfter = await walletComponent.account.wallet.fetch(walletComponentPda);
    expect(walletAfter.usdcBalance.toNumber()).to.equal(startingFunds);
    console.log(`Wallet initialized with ${walletAfter.usdcBalance.toNumber()/1000000} USDC`);
  });

  it("Initialize second wallet with starting funds", async () => {
    // Set up the second wallet with proper data
    const startingFunds = 500000000; // 500 USDC (500,000,000 = $500 with 6 decimal places)

    // Direct simple args object
    const args = {
      transaction_type: 2, // INITIALIZE
      currency_type: 0,
      destination_currency_type: 0,
      amount: startingFunds
    };

    // Run the economy system to initialize the wallet
    const applySystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entity2Pda,
        components: [
          { componentId: walletComponent.programId },      // source_wallet (the one we're initializing)
          { componentId: walletComponent.programId },      // destination_wallet
          { componentId: priceComponent.programId },       // source_price
          { componentId: priceComponent.programId },       // destination_price
        ],
      }],
      args: args,
    });
    
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`Applied economy system to initialize second wallet. Signature: ${txSign}`);

    // Check that the second wallet has been updated with the starting funds
    const walletAfter = await walletComponent.account.wallet.fetch(wallet2ComponentPda);
    expect(walletAfter.usdcBalance.toNumber()).to.equal(startingFunds);
  });

  it("Transfer USDC between wallets", async () => {
    // Get wallet balances before transfer
    const wallet1Before = await walletComponent.account.wallet.fetch(walletComponentPda);
    const wallet2Before = await walletComponent.account.wallet.fetch(wallet2ComponentPda);
    
    console.log(`Initial wallet1 balance: ${wallet1Before.usdcBalance.toNumber()/1000000} USDC`);
    console.log(`Initial wallet2 balance: ${wallet2Before.usdcBalance.toNumber()/1000000} USDC`);
    
    const transferAmount = 200000000; // 200 USDC (200,000,000 = $200 with 6 decimal places)

    // Direct simple args object
    const args = {
      transaction_type: 0, // TRANSFER
      currency_type: 0, // USDC
      destination_currency_type: 0,
      amount: transferAmount
    };

    // Skip the first approach that's expected to fail
    console.log("Attempting cross-wallet transfer...");
    
    // Perform the transfer between different wallets
    const transferSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: walletComponent.programId },    // source_wallet
        ],
      }, {
        entity: entity2Pda,
        components: [
          { componentId: walletComponent.programId },    // destination_wallet
        ],
      }, {
        entity: entityPda,
        components: [
          { componentId: priceComponent.programId },     // source_price
          { componentId: priceComponent.programId },     // destination_price
        ],
      }],
      args: args,
    });
    
    const txSign = await provider.sendAndConfirm(transferSystem.transaction);
    console.log(`Applied economy system to transfer USDC. Signature: ${txSign}`);

    // Check that the wallets have been updated correctly
    const wallet1After = await walletComponent.account.wallet.fetch(walletComponentPda);
    const wallet2After = await walletComponent.account.wallet.fetch(wallet2ComponentPda);
    
    console.log(`Final wallet1 balance: ${wallet1After.usdcBalance.toNumber()/1000000} USDC (expected ${(wallet1Before.usdcBalance.toNumber() - transferAmount)/1000000})`);
    console.log(`Final wallet2 balance: ${wallet2After.usdcBalance.toNumber()/1000000} USDC (expected ${(wallet2Before.usdcBalance.toNumber() + transferAmount)/1000000})`);
    
    expect(wallet1After.usdcBalance.toNumber()).to.equal(wallet1Before.usdcBalance.toNumber() - transferAmount);
    expect(wallet2After.usdcBalance.toNumber()).to.equal(wallet2Before.usdcBalance.toNumber() + transferAmount);
  });

  it("Set up price components for exchange testing", async () => {
    // This test is superseded by the PriceActionSystem initialization
    // We'll keep it for reference but won't rely on its assertions
    
    // For USDC price component
    const usdcPriceArgs = {
      transaction_type: TRANSACTION_TYPE.INITIALIZE,
      currency_type: CURRENCY_TYPE.USDC,
      destination_currency_type: CURRENCY_TYPE.USDC,
      amount: 100000 // $1.00 (scaled by 100000 for precision)
    };

    // Initialize USDC price component
    const usdcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: walletComponent.programId },      // source_wallet
          { componentId: walletComponent.programId },      // destination_wallet
          { componentId: priceComponent.programId },       // source_price (this is the one we're initializing)
          { componentId: priceComponent.programId },       // destination_price
        ],
      }],
      args: usdcPriceArgs,
    });
    
    await provider.sendAndConfirm(usdcPriceSystem.transaction);
    
    // For BTC price component
    const btcPriceArgs = {
      transaction_type: TRANSACTION_TYPE.INITIALIZE,
      currency_type: CURRENCY_TYPE.BTC,
      destination_currency_type: CURRENCY_TYPE.BTC,
      amount: 6000000000 // $60,000.00 (scaled by 100000 for precision)
    };
    
    // Initialize BTC price component
    const btcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemEconomy.programId,
      world: worldPda,
      entities: [{
        entity: entity2Pda,
        components: [
          { componentId: walletComponent.programId },      // source_wallet
          { componentId: walletComponent.programId },      // destination_wallet
          { componentId: priceComponent.programId },       // source_price (this is the one we're initializing)
          { componentId: priceComponent.programId },       // destination_price
        ],
      }],
      args: btcPriceArgs,
    });
    
    await provider.sendAndConfirm(btcPriceSystem.transaction);

    // Fetch the price components to verify initialization
    const usdcPrice = await priceComponent.account.price.fetch(priceComponentPda);
    const btcPrice = await priceComponent.account.price.fetch(priceBtcComponentPda);

    // Log the updated state
    console.log(`USDC price component initialized with price: ${usdcPrice.currentPrice.toNumber()}`);
    console.log(`BTC price component initialized with price: ${btcPrice.currentPrice.toNumber()}`);
    
    // Skip assertions as we'll rely on PriceActionSystem initialization
  });

  it("Initialize price components using PriceActionSystem", async () => {
    // Import the PriceAction system once it's created
    const systemPriceAction = anchor.workspace.PriceAction;
    
    console.log("Initializing USDC price component with PriceActionSystem...");
    
    // Initialize price for USDC with proper parameters
    const initUsdcPriceArgs = {
      operation_type: 0, // INITIALIZE operation
      currency_type: CURRENCY_TYPE.USDC,
      price: 1000000, // $1.00 (using 6 decimal places: 1,000,000 = $1)
      min_price: 950000, // $0.95
      max_price: 1050000, // $1.05
      volatility: 100, // 1% volatility (in basis points)
      update_frequency: 3600 // Update once per hour (in seconds)
    };
    
    // Apply the PriceAction system to initialize price
    const initUsdcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemPriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: priceComponent.programId }, // The price component to initialize
        ],
      }],
      args: initUsdcPriceArgs,
    });
    
    await provider.sendAndConfirm(initUsdcPriceSystem.transaction);
    
    // Initialize price for BTC with proper parameters
    console.log("Initializing BTC price component with PriceActionSystem...");
    
    const initBtcPriceArgs = {
      operation_type: 0, // INITIALIZE operation
      currency_type: CURRENCY_TYPE.BTC,
      price: 60000000000, // $60,000.00 (using 6 decimal places: 1,000,000 = $1)
      min_price: 30000000000, // $30,000
      max_price: 90000000000, // $90,000
      volatility: 2000, // 20% volatility (in basis points)
      update_frequency: 3600 // Update once per hour (in seconds)
    };
    
    // Apply the PriceAction system to initialize BTC price
    const initBtcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemPriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entity2Pda,
        components: [
          { componentId: priceComponent.programId }, // The BTC price component to initialize
        ],
      }],
      args: initBtcPriceArgs,
    });
    
    await provider.sendAndConfirm(initBtcPriceSystem.transaction);
    
    // Verify prices were set correctly
    const usdcPrice = await priceComponent.account.price.fetch(priceComponentPda);
    const btcPrice = await priceComponent.account.price.fetch(priceBtcComponentPda);
    
    console.log(`USDC price initialized to: ${usdcPrice.currentPrice.toNumber()} (${usdcPrice.currentPrice.toNumber()/1000000} USD)`);
    console.log(`BTC price initialized to: ${btcPrice.currentPrice.toNumber()} (${btcPrice.currentPrice.toNumber()/1000000} USD)`);
    
    expect(usdcPrice.currentPrice.toNumber()).to.equal(1000000); // $1.00
    expect(usdcPrice.minPrice.toNumber()).to.equal(950000); // $0.95
    expect(usdcPrice.maxPrice.toNumber()).to.equal(1050000); // $1.05
    expect(usdcPrice.priceType).to.equal(CURRENCY_TYPE.USDC);
    expect(usdcPrice.volatility).to.equal(100);
    
    expect(btcPrice.currentPrice.toNumber()).to.equal(60000000000); // $60,000.00
    expect(btcPrice.minPrice.toNumber()).to.equal(30000000000); // $30,000.00
    expect(btcPrice.maxPrice.toNumber()).to.equal(90000000000); // $90,000.00
    expect(btcPrice.priceType).to.equal(CURRENCY_TYPE.BTC);
    expect(btcPrice.volatility).to.equal(2000);
  });

  it("Enable price updates using PriceActionSystem", async () => {
    // Import the PriceAction system once it's created
    const systemPriceAction = anchor.workspace.PriceAction;
    
    // After we've initialized the price components, we need to enable price updates
    // First check that they are currently disabled
    const usdcPriceBefore = await priceComponent.account.price.fetch(priceComponentPda);
    expect(usdcPriceBefore.priceUpdatesEnabled).to.equal(false);
    
    console.log("Enabling price updates for USDC price component...");
    
    // Enable price updates for USDC
    const enablePriceArgs = {
      operation_type: 1, // ENABLE operation
      currency_type: CURRENCY_TYPE.USDC,
      price: 1000000, // $1.00 (not used for ENABLE operation)
      min_price: 500000, // $0.50 (not used for ENABLE operation)
      max_price: 1500000, // $1.50 (not used for ENABLE operation)
      volatility: 500, // 5% (not used for ENABLE operation)
      update_frequency: 3600 // 1 hour in seconds (not used for ENABLE operation)
    };
    
    // Apply the PriceAction system to enable price updates
    const enablePriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemPriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: priceComponent.programId }, // The price component to enable
        ],
      }],
      args: enablePriceArgs,
    });
    
    await provider.sendAndConfirm(enablePriceSystem.transaction);
    
    // Check that price updates are now enabled
    const usdcPriceAfter = await priceComponent.account.price.fetch(priceComponentPda);
    expect(usdcPriceAfter.priceUpdatesEnabled).to.equal(true);
    
    console.log("Successfully enabled price updates for USDC price component");
    
    // Do the same for BTC
    console.log("Enabling price updates for BTC price component...");
    
    const enableBtcPriceArgs = {
      operation_type: 1, // ENABLE operation
      currency_type: CURRENCY_TYPE.BTC,
      price: 60000000000, // $60,000.00 (not used for ENABLE operation)
      min_price: 30000000000, // $30,000.00 (not used for ENABLE operation)
      max_price: 90000000000, // $90,000.00 (not used for ENABLE operation)
      volatility: 2000, // 20% (not used for ENABLE operation)
      update_frequency: 3600 // 1 hour in seconds (not used for ENABLE operation)
    };
    
    // Apply the PriceAction system to enable price updates for BTC
    const enableBtcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemPriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entity2Pda,
        components: [
          { componentId: priceComponent.programId }, // The BTC price component to enable
        ],
      }],
      args: enableBtcPriceArgs,
    });
    
    await provider.sendAndConfirm(enableBtcPriceSystem.transaction);
    
    // Check that price updates are now enabled for BTC
    const btcPriceAfter = await priceComponent.account.price.fetch(priceBtcComponentPda);
    expect(btcPriceAfter.priceUpdatesEnabled).to.equal(true);
    
    console.log("Successfully enabled price updates for BTC price component");
  });

  it("Update prices using PriceActionSystem", async () => {
    // Import the PriceAction system once it's created
    const systemPriceAction = anchor.workspace.PriceAction;
    
    // Get price before update
    const usdcPriceBefore = await priceComponent.account.price.fetch(priceComponentPda);
    console.log(`USDC price before update: ${usdcPriceBefore.currentPrice.toNumber()} (${usdcPriceBefore.currentPrice.toNumber()/1000000} USD)`);
    
    console.log("Updating USDC price...");
    
    // Update price for USDC
    const updatePriceArgs = {
      operation_type: 2, // UPDATE operation
      currency_type: CURRENCY_TYPE.USDC,
      price: 0, // Not used directly for update, calculated by the system
      min_price: 0, // Not used for UPDATE operation
      max_price: 0, // Not used for UPDATE operation
      volatility: 0, // Not used for UPDATE operation
      update_frequency: 0 // Not used for UPDATE operation
    };
    
    // Apply the PriceAction system to update price
    const updatePriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemPriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: priceComponent.programId }, // The price component to update
        ],
      }],
      args: updatePriceArgs,
    });
    
    await provider.sendAndConfirm(updatePriceSystem.transaction);
    
    // Check that price has been updated
    const usdcPriceAfter = await priceComponent.account.price.fetch(priceComponentPda);
    console.log(`USDC price after update: ${usdcPriceAfter.currentPrice.toNumber()} (${usdcPriceAfter.currentPrice.toNumber()/1000000} USD)`);
    
    // Verify price has been updated
    expect(usdcPriceAfter.currentPrice.toNumber()).to.not.equal(usdcPriceBefore.currentPrice.toNumber());
    expect(usdcPriceAfter.lastUpdateTime.toNumber()).to.be.greaterThan(usdcPriceBefore.lastUpdateTime.toNumber());
    
    // Do the same for BTC
    const btcPriceBefore = await priceComponent.account.price.fetch(priceBtcComponentPda);
    console.log(`BTC price before update: ${btcPriceBefore.currentPrice.toNumber()} (${btcPriceBefore.currentPrice.toNumber()/1000000} USD)`);
    
    console.log("Updating BTC price...");
    
    // Update price for BTC
    const updateBtcPriceArgs = {
      operation_type: 2, // UPDATE operation
      currency_type: CURRENCY_TYPE.BTC,
      price: 0, // Not used directly for update, calculated by the system
      min_price: 0, // Not used for UPDATE operation
      max_price: 0, // Not used for UPDATE operation
      volatility: 0, // Not used for UPDATE operation
      update_frequency: 0 // Not used for UPDATE operation
    };
    
    // Apply the PriceAction system to update BTC price
    const updateBtcPriceSystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemPriceAction.programId,
      world: worldPda,
      entities: [{
        entity: entity2Pda,
        components: [
          { componentId: priceComponent.programId }, // The BTC price component to update
        ],
      }],
      args: updateBtcPriceArgs,
    });
    
    await provider.sendAndConfirm(updateBtcPriceSystem.transaction);
    
    // Check that BTC price has been updated
    const btcPriceAfter = await priceComponent.account.price.fetch(priceBtcComponentPda);
    console.log(`BTC price after update: ${btcPriceAfter.currentPrice.toNumber()} (${btcPriceAfter.currentPrice.toNumber()/1000000} USD)`);
    
    // Verify BTC price has been updated and price history has been recorded
    expect(btcPriceAfter.currentPrice.toNumber()).to.not.equal(btcPriceBefore.currentPrice.toNumber());
    expect(btcPriceAfter.lastUpdateTime.toNumber()).to.be.greaterThan(btcPriceBefore.lastUpdateTime.toNumber());
    expect(btcPriceAfter.historyIndex).to.be.greaterThan(btcPriceBefore.historyIndex);
    
    console.log("Successfully updated prices for both USDC and BTC");
  });

  it("Exchange USDC for BTC", async () => {
    try {
      // First fetch wallet balances before exchange
      const walletBefore = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`Wallet before exchange: USDC=${walletBefore.usdcBalance.toNumber()/1000000} USD, BTC=${walletBefore.btcBalance.toNumber()/1000000} USD`);
      
      // Also fetch price components to confirm their state
      const usdcPrice = await priceComponent.account.price.fetch(priceComponentPda);
      const btcPrice = await priceComponent.account.price.fetch(priceBtcComponentPda);
      
      console.log(`USDC price component: price=${usdcPrice.currentPrice.toNumber()/1000000} USD, type=${usdcPrice.priceType}, enabled=${usdcPrice.priceUpdatesEnabled}`);
      console.log(`BTC price component: price=${btcPrice.currentPrice.toNumber()/1000000} USD, type=${btcPrice.priceType}, enabled=${btcPrice.priceUpdatesEnabled}`);
      
      // Now attempt the exchange with 100 USDC to BTC
      // Using 6 decimal places standard: 1,000,000 = $1
      const exchangeAmount = 100000000; // 100 USDC = $100.00
      console.log(`Attempting to exchange ${exchangeAmount/1000000} USDC for BTC...`);
      
      const exchangeArgs = {
        transaction_type: TRANSACTION_TYPE.EXCHANGE,
        currency_type: CURRENCY_TYPE.USDC,
        destination_currency_type: CURRENCY_TYPE.BTC,
        amount: exchangeAmount
      };

      // Note: The critical part is correctly structuring the entities and components
      // For exchange, we need:
      // 1. The source wallet (with USDC) 
      // 2. The USDC price component
      // 3. The BTC price component
      const exchangeSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemEconomy.programId,
        world: worldPda,
        entities: [
          {
            entity: entityPda,
            components: [
              { componentId: walletComponent.programId },   // source_wallet and destination_wallet (same wallet)
              { componentId: walletComponent.programId },   // We need both for the economy system [INC: this is the actual used based on the same-wallet issue in bolt]
              { componentId: priceComponent.programId },    // USDC price
            ],
          },
          {
            entity: entity2Pda,
            components: [
              { componentId: priceComponent.programId },    // BTC price
            ],
          }
        ],
        args: exchangeArgs,
      });
      
      const txSign = await provider.sendAndConfirm(exchangeSystem.transaction);
      console.log(`Exchange transaction signature: ${txSign}`);

      // Check results
      const walletAfter = await walletComponent.account.wallet.fetch(walletComponentPda);
      console.log(`Wallet after exchange: USDC=${walletAfter.usdcBalance.toNumber()/1000000} USD, BTC=${walletAfter.btcBalance.toNumber()/1000000} USD`);
      
      // Verify USDC decreased
      expect(walletAfter.usdcBalance.toNumber()).to.be.lessThan(walletBefore.usdcBalance.toNumber());
      // Verify BTC increased
      expect(walletAfter.btcBalance.toNumber()).to.be.greaterThan(walletBefore.btcBalance.toNumber());
      
      // Calculate expected exchange results for informational purposes
      const exchangeRate = btcPrice.currentPrice.toNumber() / usdcPrice.currentPrice.toNumber();
      const expectedBtcAmount = Math.floor((exchangeAmount / exchangeRate) * 0.99); // 1% fee
      console.log(`Exchange rate: 1 BTC = ${exchangeRate} USDC (${exchangeRate/1000000} USD)`);
      console.log(`Expected BTC amount: ~${expectedBtcAmount} (${expectedBtcAmount/1000000} USD)`);
      console.log(`Actual BTC received: ${walletAfter.btcBalance.toNumber() - walletBefore.btcBalance.toNumber()} (${(walletAfter.btcBalance.toNumber() - walletBefore.btcBalance.toNumber())/1000000} USD)`);
      
    } catch (error) {
      console.error("Exchange test failed with error:", error);
      console.error("Error logs:", error.transactionLogs);
      expect.fail(`Exchange should have succeeded but failed: ${error}`);
    }
  });

  it("Apply movement system", async () => {
    // Check that the component has been initialized and x is 0
    const positionBefore = await positionComponent.account.position.fetch(
      positionComponentPda
    );
    expect(positionBefore.x.toNumber()).to.equal(0);

    // Run the movement system
    const applySystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemMovement.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [{ componentId: positionComponent.programId }],
      }]
    });
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`Applied a system. Signature: ${txSign}`);

    // Check that the system has been applied and x is > 0
    const positionAfter = await positionComponent.account.position.fetch(
      positionComponentPda
    );
    expect(positionAfter.x.toNumber()).to.gt(0);
  });

});
