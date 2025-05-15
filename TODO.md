# YieldWars Development Tasks

## Implementation Plan

### Phase 1: Project Setup & Infrastructure
- [x] Initialize project repositories for frontend and backend
- [x] Set up Next.js frontend with TypeScript
- [x] Set up Bolt/Anchor backend on Solana
- [x] Configure development environments
  - [x] Create monitoring tools for Bolt/Anchor development
  - [x] Fix hydration errors in wallet components
  - [x] Implement enhanced transaction monitoring for Bolt ECS
- [ ] Set up TypeScript types/interfaces for shared data structures

### Phase 2: Core Entity & Component Development
- [x] Implement Wallet component
  - [x] Define data structure for currency balances
  - [x] Create component using bolt command
  - [x] Add proper documentation
- [x] Implement Ownership component
  - [x] Define entity type enum
  - [x] Create arrays for owned entities and types
  - [x] Add proper documentation
- [x] Implement Production component
  - [x] Define production rates for resources
  - [x] Add efficiency multiplier and operating costs
  - [x] Track production status and collection time
  - [x] Add proper documentation
- [x] Implement Upgradeable component
  - [x] Define upgrade levels and maximum levels
  - [x] Track upgrade costs and cooldowns
  - [x] Add production boost multipliers
  - [x] Add proper documentation
- [x] Implement Stakeable component
  - [x] Define staking status and timing parameters
  - [x] Add reward and penalty rates
  - [x] Track accumulated rewards
  - [x] Add proper documentation
- [x] Implement Price component
  - [x] Define price tracking and history
  - [x] Add market dynamics parameters
  - [x] Implement price bounds and validation
  - [x] Add proper documentation
- [ ] Create entity type definitions and relationships

### Phase 3: System Implementation
- [x] Implement EconomySystem for handling currency transactions
- [x] Implement PriceActionSystem for price initialization and updates
  - [x] Create PriceActionSystem using bolt command
  - [x] Implement price initialization function
  - [x] Implement price update enable/disable function
  - [x] Implement price update function based on market dynamics
  - [x] Implement price history recording
  - [x] Create tests for price initialization and updates
- [x] Implement ProductionSystem for resource generation
  - [x] Create ResourceProductionSystem using bolt command
  - [x] Implement production initialization function
  - [x] Implement resource collection function
  - [x] Implement production activation/deactivation function
  - [x] Implement operating cost management
  - [x] Create tests for production operations and resource collection
- [x] Implement UpgradeSystem for GPU upgrades
  - [x] Create UpgradeSystem using bolt command
  - [x] Implement upgrade initialization function
  - [x] Implement upgrade execution with resource costs
  - [x] Implement production boost application
  - [x] Implement parameter update function
  - [x] Create tests for upgrade operations
- [x] Implement StakingSystem for GPU staking
  - [x] Create StakingSystem using bolt command
  - [x] Implement staking initialization function
  - [x] Implement stake execution function
  - [x] Implement unstake function with potential penalties
  - [x] Implement rewards collection function
  - [x] Implement parameter update function
- [x] Implement MarketSystem for buying/selling assets
  - [x] Create MarketSystem using bolt command
  - [x] Implement listing creation function
  - [x] Implement asset purchase function
  - [x] Implement listing cancellation function
  - [x] Implement listing update function
  - [x] Implement asset transfer function
- [ ] Implement TimerSystem for time-based events

### Phase 4: Frontend Development
- [ ] Create game dashboard UI
- [ ] Implement wallet connection and management
- [ ] Create GPU management interface
- [ ] Implement currency trading interface
- [ ] Create higher-level asset management interface
- [ ] Implement game statistics and visualizations

### Phase 5: Integration & Testing
- [x] Connect frontend to Solana blockchain
- [ ] Implement transaction building and signing
- [x] Set up state synchronization between UI and blockchain
  - [x] Create monitoring tools to visualize blockchain state
  - [x] Implement transaction logs parser for Bolt ECS framework
