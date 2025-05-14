use crate::{LotterySystemError, AIFI_TO_USDC_RATIO};
use bolt_lang::*;
use borsh::{BorshDeserialize, BorshSerialize};
use ephemeral_vrf_sdk::rnd::random_u64;
use lottery_prize::LotteryPrize;
use serde::{Deserialize, Serialize};
use wallet::Wallet;

#[derive(Debug, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
pub struct InitializeArgs {
    pub min_bet_amount: u64,
    pub win_probability: u32, // 0 to 10000 (100% = 10000)
    pub max_win_multiplier: u32,
}

// Initialize lottery with starting parameters
pub fn initialize(
    lottery_prize: &mut LotteryPrize,
    min_bet_amount: u64,
    win_probability: u32,
    max_win_multiplier: u32,
    current_time: i64,
) -> Result<()> {
    // Validate inputs
    if win_probability == 0 || win_probability > 10000 {
        return err!(LotterySystemError::InvalidWinProbability);
    }

    if max_win_multiplier == 0 {
        return err!(LotterySystemError::InvalidMaxWinMultiplier);
    }

    // Set initial values
    lottery_prize.min_bet_amount = min_bet_amount;
    lottery_prize.win_probability = win_probability;
    lottery_prize.max_win_multiplier = max_win_multiplier;
    lottery_prize.is_active = true;
    lottery_prize.last_update_time = current_time;
    lottery_prize.total_bets = 0;
    lottery_prize.total_wins = 0;

    // Clear any existing winners (just in case this is a re-initialization)
    lottery_prize.recent_winners = Vec::new();
    lottery_prize.recent_prizes = Vec::new();

    Ok(())
}

#[derive(Debug, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
pub struct PlaceBetArgs {
    pub bet_amount: u64,
    pub randomness: [u8; 32],
}

// Unified place_bet function that always uses VRF randomness
pub fn place_bet(
    lottery_prize: &mut LotteryPrize,
    player_wallet: &mut Wallet,
    bet_amount: u64,
    player_pubkey: Pubkey,
    current_time: i64,
    randomness: [u8; 32],
) -> Result<()> {
    // Check if lottery is active
    if !lottery_prize.is_active {
        return err!(LotterySystemError::LotteryNotActive);
    }

    // Validate bet amount
    if bet_amount < lottery_prize.min_bet_amount {
        return err!(LotterySystemError::BetAmountTooLow);
    }

    // Check player has enough AiFi
    if player_wallet.aifi_balance < bet_amount {
        return err!(LotterySystemError::InsufficientFunds);
    }

    // Deduct bet amount from player's wallet (AiFi balance)
    player_wallet.aifi_balance = player_wallet
        .aifi_balance
        .checked_sub(bet_amount)
        .ok_or(error!(LotterySystemError::InsufficientFunds))?;

    // Update lottery stats
    lottery_prize.total_bets = lottery_prize
        .total_bets
        .checked_add(1)
        .unwrap_or(lottery_prize.total_bets);
    lottery_prize.last_update_time = current_time;

    // Get raw randomness value from VRF
    let raw_random = random_u64(&randomness);
    let random_number = (raw_random % 10000) + 1;

    msg!("\tUsing VRF randomness: {}", random_number);
    msg!("\tRaw VRF value: {}", raw_random);

    if random_number <= lottery_prize.win_probability as u64 {
        // Player won!
        lottery_prize.total_wins = lottery_prize
            .total_wins
            .checked_add(1)
            .unwrap_or(lottery_prize.total_wins);

        // Calculate multiplier seed from random_number
        let multiplier_seed = random_number;

        // Calculate a multiplier between 1000 (1x) and max_win_multiplier
        let multiplier =
            1000_u64 + ((multiplier_seed % (lottery_prize.max_win_multiplier as u64 - 1000)) + 1);

        // Calculate USDC prize using the bet amount * AIFI_TO_USDC_RATIO * multiplier
        let usdc_prize = (bet_amount as u128)
            .checked_mul(AIFI_TO_USDC_RATIO as u128) // Convert AiFi to USDC
            .unwrap_or(0)
            .checked_mul(multiplier as u128) // Apply multiplier
            .unwrap_or(0)
            .checked_div(1000) // Convert from basis points
            .unwrap_or(0) as u64; // Final USDC prize amount

        // Add USDC prize to player's wallet (USDC balance)
        player_wallet.usdc_balance = player_wallet
            .usdc_balance
            .checked_add(usdc_prize)
            .unwrap_or(player_wallet.usdc_balance);

        // Update recent winners (store Pubkey)
        if lottery_prize.recent_winners.len() >= 10 {
            lottery_prize.recent_winners.remove(0);
            lottery_prize.recent_prizes.remove(0);
        }

        lottery_prize.recent_winners.push(player_pubkey);
        lottery_prize.recent_prizes.push(usdc_prize);

        msg!(
            "\tPlayer won {} USDC tokens with a {}x multiplier!",
            usdc_prize,
            multiplier as f64 / 1000.0
        );
    } else {
        msg!("\tPlayer lost the bet. Better luck next time!");
    }

    Ok(())
}

#[derive(Debug, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
pub struct UpdateParamsArgs {
    pub min_bet_amount: u64,
    pub win_probability: u32,
    pub max_win_multiplier: u32,
    pub is_active: bool,
}

// Update lottery parameters
pub fn update_params(
    lottery_prize: &mut LotteryPrize,
    min_bet_amount: u64,
    win_probability: u32,
    max_win_multiplier: u32,
    is_active: bool,
    current_time: i64,
) -> Result<()> {
    // Validate inputs
    if win_probability == 0 || win_probability > 10000 {
        return err!(LotterySystemError::InvalidWinProbability);
    }

    if max_win_multiplier == 0 {
        return err!(LotterySystemError::InvalidMaxWinMultiplier);
    }

    // Update parameters
    lottery_prize.min_bet_amount = min_bet_amount;
    lottery_prize.win_probability = win_probability;
    lottery_prize.max_win_multiplier = max_win_multiplier;
    lottery_prize.is_active = is_active;
    lottery_prize.last_update_time = current_time;

    Ok(())
}
