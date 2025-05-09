#![allow(unexpected_cfgs)]

use bolt_lang::*;
use upgradeable::Upgradeable;
use wallet::Wallet;
use production::Production;

declare_id!("E2v1mJyyZJif5podWB85KwBzNbUtE2fgqCLnTXmH9Lqq");

/// Upgrade system for handling entity upgrades
///
/// This system allows entities to:
/// - Initialize upgrade properties
/// - Perform upgrades
/// - Apply upgrade benefits to production
/// - Update upgrade costs for the next level
#[system]
pub mod upgrade {

    /// Operation types supported by the Upgrade system
    pub enum OperationType {
        /// Initialize upgrade properties
        Initialize = 0,
        /// Perform an upgrade
        Upgrade = 1,
        /// Update upgrade parameters
        UpdateParams = 2,
    }

    /// Arguments for the Upgrade system
    #[arguments]
    pub struct Args {
        /// Type of operation to perform
        pub operation_type: u8,
        /// Entity type being upgraded (0 = Player, 1 = GPU, etc.)
        pub entity_type: u8,
        /// Current level (for Initialize)
        pub current_level: u8,
        /// Maximum level (for Initialize)
        pub max_level: u8,
        /// Cooldown between upgrades in seconds
        pub upgrade_cooldown: u32,
        /// USDC cost for the next upgrade
        pub next_upgrade_usdc_cost: u64,
        /// AiFi cost for the next upgrade
        pub next_upgrade_aifi_cost: u64,
        /// Production boost percentage for USDC (10000 = 100%)
        pub next_usdc_boost: u32,
        /// Production boost percentage for AiFi (10000 = 100%)
        pub next_aifi_boost: u32,
        /// Current time in seconds (Unix timestamp)
        pub current_time: i64,
    }

