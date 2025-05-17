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
import { ResourceProduction } from "../target/types/resource_production";
import { Upgrade } from "../target/types/upgrade";
import { Staking } from "../target/types/staking";
import { Market } from "../target/types/market";
import { AssignOwnership } from "../target/types/assign_ownership";
import { PriceAction } from "../target/types/price_action";
import { LotteryPrize } from "../target/types/lottery_prize";
import { Lottery } from "../target/types/lottery";
import {
    InitializeNewWorld,
    AddEntity,
    InitializeComponent,
    ApplySystem,
    Program
} from "@magicblock-labs/bolt-sdk"
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";

describe("YieldWars Integration Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  console.log("\tProvider initialized");
  console.log("\tProvider wallet:", provider.wallet.publicKey.toBase58());
  console.log("\tProvider connection:", provider.connection.rpcEndpoint);

  // Shared test state
  let worldPda: PublicKey;
  let entityMap: Map<string, PublicKey> = new Map();
  let componentMap: Map<string, PublicKey> = new Map();

  // Program references
  const positionComponent = anchor.workspace.Position as Program<Position>;
  const systemMovement = anchor.workspace.Movement as Program<Movement>;
  const walletComponent = anchor.workspace.Wallet as Program<Wallet>;
  const ownershipComponent = anchor.workspace.Ownership as Program<Ownership>;
  const productionComponent = anchor.workspace.Production as Program<Production>;
  const upgradeableComponent = anchor.workspace.Upgradeable as Program<Upgradeable>;
  const stakeableComponent = anchor.workspace.Stakeable as Program<Stakeable>;
  const priceComponent = anchor.workspace.Price as Program<Price>;
  const systemEconomy = anchor.workspace.Economy as Program<Economy>;
  const systemResourceProduction = anchor.workspace.ResourceProduction as Program<ResourceProduction>;
  const systemUpgrade = anchor.workspace.Upgrade as Program<Upgrade>;
  const systemStaking = anchor.workspace.Staking as Program<Staking>;
  const systemMarket = anchor.workspace.Market as Program<Market>;
  const systemAssignOwnership = anchor.workspace.AssignOwnership as Program<AssignOwnership>;
  const systemPriceAction = anchor.workspace.PriceAction as Program<PriceAction>;
  const lotteryPrizeComponent = anchor.workspace.LotteryPrize as Program<LotteryPrize>;
  const systemLottery = anchor.workspace.Lottery as Program<Lottery>;

  // Constants
  const ENTITY_TYPE = {
    PLAYER: 0,
    GPU: 1,
    DATA_CENTER: 2,
    LAND: 3,
    ENERGY_CONTRACT: 4,
    UNKNOWN: 255
  };

  const CURRENCY_TYPE = {
    USDC: 0,
    BTC: 1,
    ETH: 2,
    SOL: 3,
    AIFI: 4
  };

  const TRANSACTION_TYPE = {
    TRANSFER: 0,
    EXCHANGE: 1,
    INITIALIZE: 2
  };

  // Utility functions
  
  /**
   * Sets up a test world with basic entities
   */
  async function setupTestWorld() {
    // Initialize a new world
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    console.log(`\tInitialized a new world (ID=${worldPda}). Signature: ${txSign}`);
    
    return worldPda;
  }
  
  /**
   * Creates a new entity and adds it to the entity map
   * @param name Identifier for the entity
   */
  async function createEntity(name: string) {
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    const entityPda = addEntity.entityPda;
    
    // Store in map for easy access
    entityMap.set(name, entityPda);
    
    console.log(`\tCreated entity "${name}" (ID=${entityPda}). Signature: ${txSign}`);
    return entityPda;
  }
  
  /**
   * Adds a component to an entity and saves its PDA in the component map
   * @param entityName Name of the entity to add the component to
   * @param componentType The component program
   * @param componentName Identifier for the component
   */
  async function addComponent(entityName: string, componentType: any, componentName: string) {
    const entityPda = entityMap.get(entityName);
    if (!entityPda) {
      throw new Error(`Entity "${entityName}" not found`);
    }
    
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: componentType.programId,
    });
    
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    const componentPda = initializeComponent.componentPda;
    
    // Store in map for easy access
    componentMap.set(`${entityName}.${componentName}`, componentPda);
    
    console.log(`\tAdded ${componentName} component to "${entityName}". Signature: ${txSign}`);
    return componentPda;
  }
  
  /**
   * Set up wallet with initial USDC funds
   * @param entityName Name of the entity to set up the wallet for
   * @param usdcAmount Amount of USDC to initialize (in standard units)
   */
  async function setupWalletWithFunds(entityName: string, usdcAmount: number) {
    const entityPda = entityMap.get(entityName);
    if (!entityPda) {
      throw new Error(`Entity "${entityName}" not found`);
    }
    
    // Add wallet component if it doesn't exist
    let walletPda = componentMap.get(`${entityName}.wallet`);
    
    if (!walletPda) {
      walletPda = await addComponent(entityName, walletComponent, "wallet");
    }
    
    // Add price component for transactions if it doesn't exist
    let pricePda = componentMap.get(`${entityName}.price`);
    
    if (!pricePda) {
      pricePda = await addComponent(entityName, priceComponent, "price");
    }
    
    // Calculate USDC amount in raw units (6 decimal places)
    const rawUsdcAmount = usdcAmount * 1000000;
    
    // Initialize wallet with funds
    const args = {
      transaction_type: TRANSACTION_TYPE.INITIALIZE,
      currency_type: CURRENCY_TYPE.USDC,
      destination_currency_type: CURRENCY_TYPE.USDC,
      amount: rawUsdcAmount
    };
    
    const applySystem = await ApplySystem({
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
      args: args,
    });
    
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`\tInitialized wallet for "${entityName}" with ${usdcAmount} USDC. Signature: ${txSign}`);
    
    return walletPda;
  }
  
  /**
   * Set up price components for currencies
   * @param entityName Name of the entity to set up price components for
   * @param currencies Array of currency types to set up price components for
   * @param prices Array of prices for each currency (in USD)
   */
  async function setupPriceComponents(entityName: string, currencies: number[], prices: number[]) {
    const entityPda = entityMap.get(entityName);
    if (!entityPda) {
      throw new Error(`Entity "${entityName}" not found`);
    }
    
    if (currencies.length !== prices.length) {
      throw new Error("Currencies and prices arrays must have the same length");
    }
    
    const results = [];
    
    for (let i = 0; i < currencies.length; i++) {
      const currency = currencies[i];
      const price = prices[i];
      
      // Add price component if it doesn't exist
      const componentName = `price.${currency}`;
      let pricePda = componentMap.get(`${entityName}.${componentName}`);
      
      if (!pricePda) {
        pricePda = await addComponent(entityName, priceComponent, componentName);
      }
      
      // Initialize the price component
      const initArgs = {
        operation_type: 0, // INITIALIZE
        currency_type: currency,
        price: price * 1000000, // Convert to raw units (6 decimal places)
        min_price: price * 0.8 * 1000000, // 80% of price as minimum
        max_price: price * 1.2 * 1000000, // 120% of price as maximum
        volatility: 500, // 5% volatility
        update_frequency: 3600 // Update once per hour
      };
      
      const applySystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: entityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: initArgs,
      });
      
      const txSign = await provider.sendAndConfirm(applySystem.transaction);
      console.log(`\tInitialized price component for currency ${currency} at $${price}. Signature: ${txSign}`);
      
      // Enable price updates
      const enableArgs = {
        operation_type: 1, // ENABLE
        currency_type: currency,
        price: 0, // Not used for enable operation
        min_price: 0,
        max_price: 0,
        volatility: 0,
        update_frequency: 0
      };
      
      const enableSystem = await ApplySystem({
        authority: provider.wallet.publicKey,
        systemId: systemPriceAction.programId,
        world: worldPda,
        entities: [{
          entity: entityPda,
          components: [
            { componentId: priceComponent.programId },
          ],
        }],
        args: enableArgs,
      });
      
      const enableTxSign = await provider.sendAndConfirm(enableSystem.transaction);
      console.log(`\tEnabled price updates for currency ${currency}. Signature: ${enableTxSign}`);
      
      results.push(pricePda);
    }
    
    return results;
  }
  
  /**
   * Set up a production entity (like a GPU)
   * @param entityName Name of the entity to set up as a production entity
   * @param entityType Type of the entity (ENTITY_TYPE.GPU, etc.)
   * @param usdcPerHour USDC production rate per hour
   * @param aifiPerHour AiFi production rate per hour
   */
  async function setupProductionEntity(entityName: string, entityType: number, usdcPerHour: number, aifiPerHour: number) {
    const entityPda = entityMap.get(entityName);
    if (!entityPda) {
      throw new Error(`Entity "${entityName}" not found`);
    }
    
    // Add production component if it doesn't exist
    let productionPda = componentMap.get(`${entityName}.production`);
    
    if (!productionPda) {
      productionPda = await addComponent(entityName, productionComponent, "production");
    }
    
    // Initialize the production component
    const now = Math.floor(Date.now() / 1000);
    const args = {
      operation_type: 0, // INITIALIZE
      usdc_per_hour: usdcPerHour * 1000000, // Convert to raw units (6 decimal places)
      aifi_per_hour: aifiPerHour * 1000000, // Convert to raw units (6 decimal places)
      last_collection_time: now,
      efficiency_multiplier: 10000, // 100% efficiency (basis points)
      producer_type: entityType,
      level: 1,
      is_active: true,
      operating_cost: 0,
    };
    
    const applySystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: systemResourceProduction.programId,
      world: worldPda,
      entities: [{
        entity: entityPda,
        components: [
          { componentId: productionComponent.programId },
        ],
      }],
      args: args,
    });
    
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`\tInitialized production entity "${entityName}" with ${usdcPerHour} USDC/hr and ${aifiPerHour} AiFi/hr. Signature: ${txSign}`);
    
    return productionPda;
  }
  
  /**
   * Verify wallet balances match expected values
   * @param entityName Name of the entity to verify wallet balances for
   * @param expectedBalances Object with expected balances for each currency
   */
  async function verifyWalletBalances(entityName: string, expectedBalances: { usdc?: number, btc?: number, eth?: number, sol?: number, aifi?: number }) {
    const walletPda = componentMap.get(`${entityName}.wallet`);
    if (!walletPda) {
      throw new Error(`Wallet component for "${entityName}" not found`);
    }
    
    const walletData = await walletComponent.account.wallet.fetch(walletPda);
    
    if (expectedBalances.usdc !== undefined) {
      const actualUsdc = Number(walletData.usdcBalance) / 1000000;
      expect(actualUsdc).to.be.closeTo(expectedBalances.usdc, 0.001, `USDC balance for ${entityName} should be ${expectedBalances.usdc}`);
    }
    
    if (expectedBalances.btc !== undefined) {
      const actualBtc = Number(walletData.btcBalance) / 1000000;
      expect(actualBtc).to.be.closeTo(expectedBalances.btc, 0.001, `BTC balance for ${entityName} should be ${expectedBalances.btc}`);
    }
    
    if (expectedBalances.eth !== undefined) {
      const actualEth = Number(walletData.ethBalance) / 1000000;
      expect(actualEth).to.be.closeTo(expectedBalances.eth, 0.001, `ETH balance for ${entityName} should be ${expectedBalances.eth}`);
    }
    
    if (expectedBalances.sol !== undefined) {
      const actualSol = Number(walletData.solBalance) / 1000000;
      expect(actualSol).to.be.closeTo(expectedBalances.sol, 0.001, `SOL balance for ${entityName} should be ${expectedBalances.sol}`);
    }
    
    if (expectedBalances.aifi !== undefined) {
      const actualAifi = Number(walletData.aifiBalance) / 1000000;
      expect(actualAifi).to.be.closeTo(expectedBalances.aifi, 0.001, `AiFi balance for ${entityName} should be ${expectedBalances.aifi}`);
    }
    
    console.log(`\tVerified wallet balances for "${entityName}".`);
  }
  
  /**
   * Verify entity ownership
   * @param ownerEntityName Name of the owner entity
   * @param ownedEntityName Name of the owned entity
   * @param shouldBeOwned Whether the entity should be owned by the owner
   */
  async function verifyOwnership(ownerEntityName: string, ownedEntityName: string, shouldBeOwned: boolean) {
    const ownershipPda = componentMap.get(`${ownerEntityName}.ownership`);
    if (!ownershipPda) {
      throw new Error(`Ownership component for "${ownerEntityName}" not found`);
    }
    
    const ownedEntityPda = entityMap.get(ownedEntityName);
    if (!ownedEntityPda) {
      throw new Error(`Entity "${ownedEntityName}" not found`);
    }
    
    const ownershipData = await ownershipComponent.account.ownership.fetch(ownershipPda);
    
    // Check if the owned entity is in the owned entities list
    const isOwned = ownershipData.ownedEntities.some(entityPubkey => 
      entityPubkey.toBase58() === ownedEntityPda.toBase58()
    );
    
    if (shouldBeOwned) {
      expect(isOwned).to.be.true(`Entity "${ownedEntityName}" should be owned by "${ownerEntityName}"`);
    } else {
      expect(isOwned).to.be.false(`Entity "${ownedEntityName}" should not be owned by "${ownerEntityName}"`);
    }
    
    console.log(`\tVerified ownership for "${ownedEntityName}" by "${ownerEntityName}": ${isOwned}`);
  }
  
  /**
   * Verify production state
   * @param entityName Name of the entity to verify production state for
   * @param expectedState Expected production state
   */
  async function verifyProductionState(entityName: string, expectedState: { isActive?: boolean, level?: number, usdcPerHour?: number, aifiPerHour?: number }) {
    const productionPda = componentMap.get(`${entityName}.production`);
    if (!productionPda) {
      throw new Error(`Production component for "${entityName}" not found`);
    }
    
    const productionData = await productionComponent.account.production.fetch(productionPda);
    
    if (expectedState.isActive !== undefined) {
      expect(productionData.isActive).to.equal(expectedState.isActive, `Production active state for ${entityName} should be ${expectedState.isActive}`);
    }
    
    if (expectedState.level !== undefined) {
      expect(productionData.level).to.equal(expectedState.level, `Production level for ${entityName} should be ${expectedState.level}`);
    }
    
    if (expectedState.usdcPerHour !== undefined) {
      const actualUsdcPerHour = Number(productionData.usdcPerHour) / 1000000;
      expect(actualUsdcPerHour).to.be.closeTo(expectedState.usdcPerHour, 0.001, `USDC per hour for ${entityName} should be ${expectedState.usdcPerHour}`);
    }
    
    if (expectedState.aifiPerHour !== undefined) {
      const actualAifiPerHour = Number(productionData.aifiPerHour) / 1000000;
      expect(actualAifiPerHour).to.be.closeTo(expectedState.aifiPerHour, 0.001, `AiFi per hour for ${entityName} should be ${expectedState.aifiPerHour}`);
    }
    
    console.log(`\tVerified production state for "${entityName}".`);
  }
  
  // Setup before all tests
  before(async () => {
    worldPda = await setupTestWorld();
  });

  describe("System Interaction Tests", () => {
    // Setup before system interaction tests
    beforeEach(async () => {
      // Clear entity and component maps before each test category
      entityMap.clear();
      componentMap.clear();
      
      // Setup world if needed
      if (!worldPda) {
        worldPda = await setupTestWorld();
      }
    });
    
    describe("Economy & PriceAction Integration", () => {
      it("should exchange currency with initialized prices", async () => {
        // Create Player entity with wallet
        await createEntity("player");
        await setupWalletWithFunds("player", 1000); // Give 1000 USDC
        
        // Create a price entity for BTC
        await createEntity("priceEntity");
        
        // Initialize USDC price component
        await addComponent("player", priceComponent, "price.usdc");
        
        // Initialize BTC price component
        const btcPricePda = await addComponent("priceEntity", priceComponent, "price.btc");
        
        // Initialize USDC price to $1
        const initUsdcPriceArgs = {
          operation_type: 0, // INITIALIZE
          currency_type: CURRENCY_TYPE.USDC,
          price: 1000000, // $1.00 (1,000,000 = $1 with 6 decimal places)
          min_price: 950000, // $0.95
          max_price: 1050000, // $1.05
          volatility: 100, // 1% volatility
          update_frequency: 3600 // Update once per hour
        };
        
        let applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: initUsdcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tInitialized USDC price component");
        
        // Initialize BTC price to $50,000
        const initBtcPriceArgs = {
          operation_type: 0, // INITIALIZE
          currency_type: CURRENCY_TYPE.BTC,
          price: 50000000000, // $50,000 (50,000,000,000 = $50,000 with 6 decimal places)
          min_price: 40000000000, // $40,000
          max_price: 60000000000, // $60,000
          volatility: 1000, // 10% volatility
          update_frequency: 3600 // Update once per hour
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: initBtcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tInitialized BTC price component");
        
        // Enable USDC price updates
        const enableUsdcPriceArgs = {
          operation_type: 1, // ENABLE
          currency_type: CURRENCY_TYPE.USDC,
          price: 0, // Not used for ENABLE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: enableUsdcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tEnabled USDC price updates");
        
        // Enable BTC price updates
        const enableBtcPriceArgs = {
          operation_type: 1, // ENABLE
          currency_type: CURRENCY_TYPE.BTC,
          price: 0, // Not used for ENABLE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: enableBtcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tEnabled BTC price updates");
        
        // Exchange 100 USDC for BTC
        const exchangeArgs = {
          transaction_type: TRANSACTION_TYPE.EXCHANGE,
          currency_type: CURRENCY_TYPE.USDC,
          destination_currency_type: CURRENCY_TYPE.BTC,
          amount: 100000000 // 100 USDC
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemEconomy.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: walletComponent.programId }, // source_wallet
              { componentId: walletComponent.programId }, // destination_wallet (same for exchange)
              { componentId: priceComponent.programId },  // source_price (USDC)
            ],
          }, {
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },  // destination_price (BTC)
            ],
          }],
          args: exchangeArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tExchanged 100 USDC for BTC");
        
        // Verify wallet balances
        // Calculate expected BTC amount:
        // (100 USDC * 1,000,000) / 50,000,000,000 = 0.002 BTC
        // With 1% fee: 0.002 * 0.99 = 0.00198 BTC
        // In raw units: 0.00198 * 1,000,000 = 1,980
        await verifyWalletBalances("player", {
          usdc: 900, // 1000 - 100 = 900 USDC
          btc: 0.00198 // Expected BTC amount (~0.00198 BTC)
        });
        
        console.log("\tSuccessfully exchanged currency with initialized prices");
      });
      
      it("should update price and affect exchange rates", async () => {
        // Create Player entity with wallet and funds
        await createEntity("player");
        await setupWalletWithFunds("player", 1000); // Give 1000 USDC
        
        // Create a price entity for ETH
        await createEntity("priceEntity");
        
        // Initialize USDC price component
        await addComponent("player", priceComponent, "price.usdc");
        
        // Initialize ETH price component
        await addComponent("priceEntity", priceComponent, "price.eth");
        
        // Initialize USDC price to $1
        const initUsdcPriceArgs = {
          operation_type: 0, // INITIALIZE
          currency_type: CURRENCY_TYPE.USDC,
          price: 1000000, // $1.00 (1,000,000 = $1 with 6 decimal places)
          min_price: 950000, // $0.95
          max_price: 1050000, // $1.05
          volatility: 100, // 1% volatility
          update_frequency: 3600 // Update once per hour
        };
        
        let applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: initUsdcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tInitialized USDC price component");
        
        // Initialize ETH price to $3,000
        const initEthPriceArgs = {
          operation_type: 0, // INITIALIZE
          currency_type: CURRENCY_TYPE.ETH,
          price: 3000000000, // $3,000 (3,000,000,000 = $3,000 with 6 decimal places)
          min_price: 2000000000, // $2,000
          max_price: 4000000000, // $4,000
          volatility: 1000, // 10% volatility
          update_frequency: 3600 // Update once per hour
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: initEthPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tInitialized ETH price component");
        
        // Enable price updates for both currencies
        const enableUsdcPriceArgs = {
          operation_type: 1, // ENABLE
          currency_type: CURRENCY_TYPE.USDC,
          price: 0, // Not used for ENABLE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: enableUsdcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tEnabled USDC price updates");
        
        const enableEthPriceArgs = {
          operation_type: 1, // ENABLE
          currency_type: CURRENCY_TYPE.ETH,
          price: 0, // Not used for ENABLE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: enableEthPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tEnabled ETH price updates");
        
        // Fetch the initial ETH price for reference
        const ethPriceInitial = await priceComponent.account.price.fetch(
          componentMap.get("priceEntity.price.eth")
        );
        const initialEthPriceValue = ethPriceInitial.currentPrice.toNumber();
        console.log(`\tInitial ETH price: ${initialEthPriceValue/1000000} USD`);
        
        // Exchange 100 USDC for ETH at initial price
        const exchangeArgs1 = {
          transaction_type: TRANSACTION_TYPE.EXCHANGE,
          currency_type: CURRENCY_TYPE.USDC,
          destination_currency_type: CURRENCY_TYPE.ETH,
          amount: 100000000 // 100 USDC
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemEconomy.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: walletComponent.programId }, // source_wallet
              { componentId: walletComponent.programId }, // destination_wallet (same for exchange)
              { componentId: priceComponent.programId },  // source_price (USDC)
            ],
          }, {
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },  // destination_price (ETH)
            ],
          }],
          args: exchangeArgs1,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tExchanged 100 USDC for ETH at initial price");
        
        // Calculate expected ETH at initial price:
        // (100 USDC * 1,000,000) / 3,000,000,000 = 0.0333 ETH
        // With 1% fee: 0.0333 * 0.99 = 0.03297 ETH
        // Get actual ETH balance
        const walletAfterFirstExchange = await walletComponent.account.wallet.fetch(
          componentMap.get("player.wallet")
        );
        const ethAfterFirstExchange = walletAfterFirstExchange.ethBalance.toNumber() / 1000000;
        console.log(`\tETH balance after first exchange: ${ethAfterFirstExchange} ETH`);
        
        // Now update the ETH price
        const updateEthPriceArgs = {
          operation_type: 2, // UPDATE
          currency_type: CURRENCY_TYPE.ETH,
          price: 0, // Not used for UPDATE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: updateEthPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tUpdated ETH price");
        
        // Check the updated ETH price
        const ethPriceAfterUpdate = await priceComponent.account.price.fetch(
          componentMap.get("priceEntity.price.eth")
        );
        const updatedEthPriceValue = ethPriceAfterUpdate.currentPrice.toNumber();
        console.log(`\tUpdated ETH price: ${updatedEthPriceValue/1000000} USD`);
        
        // Exchange another 100 USDC for ETH at the new price
        const exchangeArgs2 = {
          transaction_type: TRANSACTION_TYPE.EXCHANGE,
          currency_type: CURRENCY_TYPE.USDC,
          destination_currency_type: CURRENCY_TYPE.ETH,
          amount: 100000000 // 100 USDC
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemEconomy.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player"),
            components: [
              { componentId: walletComponent.programId }, // source_wallet
              { componentId: walletComponent.programId }, // destination_wallet (same for exchange)
              { componentId: priceComponent.programId },  // source_price (USDC)
            ],
          }, {
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },  // destination_price (ETH)
            ],
          }],
          args: exchangeArgs2,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tExchanged 100 USDC for ETH at updated price");
        
        // Get final wallet state
        const walletAfterSecondExchange = await walletComponent.account.wallet.fetch(
          componentMap.get("player.wallet")
        );
        const ethAfterSecondExchange = walletAfterSecondExchange.ethBalance.toNumber() / 1000000;
        console.log(`\tETH balance after second exchange: ${ethAfterSecondExchange} ETH`);
        
        // Calculate theoretical ETH received in second exchange:
        // (100 USDC * 1,000,000) / [updated ETH price] * 0.99 = X ETH
        const theoreticalSecondExchangeAmount = (100 * 1000000) / updatedEthPriceValue * 0.99;
        const totalTheoreticalEth = ethAfterFirstExchange + theoreticalSecondExchangeAmount;
        
        console.log(`\tTheoretical ETH from second exchange: ${theoreticalSecondExchangeAmount} ETH`);
        console.log(`\tTotal theoretical ETH: ${totalTheoreticalEth} ETH`);
        
        // Verify that the updated price was used for the second exchange
        expect(ethAfterSecondExchange).to.not.equal(ethAfterFirstExchange * 2);
        
        // Verify that the exchange rate was different after price update
        // by checking that the amount is close to our calculated theoretical amount
        expect(ethAfterSecondExchange).to.be.closeTo(totalTheoreticalEth, 0.001);
        
        // Verify final wallet balance
        await verifyWalletBalances("player", {
          usdc: 800, // 1000 - 100 - 100 = 800 USDC
          eth: ethAfterSecondExchange // Exact amount from actual exchange
        });
        
        console.log("\tSuccessfully verified price updates affect exchange rates");
      });
      
      it("should transfer currency between wallets", async () => {
        // Create two player entities with wallets
        await createEntity("player1");
        await createEntity("player2");
        
        // Add wallet components and fund player1
        await setupWalletWithFunds("player1", 1000); // Give 1000 USDC to player1
        await addComponent("player2", walletComponent, "wallet"); // Empty wallet for player2
        
        // Check balance right after setup
        const initialWalletPda = componentMap.get(`player1.wallet`);
        const initialWalletData = await walletComponent.account.wallet.fetch(initialWalletPda);
        console.log(`\tDEBUG: Initial wallet USDC balance: ${Number(initialWalletData.usdcBalance) / 1000000}`);
        
        // Instead of trying to add AiFi directly, we need to exchange USDC for AiFi
        
        // 1. Create a price entity for AiFi
        await createEntity("priceEntity");
        
        // 2. Setup price components for both currencies
        // Initialize USDC price component
        await addComponent("player1", priceComponent, "price.usdc");
        
        // Initialize AiFi price component
        await addComponent("priceEntity", priceComponent, "price.aifi");
        
        // 3. Initialize USDC price to $1
        const initUsdcPriceArgs = {
          operation_type: 0, // INITIALIZE
          currency_type: CURRENCY_TYPE.USDC,
          price: 1000000, // $1.00 (1M = $1)
          min_price: 950000, // $0.95
          max_price: 1050000, // $1.05
          volatility: 100, // 1% volatility
          update_frequency: 3600 // Update once per hour
        };
        
        let applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player1"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: initUsdcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tInitialized USDC price component");
        
        // 4. Initialize AiFi price to $5
        const initAiFiPriceArgs = {
          operation_type: 0, // INITIALIZE
          currency_type: CURRENCY_TYPE.AIFI,
          price: 5000000, // $5.00 (5M = $5)
          min_price: 4000000, // $4.00
          max_price: 6000000, // $6.00
          volatility: 500, // 5% volatility
          update_frequency: 3600 // Update once per hour
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: initAiFiPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tInitialized AiFi price component");
        
        // 5. Enable USDC price updates
        const enableUsdcPriceArgs = {
          operation_type: 1, // ENABLE
          currency_type: CURRENCY_TYPE.USDC,
          price: 0, // Not used for ENABLE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player1"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: enableUsdcPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tEnabled USDC price updates");
        
        // 6. Enable AiFi price updates
        const enableAiFiPriceArgs = {
          operation_type: 1, // ENABLE
          currency_type: CURRENCY_TYPE.AIFI,
          price: 0, // Not used for ENABLE
          min_price: 0,
          max_price: 0,
          volatility: 0,
          update_frequency: 0
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemPriceAction.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },
            ],
          }],
          args: enableAiFiPriceArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tEnabled AiFi price updates");
        
        // 7. Exchange 250 USDC for AiFi
        // At $5 per AiFi and with 1% fee, this should give approximately 49.5 AiFi
        const exchangeArgs = {
          transaction_type: TRANSACTION_TYPE.EXCHANGE,
          currency_type: CURRENCY_TYPE.USDC,
          destination_currency_type: CURRENCY_TYPE.AIFI,
          amount: 250000000 // 250 USDC
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemEconomy.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player1"),
            components: [
              { componentId: walletComponent.programId }, // source_wallet
              { componentId: walletComponent.programId }, // destination_wallet (same for exchange)
              { componentId: priceComponent.programId },  // source_price (USDC)
            ],
          }, {
            entity: entityMap.get("priceEntity"),
            components: [
              { componentId: priceComponent.programId },  // destination_price (AiFi)
            ],
          }],
          args: exchangeArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tExchanged 250 USDC for AiFi");
        
        // Check balance after exchange
        const afterExchangeWalletPda = componentMap.get(`player1.wallet`);
        const afterExchangeWalletData = await walletComponent.account.wallet.fetch(afterExchangeWalletPda);
        console.log(`\tDEBUG: After exchange USDC balance: ${Number(afterExchangeWalletData.usdcBalance) / 1000000}`);
        console.log(`\tDEBUG: After exchange AiFi balance: ${Number(afterExchangeWalletData.aifiBalance) / 1000000}`);
        
        // Verify initial wallet balances (player1 should now have 750 USDC and ~50 AiFi)
        await verifyWalletBalances("player1", {
          usdc: 750, // 1000 - 250 = 750
          aifi: 49.5 // Approximately after 1% fee
        });
        
        await verifyWalletBalances("player2", {
          usdc: 0,
          aifi: 0
        });
        
        // Transfer 200 USDC from player1 to player2
        const transferUsdcArgs = {
          transaction_type: TRANSACTION_TYPE.TRANSFER,
          currency_type: CURRENCY_TYPE.USDC,
          destination_currency_type: CURRENCY_TYPE.USDC, // Not used for transfers
          amount: 200000000 // 200 USDC
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemEconomy.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player1"),
            components: [
              { componentId: walletComponent.programId }, // source_wallet
            ],
          }, {
            entity: entityMap.get("player2"),
            components: [
              { componentId: walletComponent.programId }, // destination_wallet
            ],
          }, {
            entity: entityMap.get("player1"),
            components: [
              { componentId: priceComponent.programId }, // source_price (not used for transfers)
              { componentId: priceComponent.programId }, // destination_price (not used for transfers)
            ],
          }],
          args: transferUsdcArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tTransferred 200 USDC from player1 to player2");
        
        // Verify wallet balances after USDC transfer
        await verifyWalletBalances("player1", {
          usdc: 550, // 750 - 200 = 550
          aifi: 49.5 // Unchanged
        });
        
        await verifyWalletBalances("player2", {
          usdc: 200, // Received 200 USDC
          aifi: 0 // Unchanged
        });
        
        // Transfer 20 AiFi from player1 to player2
        const transferAiFiArgs = {
          transaction_type: TRANSACTION_TYPE.TRANSFER,
          currency_type: CURRENCY_TYPE.AIFI,
          destination_currency_type: CURRENCY_TYPE.AIFI, // Not used for transfers
          amount: 20000000 // 20 AiFi tokens
        };
        
        applySystem = await ApplySystem({
          authority: provider.wallet.publicKey,
          systemId: systemEconomy.programId,
          world: worldPda,
          entities: [{
            entity: entityMap.get("player1"),
            components: [
              { componentId: walletComponent.programId }, // source_wallet
            ],
          }, {
            entity: entityMap.get("player2"),
            components: [
              { componentId: walletComponent.programId }, // destination_wallet
            ],
          }, {
            entity: entityMap.get("player1"),
            components: [
              { componentId: priceComponent.programId }, // source_price (not used for transfers)
              { componentId: priceComponent.programId }, // destination_price (not used for transfers)
            ],
          }],
          args: transferAiFiArgs,
        });
        
        await provider.sendAndConfirm(applySystem.transaction);
        console.log("\tTransferred 20 AiFi from player1 to player2");
        
        // Verify final wallet balances after both transfers
        await verifyWalletBalances("player1", {
          usdc: 550, // 750 - 200 = 550
          aifi: 29.5 // 49.5 - 20 = 29.5
        });
        
        await verifyWalletBalances("player2", {
          usdc: 200, // Received 200 USDC
          aifi: 20 // Received 20 AiFi
        });
        
        console.log("\tSuccessfully verified currency transfers between wallets");
      });
    });
    
    describe("Production & Upgrade Integration", () => {
      it("should change production rates after upgrading", async () => {
        // TODO: Implement this test
        console.log("\tTODO: Implement production rates changing after upgrading test");
      });
      
      it("should collect resources before and after upgrades", async () => {
        // TODO: Implement this test
        console.log("\tTODO: Implement resource collection before and after upgrades test");
      });
      
      it("should deduct operating costs from production", async () => {
        // TODO: Implement this test
        console.log("\tTODO: Implement operating costs deduction from production test");
      });
    });
    
    // Additional system interaction test categories to be implemented
  });

  describe("Transaction Flow Tests", () => {
    // Setup before transaction flow tests
    beforeEach(async () => {
      // Clear entity and component maps before each test category
      entityMap.clear();
      componentMap.clear();
      
      // Setup world if needed
      if (!worldPda) {
        worldPda = await setupTestWorld();
      }
    });
    
    describe("GPU Purchase & Management Flow", () => {
      it("should allow wallet initialization, GPU purchase, upgrading, and production collection", async () => {
        // TODO: Implement this test
        console.log("\tTODO: Implement GPU purchase and management test");
      });
      
      it("should allow wallet initialization, GPU purchase, staking, and rewards collection", async () => {
        // TODO: Implement this test
        console.log("\tTODO: Implement GPU purchase, staking, and rewards collection test");
      });
    });
  });
}); 