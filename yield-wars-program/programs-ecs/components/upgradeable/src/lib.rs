#![allow(unexpected_cfgs)]

use bolt_lang::*;

declare_id!("EtUh4iAFPwhUSFPGCjmNdx9M36AiqUHB7QcLNmuyWVox");

/// Upgradeable component that defines upgrade capabilities for entities
///
/// This component is attached to entities that can be upgraded, such as GPUs and Data Centers.
/// It tracks the current level, maximum possible level, and stores required upgrade costs.
/// The upgrade costs define the amount of resources needed for each level upgrade.
#[component]
#[derive(Default)]
pub struct Upgradeable {
    /// Current level of the entity (starts at 1)
    pub current_level: u8,
    
    /// Maximum level this entity can reach
    pub max_level: u8,
    
    /// Last time this entity was upgraded (Unix timestamp)
    pub last_upgrade_time: i64,
    
    /// Whether entity can be upgraded further
    pub can_upgrade: bool,
    
    /// Type of the upgradeable entity (uses same enum as Ownership component)
    pub upgradeable_type: u8,
    
    /// USDC cost for the next upgrade
    pub next_upgrade_usdc_cost: u64,
    
    /// AiFi cost for the next upgrade
    pub next_upgrade_aifi_cost: u64,
    
    /// Cooldown between upgrades in seconds
    pub upgrade_cooldown: u32,
    
    /// Production boost percentage for USDC after next upgrade (10000 = 100%)
    pub next_usdc_boost: u32,
    
    /// Production boost percentage for AiFi after next upgrade (10000 = 100%)
    pub next_aifi_boost: u32,
}

/// Errors that can occur when interacting with the Upgradeable component
#[error_code]
pub enum UpgradeableError {
    /// Entity is already at maximum level
    #[msg("Entity is already at maximum level")]
    AlreadyMaxLevel,
    
    /// Insufficient funds for upgrade
    #[msg("Insufficient funds for upgrade")]
    InsufficientFunds,
    
    /// Upgrade cooldown period has not elapsed
    #[msg("Upgrade cooldown period has not elapsed")]
    UpgradeCooldown,
    
    /// Entity cannot be upgraded
    #[msg("This entity cannot be upgraded")]
    CannotUpgrade,
}