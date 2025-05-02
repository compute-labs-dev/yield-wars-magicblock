# YieldWars Game Design Document

## Overview

YieldWars is a resource management game built using the ECS (Entity-Component-System) architecture. The game allows players to manage virtual resources including cryptocurrency and mining hardware, focusing on strategic decision-making and resource optimization.

The implementation uses Next.js for the frontend and MagicBlock's Bolt framework on Solana for the backend to create a fully decentralized application with on-chain game logic.

### Currency Standard
All currency values in the game use 6 decimal places, where 1,000,000 units = $1. This applies to all cryptocurrencies (USDC, BTC, ETH, SOL, AiFi) and is consistent across all systems, components, and interfaces.

## Game Mechanics

### Core Gameplay
- Players start with initial fake USDC (stablecoin)
- Players can trade USDC for other cryptocurrencies (BTC, ETH, SOL, AiFi)
- Players can purchase GPUs that produce more USDC and AiFi tokens
- GPUs can be upgraded to increase production efficiency
- GPUs can be staked for additional rewards
- Higher-level assets (Data Centers, Land Rights, Energy Contracts) can be purchased later

### Resource Types
- **USDC**: Base currency used for most transactions
- **BTC, ETH, SOL**: Tradable cryptocurrencies with fluctuating values
- **AiFi**: Special token produced by GPUs, used for advanced upgrades
- **GPUs**: Produce USDC and AiFi at specified rates
- **Data Centers**: House multiple GPUs with efficiency bonuses
- **Land Rights**: Required for placing Data Centers
- **Energy Contracts**: Reduce operating costs of mining operations

### Game Progression
1. Start with initial USDC allocation
2. Purchase basic GPUs to begin resource production
3. Upgrade GPUs to improve efficiency
4. Stake GPUs for additional rewards
5. Accumulate enough resources to purchase Data Centers
6. Expand operation with Land Rights and Energy Contracts
7. Optimize production and trading for maximum returns

## Technical Architecture

### Entity-Component-System (ECS) Architecture
YieldWars uses the ECS pattern where:
- **Entities** are the core objects (players, GPUs, currencies)
- **Components** are data containers attached to entities (wallet, production rates, ownership)
- **Systems** are logic units that operate on entities with specific components (economy, production, upgrade)

### Entities
- Player
- Currency (USDC, BTC, ETH, SOL, AiFi)
- GPU
- Data Center
- Land
- Energy Contract

### Components
- **Wallet**: Tracks currency balances
- **Ownership**: Tracks which entities own other entities
- **Production**: Defines resource generation rates
- **Upgradeable**: Defines upgrade paths and costs
- **Stakeable**: Defines staking parameters and rewards
- **Price**: Defines market values
- **Timer**: For time-based activities
- **Stats**: Performance statistics

### Systems
- **EconomySystem**: Handles all currency transactions, exchanges, and economic balance
- **PriceActionSystem**: Manages price component initialization and updates
- **ProductionSystem**: Calculates resource generation from GPUs and other productive assets
- **UpgradeSystem**: Manages the upgrade mechanics for GPUs and other upgradeable entities
- **StakingSystem**: Handles the staking of GPUs and calculates rewards
- **MarketSystem**: Manages the buying and selling of assets and their price fluctuations
- **TimerSystem**: Controls all time-based events and progression

## Component Design Details

### Wallet Component
```rust
pub struct Wallet {
    pub usdc_balance: u64,
    pub btc_balance: u64,
    pub eth_balance: u64,
    pub sol_balance: u64,
    pub aifi_balance: u64,
}
```
The Wallet component tracks currency balances for a player entity, including USDC, BTC, ETH, SOL, and AiFi.