- [x] Create test for Wallet component
- [x] Create test for Ownership component
  - [x] Implement AssignOwnership system for linking resources to wallets
  - [x] Create tests for assigning, transferring, and removing ownership
  - [x] Implement robust error handling and validation
- [x] Create test for Production component
- [x] Create test for Upgradeable component
- [x] Create test for Stakeable component
- [x] Create test for Price component
- [x] Create test for EconomySystem
- [x] Create test for ResourceProductionSystem
- [x] Create test for UpgradeSystem
- [x] Create test for StakingSystem
- [ ] Create test for MarketSystem - something not working properly - TODO!
- [ ] Create comprehensive testing suite
- [ ] Perform security audits on smart contracts
- [ ] Optimize for performance and user experience

### Phase 6: Deployment & Launch
- [ ] Deploy smart contracts to Solana devnet
- [ ] Conduct beta testing with limited users
- [ ] Fix issues and optimize based on feedback
- [ ] Deploy to Solana mainnet
- [ ] Launch public frontend

### Phase 7: SOAR Leaderboard Integration
- [x] Add SOAR dependencies to project
- [x] Create LeaderboardSystem to calculate player wealth
- [x] Implement wealth calculation function
- [x] Create CPI interface to SOAR program
- [x] Create setup script for game and leaderboard registration
- [ ] Create front-end utilities for SOAR integration
- [ ] Add leaderboard UI component
- [x] Add test for wealth calculation
- [ ] Complete SOAR player registration flow
- [ ] Implement automatic score submission mechanism
- [ ] Integrate leaderboard display in main UI
- [ ] Add player profile display

## Working Notes

### Bolt System Implementation 6-Step Plan
1. Get all necessary context from existing components and system files
2. Use the bolt system command to create the new system (`bolt system [name]`)
3. Ensure the style and patterns of the other systems are consistently followed
4. Add the component dependencies in the system's Cargo.toml file 
5. Add all the necessary unit tests in yield-wars-program.ts
6. Update the TODO.md with any progress or learnings

### Bolt Component Development Workflow
1. Use `bolt component [name]` to create a new component
2. Update the component structure in the generated `lib.rs` file
3. Run `bolt build` to compile the component
4. Update tests in `yield-wars-program.ts` to test the component

### Bolt System Development Workflow
1. Use `bolt system [name]` to create a new system
2. Update the system structure in the generated `lib.rs` file
3. **CRITICAL**: Add component dependencies to the system's `Cargo.toml` file (e.g., `price = { version = "0.2.2", path = "../../components/price", features = ["cpi"] }`)
4. Define required components in the `#[system_input]` struct
5. Implement the `execute` function with structured arguments
6. Run `bolt build` to compile the system
7. Update tests in `yield-wars-program.ts` to test the system
8. Run `bolt test` to execute the tests

### Learning Notes
- When using the Bolt ECS pattern:
  - The `#[component]` macro automatically adds a `bolt_metadata` field to the struct
  - Do not manually add or initialize the `bolt_metadata` field in your code
  - Remove custom constructors if they cause issues with the `bolt_metadata` field
  - Simplify component implementation to data-only structures
  - Put business logic in systems rather than methods on components
  - **IMPORTANT**: Systems cannot have the exact same name as existing components
  - This is why we use "resource-production" instead of just "production" and "price-action" instead of "price"
  - When creating a new system, always check for potential name conflicts with components
  - The PriceActionSystem is named "price-action" to avoid conflict with the "price" component
  - The ResourceProductionSystem is named "resource-production" to avoid conflict with the "production" component

- Currency Standard:
  - All currency values use 6 decimal places, where 1,000,000 = $1
  - This applies to all cryptocurrencies (USDC, BTC, ETH, SOL, AiFi) and all systems
  - Examples:
    - 1,000,000 = $1 USDC
    - 60,000,000,000 = $60,000 BTC
    - 3,000,000,000 = $3,000 ETH
    - 100,000 = $0.10 (10 cents)
  - When commenting code or tests, always clarify the real-world value
  - When calculating exchange rates, ensure decimal places are handled correctly

