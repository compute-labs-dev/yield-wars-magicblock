#![allow(unexpected_cfgs)]

use bolt_lang::*;

declare_id!("6ewq3Rkx3c2kLu9qq46fCNS9ZhBshzskCEAgX7WspkVQ");

/// Stakeable component that enables staking functionality for entities
///
/// This component is attached to entities that can be staked, such as GPUs.
/// Staking locks an entity for a period of time, during which it generates bonus rewards.
/// Early unstaking may incur a penalty based on the configured rates.
#[component]
#[derive(Default)]
pub struct Stakeable {
    /// Whether the entity is currently staked
    pub is_staked: bool,
    
    /// Unix timestamp when the entity was staked
    pub staking_start_time: i64,
    
    /// Minimum staking period in seconds before rewards can be claimed without penalty
    pub min_staking_period: u32,
    
    /// Reward rate (100 = 1%, 500 = 5%, etc.)
    pub reward_rate: u32,
    
    /// Penalty rate for early unstaking (100 = 1%, 500 = 5%, etc.)
    pub unstaking_penalty: u32,
    
    /// Accumulated USDC rewards (calculated at claim time)
    pub accumulated_usdc_rewards: u64,
    
    /// Accumulated AiFi rewards (calculated at claim time) 
    pub accumulated_aifi_rewards: u64,
    
    /// Last time rewards were claimed (Unix timestamp)
    pub last_claim_time: i64,
    
    /// Type of the stakeable entity (uses same enum as Ownership component)
    pub stakeable_type: u8,
    
    /// Whether rewards can be claimed (might be locked during certain periods)
    pub can_claim_rewards: bool,
    
    /// Base USDC per hour used for reward calculations
    pub base_usdc_per_hour: u64,
    
    /// Base AiFi per hour used for reward calculations
    pub base_aifi_per_hour: u64,
}

/// Errors that can occur when interacting with the Stakeable component
#[error_code]
pub enum StakeableError {
    /// Entity is already staked
    #[msg("Entity is already staked")]
    AlreadyStaked,
    
    /// Entity is not staked
    #[msg("Entity is not staked")]
    NotStaked,
    
    /// Minimum staking period has not elapsed for penalty-free unstaking
    #[msg("Minimum staking period has not elapsed")]
    MinimumStakingPeriodNotElapsed,
    
    /// No rewards available to claim
    #[msg("No rewards available to claim")]
    NoRewardsAvailable,
    
    /// Cannot claim rewards at this time
    #[msg("Cannot claim rewards at this time")]
    CannotClaimRewards,
    
    /// Arithmetic overflow in reward calculations
    #[msg("Arithmetic overflow in reward calculation")]
    ArithmeticOverflow,
}