    /// Main execution function for the Upgrade system
    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        match args.operation_type {
            // Initialize upgrade properties
            0 => {
                let upgradeable = &mut ctx.accounts.upgradeable;
                
                // Initialize component with provided values
                upgradeable.current_level = args.current_level;
                upgradeable.max_level = args.max_level;
                upgradeable.last_upgrade_time = args.current_time;
                upgradeable.can_upgrade = args.current_level < args.max_level;
                upgradeable.upgradeable_type = args.entity_type;
                upgradeable.next_upgrade_usdc_cost = args.next_upgrade_usdc_cost;
                upgradeable.next_upgrade_aifi_cost = args.next_upgrade_aifi_cost;
                upgradeable.upgrade_cooldown = args.upgrade_cooldown;
                upgradeable.next_usdc_boost = args.next_usdc_boost;
                upgradeable.next_aifi_boost = args.next_aifi_boost;
            },
            // Perform an upgrade
            1 => {
                let upgradeable = &mut ctx.accounts.upgradeable;
                let wallet = &mut ctx.accounts.wallet;
                let production = &mut ctx.accounts.production;
                let current_time = args.current_time;
                
                // Validate upgrade is possible
                if !upgradeable.can_upgrade {
                    return Err(UpgradeError::CannotUpgrade.into());
                }
                
                // Check if already at max level
                if upgradeable.current_level >= upgradeable.max_level {
                    return Err(UpgradeError::AlreadyMaxLevel.into());
                }
                
                // Check if cooldown period has elapsed
                let time_since_last_upgrade = current_time.checked_sub(upgradeable.last_upgrade_time)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                if time_since_last_upgrade < upgradeable.upgrade_cooldown as i64 {
                    return Err(UpgradeError::UpgradeCooldown.into());
                }
                
                // Check if wallet has enough funds
                if wallet.usdc_balance < upgradeable.next_upgrade_usdc_cost {
                    return Err(UpgradeError::InsufficientUsdcFunds.into());
                }
                
                if wallet.aifi_balance < upgradeable.next_upgrade_aifi_cost {
                    return Err(UpgradeError::InsufficientAifiFunds.into());
                }
                
                // Deduct upgrade costs
                wallet.usdc_balance = wallet.usdc_balance
                    .checked_sub(upgradeable.next_upgrade_usdc_cost)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                wallet.aifi_balance = wallet.aifi_balance
                    .checked_sub(upgradeable.next_upgrade_aifi_cost)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                // Apply production boosts
                // Apply USDC boost
                let current_usdc_per_hour = production.usdc_per_hour;
                let usdc_boost = current_usdc_per_hour
                    .checked_mul(upgradeable.next_usdc_boost as u64)
                    .ok_or(UpgradeError::ArithmeticOverflow)?
                    .checked_div(10000)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                production.usdc_per_hour = current_usdc_per_hour
                    .checked_add(usdc_boost)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                // Apply AiFi boost
                let current_aifi_per_hour = production.aifi_per_hour;
                let aifi_boost = current_aifi_per_hour
                    .checked_mul(upgradeable.next_aifi_boost as u64)
                    .ok_or(UpgradeError::ArithmeticOverflow)?
                    .checked_div(10000)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                production.aifi_per_hour = current_aifi_per_hour
                    .checked_add(aifi_boost)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                // Increment level and update upgrade time
                upgradeable.current_level = upgradeable.current_level.checked_add(1)
                    .ok_or(UpgradeError::ArithmeticOverflow)?;
                
                upgradeable.last_upgrade_time = current_time;
                
                // Update can_upgrade flag
                upgradeable.can_upgrade = upgradeable.current_level < upgradeable.max_level;
                
                // Also update the production component's level for consistency
                production.level = upgradeable.current_level;
                
                // Increase costs for the next level by a percentage (if not at max)
                if upgradeable.can_upgrade {
                    // Increase costs by 50% for each level
                    let cost_multiplier = 15000; // 150%
                    
                    upgradeable.next_upgrade_usdc_cost = upgradeable.next_upgrade_usdc_cost
                        .checked_mul(cost_multiplier)
                        .ok_or(UpgradeError::ArithmeticOverflow)?
                        .checked_div(10000)
                        .ok_or(UpgradeError::ArithmeticOverflow)?;
                    
                    upgradeable.next_upgrade_aifi_cost = upgradeable.next_upgrade_aifi_cost
                        .checked_mul(cost_multiplier)
                        .ok_or(UpgradeError::ArithmeticOverflow)?
                        .checked_div(10000)
                        .ok_or(UpgradeError::ArithmeticOverflow)?;
                }
            },
            // Update upgrade parameters
            2 => {
                let upgradeable = &mut ctx.accounts.upgradeable;
                
                // Update parameters as requested
                upgradeable.max_level = args.max_level;
                upgradeable.next_upgrade_usdc_cost = args.next_upgrade_usdc_cost;
                upgradeable.next_upgrade_aifi_cost = args.next_upgrade_aifi_cost;
                upgradeable.upgrade_cooldown = args.upgrade_cooldown;
                upgradeable.next_usdc_boost = args.next_usdc_boost;
                upgradeable.next_aifi_boost = args.next_aifi_boost;
                
                // Recalculate if entity can be upgraded
                upgradeable.can_upgrade = upgradeable.current_level < upgradeable.max_level;
            },
            _ => return Err(UpgradeError::InvalidOperation.into()),
        }
        
        Ok(ctx.accounts)
    }

    /// Components required for the Upgrade system
    #[system_input]
    pub struct Components {
        pub upgradeable: Upgradeable,
        pub wallet: Wallet,
        pub production: Production,
    }
}

/// Errors that can occur in the Upgrade system
#[error_code]
pub enum UpgradeError {
    /// Entity is already at maximum level
    #[msg("Entity is already at maximum level")]
    AlreadyMaxLevel,
    
    /// Insufficient USDC funds for upgrade
    #[msg("Insufficient USDC funds for upgrade")]
    InsufficientUsdcFunds,
    
    /// Insufficient AiFi funds for upgrade
    #[msg("Insufficient AiFi funds for upgrade")]
    InsufficientAifiFunds,
    
    /// Upgrade cooldown period has not elapsed
    #[msg("Upgrade cooldown period has not elapsed")]
    UpgradeCooldown,
    
    /// Entity cannot be upgraded
    #[msg("This entity cannot be upgraded")]
    CannotUpgrade,
    
    /// Invalid operation type specified
    #[msg("Invalid operation type specified")]
    InvalidOperation,
    
    /// Arithmetic overflow during calculation
    #[msg("Arithmetic overflow in calculation")]
    ArithmeticOverflow,
}