- PriceActionSystem design:
  - Must support three primary operations: Initialize, Enable, and Update
  - Initialize: Sets initial values for a price component including current price, min/max bounds, and volatility
  - Enable: Turns on price updates for a component by setting the price_updates_enabled flag to true
  - Update: Calculates a new price based on market dynamics, volatility, and trends
  - Uses the same approach as EconomySystem for passing arguments from JavaScript
  - Must handle price history recording by updating the circular buffer
  - Should enforce price bounds to maintain economic stability
  - Needed for any exchange operations as prices must be both initialized and enabled
  - System is named "price-action" to avoid naming conflict with the Price component
  - CRITICAL: Must add the Price component as a dependency in the system's Cargo.toml file
  - Operation type enum values:
    - INITIALIZE = 0: Sets up a price component with initial values
    - ENABLE = 1: Enables price updates for a component
    - UPDATE = 2: Updates a price based on market dynamics

- ResourceProductionSystem design:
  - Supports four primary operations: Initialize, Collect, SetActive, and UpdateRates
  - Initialize: Sets up initial production settings including resource rates, efficiency, and operating costs
  - Collect: Calculates and collects resources based on elapsed time since last collection
  - SetActive: Activates or deactivates production with automatic timestamp updates
  - UpdateRates: Modifies production rates and efficiency multipliers
  - Critical to ensure resources are collected using the same time unit (seconds) but converted properly to hours
  - Uses efficiency multiplier where 10000 = 100% (same as other percentage values in the system)
  - Handles operating costs that are deducted from production profits
  - Deactivates production automatically if operating costs cannot be covered
  - Maintains the 6-decimal standard for all currency operations
  - Operation type enum values:
    - INITIALIZE = 0: Sets up production settings
    - COLLECT = 1: Collects produced resources
    - SET_ACTIVE = 2: Activates or deactivates production
    - UPDATE_RATES = 3: Updates production rates and parameters
  - System is named "resource-production" to avoid naming conflicts

- Custom enums in Bolt components:
  - Custom enums need to implement serialization/deserialization traits
  - For simplicity, use primitive types (like `u8`) in the component struct
  - Create helper methods for conversion between enums and primitives
  - Use enums with explicit values (e.g., `Player = 0`) for clear mapping
- Production component design:
  - Use u64 for currency values to prevent overflow
  - Use i64 for timestamps (Unix epoch time)
  - Use u32 for multipliers (10000 = 100%, 15000 = 150%)
  - Track active status to enable pausing production
  - Include operating costs for economic balance
- Upgradeable component design:
  - Track both current level and maximum possible level
  - Store information about costs for the next upgrade
  - Include a cooldown mechanism to prevent spam
  - Use boolean flags to control upgradeability
  - Store boost values that will apply after upgrade
- Stakeable component design:
  - Track staking status and timing with booleans and timestamps
  - Use rate values for reward and penalty calculations
  - Include minimum staking periods for penalty-free unstaking
  - Track accumulated rewards separately from production
  - Include base rates for reward calculations
- Price component design:
  - Track both current and historical prices
  - Use i64 for timestamps and u64 for price values
  - Use u32 for percentage-based factors (10000 = 100%)
  - Implement circular buffer for price history
  - Use supply/demand factors for market dynamics
  - Include volatility and trend controls
  - Enforce price bounds for stability
  - Control update frequency to prevent spam
- System development patterns:
  - Use the pattern from existing systems as a template
  - Keep the same module name as used in the bolt system command
  - Use a structured Args approach with the `#[arguments]` macro instead of raw bytes
  - Implement helper functions within the module for specific operations
  - Use the `#[system_input]` struct to define required components
  - IMPORTANT: Never modify the `declare_id!` values - keep the ones generated by bolt
  - Prefer proper Rust error handling with the `Result` type and custom errors
  - Place error enums outside the system module but in the same file
- EconomySystem design:
  - Supports three transaction types: Transfer, Exchange, and Initialize
  - Handles conversion between different currencies based on market rates
  - Applies transaction fees during exchanges
  - Validates funds, currency types, and prevents arithmetic overflows
  - Requires proper Price components for exchange operations
  - Ensures exchanges do not result in extremely small amounts

