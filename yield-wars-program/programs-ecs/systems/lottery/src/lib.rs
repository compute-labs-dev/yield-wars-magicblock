use bolt_lang::*;
use borsh::{BorshDeserialize, BorshSerialize};
use lottery_prize::LotteryPrize;
use wallet::Wallet;

mod instructions;

declare_id!("j7CSfnnbmg6uq45Z6gMsJE26YNSa3YvVRrBJZ3EJbaP");

pub const AIFI_TO_USDC_RATIO: u64 = 5; // 5 USDC per AiFi

#[system]
pub mod lottery {
    #[arguments]
    pub enum OperationType {
        Initialize(instructions::InitializeArgs),
        PlaceBet(instructions::PlaceBetArgs),
        UpdateParams(instructions::UpdateParamsArgs),
    }

    pub fn execute(ctx: Context<Components>, args: OperationType) -> Result<Components> {
        let current_time = Clock::get()?.unix_timestamp;

        match args {
            OperationType::Initialize(args) => {
                instructions::initialize(
                    &mut ctx.accounts.lottery_prize,
                    args.min_bet_amount,
                    args.win_probability,
                    args.max_win_multiplier,
                    current_time,
                )?;
            }
            OperationType::PlaceBet(args) => {
                let player_pubkey = ctx.accounts.player_wallet.key();
                instructions::place_bet(
                    &mut ctx.accounts.lottery_prize,
                    &mut ctx.accounts.player_wallet,
                    args.bet_amount,
                    player_pubkey,
                    current_time,
                    args.randomness,
                )?;
            }
            OperationType::UpdateParams(args) => {
                instructions::update_params(
                    &mut ctx.accounts.lottery_prize,
                    args.min_bet_amount,
                    args.win_probability,
                    args.max_win_multiplier,
                    args.is_active,
                    current_time,
                )?;
            }
        }

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub lottery_prize: LotteryPrize,
        pub player_wallet: Wallet,
    }
}

#[error_code]
pub enum LotterySystemError {
    #[msg("Bet amount too low")]
    BetAmountTooLow,
    #[msg("Insufficient funds to place bet")]
    InsufficientFunds,
    #[msg("Invalid operation")]
    InvalidOperation,
    #[msg("Lottery is not active")]
    LotteryNotActive,
    #[msg("No prize to claim")]
    NoPrizeToClaim,
    #[msg("Invalid win probability (must be between 1 and 10000)")]
    InvalidWinProbability,
    #[msg("Invalid max win multiplier (must be greater than 0)")]
    InvalidMaxWinMultiplier,
}
