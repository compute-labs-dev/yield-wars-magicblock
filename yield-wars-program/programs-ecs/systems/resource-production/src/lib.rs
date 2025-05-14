#![allow(unexpected_cfgs)]

use bolt_lang::*;
use production::Production;
use wallet::Wallet;

declare_id!("3Erv5Y7amyL9MNGy83HAVaQaAohQZF9qC6faHrcE58Ez");

/// ResourceProduction system handles resource generation and collection
///
/// This system allows entities to:
/// - Initialize production settings
/// - Collect generated resources based on time elapsed
/// - Activate or deactivate production
/// - Update production rates
#[system]
pub mod resource_production {

    /// Operation types supported by the ResourceProduction system
    pub enum OperationType {
        /// Initialize production settings
        Initialize = 0,
        /// Collect generated resources
        Collect = 1,
        /// Activate or deactivate production
        SetActive = 2,
        /// Update production rates
        UpdateRates = 3,
    }

    /// Arguments for the ResourceProductionSystem
    #[arguments]
    pub struct Args {
        /// Type of operation to perform
        pub operation_type: u8,
        /// USDC per hour production rate (for Initialize and UpdateRates)
        pub usdc_per_hour: u64,
        /// AiFi per hour production rate (for Initialize and UpdateRates)
        pub aifi_per_hour: u64,
        /// Current timestamp (Unix timestamp in seconds)
        pub current_time: i64,
        /// Producer type (0 = Player, 1 = GPU, etc.)
        pub producer_type: u8,
        /// Level of the producer
        pub level: u8,
        /// Whether production should be active (for Initialize and SetActive)
        pub is_active: bool,
        /// Operating cost per hour in USDC
        pub operating_cost: u64,
        /// Efficiency multiplier (10000 = 100%)
        pub efficiency_multiplier: u32,
    }

    /// Main execution function for the ResourceProduction system
    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        match args.operation_type {
            // Initialize production settings
            0 => {
                let production = &mut ctx.accounts.production;
                
                // Set initial production values
                production.usdc_per_hour = args.usdc_per_hour;
                production.aifi_per_hour = args.aifi_per_hour;
                production.last_collection_time = args.current_time;
                production.efficiency_multiplier = args.efficiency_multiplier;
                production.producer_type = args.producer_type;
                production.level = args.level;
                production.is_active = args.is_active;
                production.operating_cost = args.operating_cost;
            },
            // Collect generated resources
            1 => {
                let production = &mut ctx.accounts.production;
                let wallet = &mut ctx.accounts.wallet;
                let current_time = args.current_time;
                
                // Check if production is active
                if !production.is_active {
                    return Err(ResourceProductionError::ProductionInactive.into());
                }
                
                // Calculate elapsed time since last collection in hours
                let elapsed_seconds = current_time.checked_sub(production.last_collection_time)
                    .ok_or(ResourceProductionError::InvalidTimestamp)?;
                
                // Avoid negative elapsed time
                if elapsed_seconds <= 0 {
                    return Err(ResourceProductionError::InvalidTimestamp.into());
                }
                
                // Convert to hours with 3 decimal precision (3600 seconds = 1 hour)
                // We multiply by 1000 to preserve 3 decimal places
                let elapsed_hours_x1000 = (elapsed_seconds as u64)
                    .checked_mul(1000)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?
                    .checked_div(3600)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Apply efficiency multiplier to production rates
                let efficiency = (production.efficiency_multiplier as u64)
                    .checked_div(10000)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Calculate USDC earned
                let usdc_per_hour = production.usdc_per_hour
                    .checked_mul(efficiency)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                let usdc_earned = usdc_per_hour
                    .checked_mul(elapsed_hours_x1000)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?
                    .checked_div(1000) // Adjust for our time precision
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Calculate AiFi earned
                let aifi_per_hour = production.aifi_per_hour
                    .checked_mul(efficiency)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                let aifi_earned = aifi_per_hour
                    .checked_mul(elapsed_hours_x1000)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?
                    .checked_div(1000) // Adjust for our time precision
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Calculate operating costs
                let operating_cost = production.operating_cost
                    .checked_mul(elapsed_hours_x1000)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?
                    .checked_div(1000) // Adjust for our time precision
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Check if wallet has enough funds to cover operating costs
                if wallet.usdc_balance < operating_cost {
                    // If not enough funds, deactivate production
                    production.is_active = false;
                    return Err(ResourceProductionError::InsufficientFundsForOperating.into());
                }
                
                // Deduct operating costs
                wallet.usdc_balance = wallet.usdc_balance
                    .checked_sub(operating_cost)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Add earned resources to wallet
                wallet.usdc_balance = wallet.usdc_balance
                    .checked_add(usdc_earned)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                wallet.aifi_balance = wallet.aifi_balance
                    .checked_add(aifi_earned)
                    .ok_or(ResourceProductionError::ArithmeticOverflow)?;
                
                // Update last collection time
                production.last_collection_time = current_time;
            },
            // Activate or deactivate production
            2 => {
                let production = &mut ctx.accounts.production;
                
                // Update active status
                production.is_active = args.is_active;
                
                // If activating, update the collection time to now
                if args.is_active {
                    production.last_collection_time = args.current_time;
                }
            },
            // Update production rates
            3 => {
                let production = &mut ctx.accounts.production;
                
                // Update production rates
                production.usdc_per_hour = args.usdc_per_hour;
                production.aifi_per_hour = args.aifi_per_hour;
                production.efficiency_multiplier = args.efficiency_multiplier;
                production.operating_cost = args.operating_cost;
            },
            _ => return Err(ResourceProductionError::InvalidOperation.into()),
        }
        
        Ok(ctx.accounts)
    }

    /// Components required for the ResourceProduction system
    #[system_input]
    pub struct Components {
        pub production: Production,
        pub wallet: Wallet,
    }
}

/// Errors that can occur in the ResourceProduction system
#[error_code]
pub enum ResourceProductionError {
    /// Production is currently inactive
    #[msg("Production is currently inactive")]
    ProductionInactive,
    
    /// Arithmetic overflow during calculation
    #[msg("Arithmetic overflow in calculation")]
    ArithmeticOverflow,
    
    /// Invalid operation type specified
    #[msg("Invalid operation type specified")]
    InvalidOperation,
    
    /// Invalid timestamp provided
    #[msg("Invalid timestamp provided")]
    InvalidTimestamp,
    
    /// Insufficient funds to cover operating costs
    #[msg("Insufficient funds to cover operating costs")]
    InsufficientFundsForOperating,
}