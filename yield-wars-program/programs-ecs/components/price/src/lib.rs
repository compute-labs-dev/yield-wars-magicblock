#![allow(unexpected_cfgs)]

use bolt_lang::*;

declare_id!("DTtX2W21uM3oRdJCSTzmjb5ujvY7i6aA1kbEakeBbrV6");

/// Price component that tracks market values and price history
///
/// This component is attached to entities that have market value, such as currencies and assets.
/// It tracks current price, historical prices, and price change parameters.
/// Price changes can be influenced by market activity and time-based fluctuations.
#[component]
#[derive(Default)]
pub struct Price {
    /// Current price in USDC (base currency)
    pub current_price: u64,
    
    /// Previous price for calculating price change
    pub previous_price: u64,
    
    /// Timestamp of last price update
    pub last_update_time: i64,
    
    /// Minimum price allowed
    pub min_price: u64,
    
    /// Maximum price allowed
    pub max_price: u64,
    
    /// Volatility factor (100 = 1%, 1000 = 10%, etc.)
    pub volatility: u32,
    
    /// Price update frequency in seconds
    pub update_frequency: u32,
    
    /// Type of the priced entity (uses same enum as Ownership component)
    pub price_type: u8,
    
    /// Whether price updates are currently enabled
    pub price_updates_enabled: bool,
    
    /// Price trend direction (-100 to +100, where 0 is neutral)
    pub price_trend: i8,
    
    /// Array of historical prices (most recent first, max 24 entries)
    pub price_history: [u64; 24],
    
    /// Index for circular price history array
    pub history_index: u8,
    
    /// Supply factor affecting price (10000 = neutral)
    pub supply_factor: u32,
    
    /// Demand factor affecting price (10000 = neutral)
    pub demand_factor: u32,
}

/// Errors that can occur when interacting with the Price component
#[error_code]
pub enum PriceError {
    /// Price would exceed maximum allowed value
    #[msg("Price would exceed maximum allowed value")]
    PriceAboveMaximum,
    
    /// Price would fall below minimum allowed value
    #[msg("Price would fall below minimum allowed value")]
    PriceBelowMinimum,
    
    /// Price updates are currently disabled
    #[msg("Price updates are currently disabled")]
    PriceUpdatesDisabled,
    
    /// Not enough time has passed since last update
    #[msg("Update frequency limit not reached")]
    UpdateFrequencyNotReached,
    
    /// Invalid price trend value
    #[msg("Price trend must be between -100 and +100")]
    InvalidPriceTrend,
    
    /// Arithmetic overflow in price calculation
    #[msg("Arithmetic overflow in price calculation")]
    ArithmeticOverflow,
}