### Ownership Component
```rust
pub struct Ownership {
    pub owner_type: u8,
    pub owned_entities: Vec<Pubkey>,
    pub owned_entity_types: Vec<u8>,
}

pub enum EntityType {
    Player = 0,
    GPU = 1,
    DataCenter = 2,
    Land = 3,
    EnergyContract = 4,
    Unknown = 255,
}
```
The Ownership component establishes relationships between entities, allowing a player to own GPUs, Data Centers, and other assets. It stores arrays of owned entity public keys and their corresponding types.

### Production Component
```rust
pub struct Production {
    pub usdc_per_hour: u64,
    pub aifi_per_hour: u64,
    pub last_collection_time: i64,
    pub efficiency_multiplier: u32,
    pub producer_type: u8,
    pub level: u8,
    pub is_active: bool,
    pub operating_cost: u64,
}
```
The Production component defines resource generation capabilities for entities like GPUs. It tracks production rates for USDC and AiFi tokens, collection timestamps, efficiency multipliers, and operating costs. The multiplier (10000 = 100%) can be affected by Data Centers, Energy Contracts, and upgrades. Production can be paused by setting is_active to false.

### Upgradeable Component
```rust
pub struct Upgradeable {
    pub current_level: u8,
    pub max_level: u8,
    pub last_upgrade_time: i64,
    pub can_upgrade: bool,
    pub upgradeable_type: u8,
    pub next_upgrade_usdc_cost: u64,
    pub next_upgrade_aifi_cost: u64,
    pub upgrade_cooldown: u32,
    pub next_usdc_boost: u32,
    pub next_aifi_boost: u32,
}
```
The Upgradeable component defines how entities can be improved over time. It tracks the current level, maximum possible level, and the timestamp of the last upgrade. It stores the costs for the next upgrade in both USDC and AiFi, along with the production boosts that will be applied. A cooldown period and boolean flag control when upgrades are possible.

### Stakeable Component
```rust
pub struct Stakeable {
    pub is_staked: bool,
    pub staking_start_time: i64,
    pub min_staking_period: u32,
    pub reward_rate: u32,
    pub unstaking_penalty: u32,
    pub accumulated_usdc_rewards: u64,
    pub accumulated_aifi_rewards: u64,
    pub last_claim_time: i64,
    pub stakeable_type: u8,
    pub can_claim_rewards: bool,
    pub base_usdc_per_hour: u64,
    pub base_aifi_per_hour: u64,
}
```
The Stakeable component enables entities like GPUs to be staked for additional rewards. It tracks whether an entity is staked, when staking began, and the minimum period before penalty-free unstaking. It stores accumulated rewards and the last time rewards were claimed. The reward and penalty rates determine the benefits of staking and the costs of early unstaking. Base production rates help calculate rewards based on an entity's productivity.

### Price Component
```rust
pub struct Price {
    pub current_price: u64,
    pub previous_price: u64,
    pub last_update_time: i64,
    pub min_price: u64,
    pub max_price: u64,
    pub volatility: u32,
    pub update_frequency: u32,
    pub price_type: u8,
    pub price_updates_enabled: bool,
    pub price_trend: i8,
    pub price_history: [u64; 24],
    pub history_index: u8,
    pub supply_factor: u32,
    pub demand_factor: u32,
}
```
The Price component manages market values for tradable entities. It tracks current and historical prices, with bounds for price stability. All price values use 6 decimal places (1,000,000 = $1) for consistency with other currency values. For example, BTC at $60,000 would be stored as 60,000,000,000. The component includes market dynamics through volatility, supply/demand factors, and price trends. A circular buffer stores 24 historical prices for trend analysis. Price updates are controlled by frequency limits and can be temporarily disabled. All monetary values are in USDC, the game's base currency. The supply and demand factors (10000 = neutral) influence price movements, while the volatility factor determines the magnitude of possible price changes.

## System Implementation Details

### EconomySystem
Handles all currency transactions and exchanges:
- Currency transfers between wallets
- Purchasing assets with currency
- Currency exchange rate calculations
- Economic balancing mechanisms