### Bolt System Argument Serialization Notes
We experimented with different approaches to pass arguments from JavaScript to our Bolt systems:

1. **Using JSON Serialization with `#[arguments]` Macro**
   - Initial approach: Tried to use a JSON-serialized object
   - Issue: The Bolt framework couldn't deserialize the wrapped Buffer JSON object
   - Error: `Failed to deserialize args: "{\"type\":\"Buffer\",\"data\":[...]}"`

2. **Using Raw Binary Buffer with `Vec<u8>` Argument**
   - Second approach: Removed the `#[arguments]` macro and switched to `Vec<u8>`
   - Created binary buffers with exact field layouts
   - Issue: Return type mismatch - expected `Vec<Vec<u8>>`, found `&mut Components<'_>`
   - Error: Function signature inconsistency with what Bolt expects

3. **Using Direct JavaScript Object with `#[arguments]` Macro**
   - Third approach: Kept the `#[arguments]` macro and passed a JavaScript object directly
   - Used direct literals instead of BN objects or custom types
   - Success: This works when using plain JS objects with number values
   - Key insight: Use primitive values only (no BN objects or classes)

4. **Providing All Required Components**
   - Important finding: Bolt enforces component validation based on the system struct
   - For single-entity operations (like initialization), provide all components needed
   - For multi-entity operations (like transfers), reference components from different entities
   - Each operation may require a different arrangement of entity-component links

5. **The Working Solution**
   - Keep the `#[arguments]` macro in Rust
   - Pass plain JavaScript objects with primitive values as args
   - Ensure all required components are provided
   - Use the correct `ApplySystem` format for our SDK version
   - For operations involving multiple entities, correctly structure each entity-component link

Lessons learned:
- Arguments passed to Bolt systems need to be simple JavaScript objects with primitive values
- Complex objects like BN aren't handled properly by the deserializer
- Each API version of ApplySystem has different parameter requirements
- Entity-component relationships must match the expected structure in the system
- The EconomySystem requires careful setup for operations involving multiple wallets

### Bolt Component Update Behavior
- **Critical Finding**: When multiple instances of the same component type are passed to a Bolt system, only the last instance is used for updates.
- The order of components in the system struct is crucial and must be matched exactly in the ApplySystem call.
- When designing systems that interact with multiple entities:
  - Pay close attention to which component reference is used for modifications in the Rust code (e.g., `source_wallet` vs `destination_wallet`)
  - The component instance that gets updated is determined by which reference is used in the system's execution code, not by the parameter name
  - Test thoroughly to ensure the correct component instances are being updated
- This behavior caused subtle issues when implementing transfer functionality between wallets:
  - Destination wallets were modified correctly but source wallets weren't being updated
  - This happened because we were expecting the `source_wallet` reference to modify the source entity, but the system's code was using a different reference
  - Even passing the same component multiple times resulted in only the last instance being used for writes
- For future system development:
  - Always check which component reference is used in the system code for modifications
  - Ensure component mapping in tests exactly matches the system's expectations
  - Consider adding explicit tests to verify component update behavior

### Known Issues
- Warning about `cfg` condition value: `solana` in component and system macros (non-blocking)
- Test file has import errors for new components until a successful build creates the types
- Need to verify if the field names in tests match those in Rust (e.g., `usdc_balance` vs `usdcBalance`)
- For transfer operations, we need better way to link source and destination components from different entities
- All currency values must use 6 decimal places (1,000,000 = $1) consistently across the codebase
- Price updates are currently disabled by default after component initialization

### Next Steps
- Complete the remaining EconomySystem tests (transfer and exchange)
- Create PriceActionSystem for price component initialization and updates
- Ensure all systems and tests use 6 decimal places (1,000,000 = $1) for currency values
- Create initialization method for price components to support exchange tests
- Start implementing the ProductionSystem to calculate resource generation
- Create a MarketSystem for price updates and trading
- Begin work on the UpgradeSystem for GPU management

