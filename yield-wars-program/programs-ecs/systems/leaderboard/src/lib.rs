#![allow(unexpected_cfgs)]

use bolt_lang::*;
use wallet::Wallet;
use price::Price;
use solana_program::account_info::AccountInfo;
use solana_program::pubkey::Pubkey;
use solana_program::instruction::{AccountMeta, Instruction};
use solana_program::program::invoke;
use solana_program::entrypoint::ProgramResult;
use solana_program::program_error::ProgramError;

declare_id!("2h3bhNaWoWPX5acUWsDEiL5CwxVEBZDCYWY56ckjW1Yp");

pub const USDC_DECIMALS: u8 = 6; // 1 USDC = 1_000_000 units
pub const CURRENCY_USDC: u8 = 0;
pub const CURRENCY_BTC: u8 = 1;
//pub const CURRENCY_ETH: u8 = 2;
//pub const CURRENCY_SOL: u8 = 3;
pub const CURRENCY_AIFI: u8 = 4;

// SOAR instruction discriminator for submit_score
const SUBMIT_SCORE_IX: u8 = 5;

#[system]
pub mod leaderboard {
    pub fn execute(ctx: Context<Components>, args_p: Vec<u8>) -> Result<Components> {
        // Calculate total value
        let accounts = &ctx.accounts;
        let mut total_value: u64 = 0;
        
        // USDC is 1:1 value
        total_value += accounts.wallet.usdc_balance;
        
        // Add BTC value (convert to USDC value)
        if accounts.price_btc.current_price > 0 {
            let btc_value = accounts.wallet.btc_balance
                .checked_mul(accounts.price_btc.current_price)
                .unwrap_or(0) 
                .checked_div(1_000_000) // Adjust for decimal places
                .unwrap_or(0);
            total_value = total_value.checked_add(btc_value).unwrap_or(total_value);
        }
        
        // Add ETH value
        /*
        if accounts.price_eth.current_price > 0 {
            let eth_value = accounts.wallet.eth_balance
                .checked_mul(accounts.price_eth.current_price)
                .unwrap_or(0)
                .checked_div(1_000_000)
                .unwrap_or(0);
            total_value = total_value.checked_add(eth_value).unwrap_or(total_value);
        }
            */
        
        // Add SOL value
        /*
        if accounts.price_sol.current_price > 0 {
            let sol_value = accounts.wallet.sol_balance
                .checked_mul(accounts.price_sol.current_price)
                .unwrap_or(0)
                .checked_div(1_000_000)
                .unwrap_or(0);
            total_value = total_value.checked_add(sol_value).unwrap_or(total_value);
        }
            */
        
        // Add AiFi value
        if accounts.price_aifi.current_price > 0 {
            let aifi_value = accounts.wallet.aifi_balance
                .checked_mul(accounts.price_aifi.current_price)
                .unwrap_or(0)
                .checked_div(1_000_000)
                .unwrap_or(0);
            total_value = total_value.checked_add(aifi_value).unwrap_or(total_value);
        }
        
        // Log the result
        msg!("Calculated player wealth: {} USDC", total_value / 1_000_000);
        
        // SOAR Leaderboard Integration
        if args_p.len() >= 96 {  // Check we have enough data (3 pubkeys = 96 bytes)
            // Extract SOAR-related accounts from args_p
            let player_key = Pubkey::new_from_array(args_p[0..32].try_into().unwrap());
            let auth_key = Pubkey::new_from_array(args_p[32..64].try_into().unwrap());
            let leaderboard_key = Pubkey::new_from_array(args_p[64..96].try_into().unwrap());
            
            msg!("Submitting score to SOAR leaderboard: {}", leaderboard_key);
            
            // Check if we have the required remaining accounts
            if ctx.remaining_accounts.len() >= 6 {
                // In SOAR submit_score, we need these accounts:
                let soar_program = &ctx.remaining_accounts[0]; // SOAR program
                let game_account = &ctx.remaining_accounts[1]; // Game account
                let player_account = &ctx.remaining_accounts[2]; // Player account
                let authority = &ctx.remaining_accounts[3]; // Authority (signer)
                let leaderboard = &ctx.remaining_accounts[4]; // Leaderboard account
                let system_program = &ctx.remaining_accounts[5]; // System program
                
                msg!("Using SOAR program: {}", soar_program.key);
                
                // Create submit_score instruction data
                // Format: [discriminator(1), score(8)]
                let mut instruction_data = Vec::with_capacity(9);
                instruction_data.push(SUBMIT_SCORE_IX); // Discriminator for submit_score
                
                // Append score as little-endian bytes
                instruction_data.extend_from_slice(&total_value.to_le_bytes());
                
                // Create the instruction using the direct Solana program API
                let accounts = vec![
                    AccountMeta::new(*game_account.key, false),
                    AccountMeta::new(*player_account.key, false),
                    AccountMeta::new_readonly(*authority.key, true), // Authority must be a signer
                    AccountMeta::new(*leaderboard.key, false),
                    AccountMeta::new_readonly(*system_program.key, false),
                ];
                
                let instruction = Instruction {
                    program_id: *soar_program.key,
                    accounts,
                    data: instruction_data,
                };
                
                // Create account_infos array for invocation
                let account_infos = &[
                    soar_program.clone(),
                    game_account.clone(),
                    player_account.clone(),
                    authority.clone(),
                    leaderboard.clone(),
                    system_program.clone(),
                ];
                
                // Invoke the instruction
                match invoke(&instruction, account_infos) {
                    Ok(_) => {
                        msg!("Successfully submitted score {} to SOAR leaderboard", total_value);
                    },
                    Err(e) => {
                        msg!("Failed to submit score to SOAR: {:?}", e);
                        return Err(LeaderboardError::SoarSubmissionFailed.into());
                    }
                }
            } else {
                msg!("Not enough remaining accounts for SOAR submission (needed 6, got {})", 
                     ctx.remaining_accounts.len());
            }
        } else {
            // No SOAR arguments provided, just log
            msg!("SOAR: Would submit score {} to leaderboard", total_value);
        }
        
        msg!("Wealth calculation complete");
        
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub wallet: Wallet,
        pub price_usdc: Price,
        pub price_btc: Price, 
        //pub price_eth: Price,
        //pub price_sol: Price,
        pub price_aifi: Price,
    }
}

// Error codes for the leaderboard system
#[error_code]
pub enum LeaderboardError {
    #[msg("Calculation failed due to overflow")]
    CalculationOverflow,
    
    #[msg("SOAR submission failed")]
    SoarSubmissionFailed,
}