### PriceActionSystem
Manages price component initialization and updates:
- Initializes price components with proper starting values
- Enables/disables price updates for components
- Updates prices based on market dynamics
- Manages price bounds and volatility
- Controls price history recording
- Provides price information for exchange operations
- Synchronizes price data across multiple currency pairs

### ProductionSystem
Calculates resource generation over time:
- Time-based resource accrual
- Production rate modifications based on upgrades
- Efficiency bonus calculations
- Resource collection mechanisms
- Operating cost deductions from generated resources

### UpgradeSystem
Manages entity upgrades:
- Verification of upgrade requirements
- Processing of upgrade costs
- Application of upgrade benefits
- Level-based progression tracking
- Cooldown period enforcement

### StakingSystem
Handles staking and reward calculations:
- Staking and unstaking of entities
- Time-based reward accrual
- Penalty calculation for early unstaking
- Reward claiming mechanisms
- Validation of minimum staking periods

### MarketSystem
Handles price updates and trading:
- Price calculation based on supply/demand
- Historical price tracking
- Price trend analysis
- Trading fee calculations
- Price stability enforcement
- Market activity monitoring

## Economic Balance Parameters

- Initial player USDC: 1,000
- Basic GPU cost: 100 USDC
- Basic GPU production: 10 USDC/hr, 5 AiFi/hr
- GPU upgrade cost: Level 1 -> 2: 200 USDC, +5 USDC/hr, +3 AiFi/hr
- GPU upgrade cost: Level 2 -> 3: 400 USDC, +10 USDC/hr, +5 AiFi/hr
- GPU staking rewards: 5% of production value per day
- Data Center cost: 2,000 USDC, houses up to 5 GPUs, +10% efficiency
- Land Rights cost: 5,000 USDC, required for Data Center placement
- Energy Contract cost: 1,000 USDC, reduces operating costs by 15%
- Market Parameters:
  - Price update frequency: 1 hour
  - Base volatility: 500 (5%)
  - Maximum price change: ±10% per update
  - Trading fee: 1% of transaction value
  - Price history depth: 24 periods
  - Supply/demand impact: ±20% from neutral

## File Structure

### Backend Structure
```
yield-wars-program/
├── programs-ecs/
│   ├── components/
│   │   ├── wallet/
│   │   ├── ownership/
│   │   ├── production/
│   │   ├── upgradeable/
│   │   ├── stakeable/
│   │   └── price/
│   └── systems/
│       ├── economy/
│       ├── production/
│       ├── upgrade/
│       ├── staking/
│       └── market/
├── programs/
│   └── yield-wars/
└── tests/
    └── yield-wars-program.ts
```

### Frontend Structure
```
yield-wars-ui/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Dashboard page
│   │   ├── gpus/
│   │   │   └── page.tsx           # GPU management page
│   │   ├── trading/
│   │   │   └── page.tsx           # Currency trading page
│   │   └── assets/
│   │       └── page.tsx           # Asset management page
│   ├── components/
│   │   ├── ui/                    # Generic UI components
│   │   └── game/                  # Game-specific components
│   ├── hooks/
│   │   ├── useWallet.ts           # Wallet connection hook
│   │   ├── useGameState.ts        # Game state management hook
│   │   └── useTransactions.ts     # Transaction hook
│   ├── lib/
│   │   ├── anchor.ts              # Anchor client setup
│   │   └── solana.ts              # Solana connection utilities
│   ├── models/
│   │   ├── index.ts               # Type exports
│   │   ├── wallet.ts              # Wallet types
│   │   ├── gpu.ts                 # GPU types
│   │   └── assets.ts              # Asset types
│   └── stores/
│       └── useGameStore.ts        # Game state store
└── public/
    └── assets/                    # Static assets
```

## Documentation Resources

- MagicBlock's Bolt Framework: https://docs.magicblock.gg/pages/tools/bolt/introduction
- Solana Development: https://solana.com/docs/programs
- Anchor Framework: https://www.anchor-lang.com/docs/installation
- Next.js Documentation: https://nextjs.org/docs 