### Bolt/MagicBlock Monitoring Best Practices
- When implementing UI monitors for Bolt ECS framework:
  - Use a ClientOnly wrapper for wallet components to prevent React hydration errors
  - Implement flexible regex pattern detection for World, Entity, Component, and System logs
  - Always check for multiple log format variants as they may change across versions
  - Use a Map-based approach to store transactions to avoid duplicate key errors in React
  - When processing the same transaction multiple times, merge information instead of replacing
  - Create a persistent connection to the validator to avoid connection issues
  - Use fallback endpoints (127.0.0.1, localhost, etc.) for better reliability
  - Add visual indicators (badges) for different transaction types
  - For Bolt ECS, track these key objects: Registry, World, Entities, Components, and Systems
  - Use console logging to help trace transaction processing during development
  - Handle connection errors gracefully with retry mechanisms
  - Use a centralized state update function for consistent state management
  - Include appropriate error tracking and display

- Bolt ECS Log Analysis:
  - Registry and World accounts must be initialized before other operations
  - Entity creation logs typically include "entity" and an ID
  - Component initialization logs include the component name
  - System application logs include the system name and "applied"
  - Log formats can vary slightly between framework versions
  - Look for system-specific programs: bolt-world, bolt-registry, etc.
  - Always check for errors like "Registry not found" or "Component not initialized"
  - When processing transactions, accumulate information over time rather than replacing it

- React State Management for Blockchain Data:
  - Use React's useCallback for functions that update state
  - Centralize state updates to prevent race conditions
  - Always update state immutably
  - When merging blockchain data, combine rather than replace information
  - Keep UI responsive during blockchain queries with proper loading states
  - Implement proper error handling for blockchain operations
  - Add detailed logging during development phases

- Next.js Specific Considerations:
  - Components that rely on browser APIs (like wallet adapters) must be client-side only
  - Use a ClientOnly wrapper component to prevent hydration errors
  - Be cautious with Date objects as they can cause hydration mismatches
  - Always provide fallback content for server-rendered components

- UpgradeSystem design:
  - Supports three primary operations: Initialize, Upgrade, and UpdateParams
  - Initialize: Sets up initial upgrade settings including levels, costs, and boost amounts
  - Upgrade: Performs an upgrade if conditions are met (cooldown elapsed, enough funds)
  - UpdateParams: Modifies upgrade parameters like max level, costs, and boosts
  - Requires careful coordination between the upgradeable, wallet, and production components
  - Uses percentage-based boosts where 10000 = 100% (like other percentage values)
  - Automatically increases costs for subsequent upgrades (using 150% multiplier)
  - Immediately applies production boosts during upgrades
  - Updates production component level values to maintain consistency
  - Uses the same cooldown and timestamp approach as other time-based systems
  - Enforces proper validation: max level caps, cooldown periods, and sufficient funds
  - Comprehensive test coverage includes: initialization, successful upgrade, failed upgrade due to insufficient funds, cooldown period validation, and max level restriction
  - Operation type enum values:
    - INITIALIZE = 0: Sets up upgrade properties
    - UPGRADE = 1: Performs an upgrade transaction
    - UPDATE_PARAMS = 2: Updates upgrade parameters

- StakingSystem design:
  - Supports five primary operations: Initialize, Stake, Unstake, CollectRewards, and UpdateParams
  - Initialize: Sets up initial staking settings including reward rates, minimum staking periods, and penalty rates
  - Stake: Marks an entity as staked and pauses regular production
  - Unstake: Calculates rewards based on staking duration and applies penalties for early unstaking
  - CollectRewards: Transfers accumulated rewards to the user's wallet
  - UpdateParams: Modifies staking parameters such as reward rates and penalty calculations
  - Requires coordination between the stakeable, wallet, and production components
  - Uses percentage-based calculations where 10000 = 100% (consistent with other systems)
  - Handles time-based calculations for staking duration using Unix timestamps
  - Automatically pauses regular production while an entity is staked
  - Implements early unstaking penalties based on minimum staking periods
  - Maintains accumulated rewards until explicitly collected
  - Enforces proper validation: staking status, reward availability, and claim permissions
  - Tests require careful handling of numeric arguments (using direct number values instead of component values)
  - Operation type enum values:
    - INITIALIZE = 0: Sets up staking properties
    - STAKE = 1: Stakes an entity
    - UNSTAKE = 2: Unstakes an entity with reward calculations
    - COLLECT_REWARDS = 3: Collects accumulated staking rewards
    - UPDATE_PARAMS = 4: Updates staking parameters

