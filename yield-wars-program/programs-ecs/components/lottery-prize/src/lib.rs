use bolt_lang::*;

declare_id!("4xUdb6YrCjMeXNFJXXEpHxKVsYoHcRKYFn7Ehz5s8xN9");

/// LotteryPrize component that tracks lottery properties and prize information
///
/// This component stores information about a lottery including:
/// - Current prize pool amount
/// - Minimum bet amount
/// - Win probability
/// - Recent winners and prizes
#[component]
#[derive(Default)]
pub struct LotteryPrize {
    /// Minimum bet amount in AiFi tokens
    pub min_bet_amount: u64,

    /// Win probability as a percentage (10000 = 100%, 100 = 1%)
    pub win_probability: u32,

    /// Maximum win multiplier (10000 = 10x, 5000 = 5x)
    pub max_win_multiplier: u32,

    /// Timestamp of last lottery update
    pub last_update_time: i64,

    /// Total number of bets placed
    pub total_bets: u64,

    /// Total number of wins
    pub total_wins: u64,

    /// Whether the lottery is currently active
    pub is_active: bool,

    /// Recent winners identified by their public key
    #[max_len(10)]
    pub recent_winners: Vec<Pubkey>,

    /// Prize amounts in AiFi tokens corresponding to recent winners
    #[max_len(10)]
    pub recent_prizes: Vec<u64>,
}

/// Errors that can occur when interacting with the LotteryPrize component
#[error_code]
pub enum LotteryPrizeError {
    /// Bet amount is below the minimum required amount
    #[msg("Bet amount is below the minimum required")]
    BetAmountTooLow,

    /// Lottery is currently inactive
    #[msg("Lottery is currently inactive")]
    LotteryInactive,
}
