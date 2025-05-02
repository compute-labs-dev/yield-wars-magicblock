#![allow(unexpected_cfgs)]

use bolt_lang::*;

declare_id!("Hx47WJJoq9uzSRkZ8o4nRF57W1zpuYwAAc6pWHfbGQAr");

/// Production component that tracks resource generation rates
///
/// This component is used to define the production capabilities of entities in the YieldWars game,
/// such as GPUs that produce USDC and AiFi tokens. It includes:
/// - Production rates per hour for USDC and AiFi
/// - Last collection timestamp to calculate uncollected resources
/// - Efficiency multiplier that can be affected by upgrades, data centers, or energy contracts
#[component]
#[derive(Default)]
pub struct Production {
    /// USDC tokens produced per hour
    pub usdc_per_hour: u64,
    
    /// AiFi tokens produced per hour
    pub aifi_per_hour: u64,
    
    /// Timestamp of the last resource collection (Unix timestamp)
    pub last_collection_time: i64,
    
    /// Efficiency multiplier applied to production rates (10000 = 100%)
    /// This can be increased by:
    /// - Placing GPUs in data centers
    /// - Purchasing energy contracts
    /// - Applying upgrades
    pub efficiency_multiplier: u32,
    
    /// Type of production entity (uses same enum as Ownership component)
    pub producer_type: u8,
    
    /// Current level of the production entity (affects base rates)
    pub level: u8,
    
    /// Whether production is currently active
    pub is_active: bool,
    
    /// Operating cost per hour in USDC
    pub operating_cost: u64,
}

/// Errors that can occur when interacting with the Production component
#[error_code]
pub enum ProductionError {
    /// Production is paused or inactive
    #[msg("Production is currently inactive")]
    ProductionInactive,
    
    /// Attempted to collect resources too soon (anti-spam)
    #[msg("Collection cooldown period has not elapsed")]
    CollectionCooldown,
    
    /// Arithmetic overflow in production calculations
    #[msg("Arithmetic overflow in production calculation")]
    ArithmeticOverflow,
}