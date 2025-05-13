/**
 * Enums mirroring the Rust enums defined in the on-chain programs.
 */

/**
 * From: `yield-wars-program/programs-ecs/systems/economy/src/lib.rs`
 * Also used in `yield-wars-program/tests/yield-wars-program.ts`
 */
export enum EconomyTransactionType {
  Transfer = 0,
  Exchange = 1,
  // Note: The EconomySystem enum has `Purchase = 2`.
  // The tests used `INITIALIZE = 2` for funding wallets via EconomySystem.
  // Clarify if `Purchase` is the correct general term or if a separate type for Initialize exists or is needed.
  // For now, sticking to what's in the EconomySystem enum directly.
  Purchase = 2, 
  Initialize = 2, // Adding based on test usage for wallet funding. Needs reconciliation with `Purchase`.
}

/**
 * From: `yield-wars-program/programs-ecs/components/wallet/src/lib.rs`
 * and `yield-wars-program/programs-ecs/systems/economy/src/lib.rs` (identical)
 */
export enum CurrencyType {
  USDC = 0,
  BTC = 1,
  ETH = 2,
  SOL = 3,
  AIFI = 4, // AiFi in EconomySystem, AiFi in WalletComponent
}

/**
 * From: `yield-wars-program/programs-ecs/components/ownership/src/lib.rs`
 */
export enum EntityType {
  Player = 0,
  GPU = 1,
  DataCenter = 2,
  Land = 3,
  EnergyContract = 4,
  Unknown = 255,
}

/**
 * From: `yield-wars-program/programs-ecs/systems/price-action/src/lib.rs`
 */
export enum PriceActionOperationType {
  Initialize = 0,
  Enable = 1,
  Update = 2,
}

// Add other enums from your programs as needed, for example:
// - Production::ProducerType
// - Upgradeable::UpgradeableType
// - Stakeable::StakeableType
// - ResourceProduction::OperationType (if different from PriceActionOperationType)
// - Upgrade::OperationType (if different from PriceActionOperationType)