- MarketSystem design:
  - Supports five primary operations: CreateListing, PurchaseAsset, CancelListing, UpdateListing, and TransferAsset
  - CreateListing: Creates a new marketplace listing for an asset with a specified price
  - PurchaseAsset: Transfers ownership and handles payment for a marketplace listing
  - CancelListing: Removes a listing from the marketplace without completing a sale
  - UpdateListing: Modifies price or other parameters of an existing listing
  - TransferAsset: Directly transfers asset ownership between entities without payment
  - Requires coordination between wallet, ownership, and price components
  - Uses the Price component to track listing details including status
  - Leverages the AssignOwnership system for entity ownership transfers
  - Enforces proper validation: ownership verification, sufficient funds, and active listings
  - Handles different payment methods using the currency_type field
  - Updates listing status using the price component's priceType field
  - Maintains listing history using the price component's price history features
  - Operation type enum values:
    - CREATE_LISTING = 0: Creates a new marketplace listing
    - PURCHASE_ASSET = 1: Completes a purchase transaction
    - CANCEL_LISTING = 2: Removes a listing from the marketplace
    - UPDATE_LISTING = 3: Updates an existing listing's parameters
    - TRANSFER_ASSET = 4: Directly transfers ownership without payment

- AssignOwnership system design:
  - Supports four primary operations: Initialize, AssignToWallet, RemoveOwnership, and TransferOwnership
  - Initialize: Sets up the ownership component with proper type and empty arrays
  - AssignToWallet: Adds an entity ID to the owner's list of owned entities
  - RemoveOwnership: Removes an entity ID from the owner's owned entity list
  - TransferOwnership: Transfers ownership from one entity to another
  - Uses two arrays to track owned entities: ownedEntities (IDs) and ownedEntityTypes (types)
  - Entity IDs are controlled by the game logic rather than being Solana public keys
  - Maintains proper synchronization between owned entity IDs and their types
  - Enforces validation: ownership verification, entity existence, and proper entity types
  - Handles errors gracefully when entities are not found or already owned
  - Critical for marketplace operations and resource management
  - Works with different entity types (PLAYER, GPU, DATA_CENTER, etc.)
  - Operation type enum values:
    - INITIALIZE = 0: Sets up ownership component with initial values
    - ASSIGN_TO_WALLET = 1: Adds an entity to an owner's possession
    - REMOVE_OWNERSHIP = 2: Removes an owned entity
    - TRANSFER_OWNERSHIP = 3: Transfers an entity between owners

### Learning Notes (continued)

- SOAR Integration:
  - SOAR requires setting up a game and leaderboards via SDK
  - Leaderboard submission requires CPI calls from our program
  - Player registration needs to be done before submitting scores
  - Each leaderboard needs its own calculation methodology
  - Our wealth calculation accounts for all currencies at market price
  - SOAR uses a 6-decimal standard similar to our currency approach
  - Game signer PDA must be created with the correct seeds and provided to SOAR
  - Regular update of scores requires either client trigger or on-chain automation
  - Scores are public and retrievable via SOAR SDK client
  
- LeaderboardSystem design:
  - Uses a Bolt ECS approach similar to other systems
  - Defines calculation operation and submission operation
  - Relies on Price component for accurate currency conversions
  - Handles overflow carefully with checked math operations
  - Implements proper CPI interface to SOAR
  - Supports multiple currency types by using price components
  - Follows the 6-decimal standard for currency values
  - Provides detailed logs for debugging
  - Works directly with the Wallet component for balance access