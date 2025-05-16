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

// Discriminators for SOAR program instructions
const INITIALIZE_PLAYER_DISCRIMINATOR: [u8; 8] = [59, 148, 25, 210, 111, 157, 4, 113]; // initialize_player
const REGISTER_PLAYER_DISCRIMINATOR: [u8; 8] = [139, 7, 101, 183, 218, 53, 238, 69];   // register_player
const SUBMIT_SCORE_DISCRIMINATOR: [u8; 8] = [230, 121, 107, 173, 249, 228, 43, 241];   // submit_score

// Seeds used in SOAR program PDAs
const PLAYER_SEED: &[u8] = b"player";
const PLAYER_SCORES_SEED: &[u8] = b"player-scores";

#[system]
pub mod leaderboard {
    /// Operation types supported by the Leaderboard system
    pub enum OperationType {
        /// Initialize a player in SOAR
        InitializePlayer = 0,
        /// Register player with a leaderboard
        RegisterPlayer = 1,
        /// Submit score to leaderboard
        SubmitScore = 2,
    }

    /// Arguments for the Leaderboard system
    #[arguments]
    pub struct Args {
        /// Type of operation to perform
        pub operation_type: u8,
    }

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
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
        match args.operation_type {
            // Initialize Player
            0 => {
                msg!("Initializing player in SOAR");
                if ctx.remaining_accounts.len() >= 8 {
                    let soar_program = &ctx.remaining_accounts[4]; // SOAR program
                    let payer = &ctx.remaining_accounts[5]; // Payer (signer)
                    let user = &ctx.remaining_accounts[5]; // User (same as payer for our case)
                    let player_account = &ctx.remaining_accounts[6]; // Player account
                    let system_program = &ctx.remaining_accounts[7]; // System program
                    
                    msg!("SOAR program ID: {}", soar_program.key);
                    msg!("Payer/User: {}", payer.key);
                    msg!("Player account: {}", player_account.key);
                    msg!("System program: {}", system_program.key);
                    
                    // Initialize player accounts - match InitializePlayer struct
                    let accounts = vec![
                        AccountMeta::new(*payer.key, true),         // payer (mutable and signer)
                        AccountMeta::new_readonly(*user.key, true), // user (signer)
                        AccountMeta::new(*player_account.key, false), // player_account (initialized by SOAR)
                        AccountMeta::new_readonly(*system_program.key, false), // system_program
                    ];
                    
                    // Create the instruction data with anchor discriminator
                    let mut instruction_data = Vec::with_capacity(8);
                    instruction_data.extend_from_slice(&INITIALIZE_PLAYER_DISCRIMINATOR);
                    
                    let instruction = Instruction {
                        program_id: *soar_program.key,
                        accounts,
                        data: instruction_data,
                    };
                    
                    // Create account_infos array in the same order as accounts
                    let account_infos = &[
                        soar_program.clone(),    // Program ID
                        payer.clone(),           // payer (mutable and signer)
                        user.clone(),            // user (signer)
                        player_account.clone(),  // player account (mutable)
                        system_program.clone(),  // system_program
                    ];
                    
                    // Log account info before CPI call
                    msg!("Invoking initialize_player instruction");
                    
                    // Invoke the instruction
                    match invoke(&instruction, account_infos) {
                        Ok(_) => {
                            msg!("Successfully initialized player in SOAR");
                        },
                        Err(e) => {
                            msg!("Failed to initialize player in SOAR: {:?}", e);
                            return Err(LeaderboardError::SoarSubmissionFailed.into());
                        }
                    }
                } else {
                    msg!("Not enough remaining accounts for SOAR player initialization");
                    return Err(LeaderboardError::SoarSubmissionFailed.into());
                }
            },
            
            // Register Player with Leaderboard
            1 => {
                msg!("Registering player with leaderboard in SOAR");
                if ctx.remaining_accounts.len() >= 11 {
                    let soar_program = &ctx.remaining_accounts[4]; // SOAR program
                    let payer = &ctx.remaining_accounts[5]; // Payer (signer)
                    let user = &ctx.remaining_accounts[5]; // User (same as payer in our case)
                    let player_account = &ctx.remaining_accounts[6]; // Player account
                    let game_account = &ctx.remaining_accounts[7]; // Game account
                    let leaderboard = &ctx.remaining_accounts[8]; // Leaderboard account
                    let new_list = &ctx.remaining_accounts[9]; // New PlayerScoresList account
                    let system_program = &ctx.remaining_accounts[10]; // System program
                    
                    msg!("SOAR program ID: {}", soar_program.key);
                    msg!("Payer/User: {}", payer.key);
                    msg!("Player account: {}", player_account.key);
                    msg!("Game account: {}", game_account.key);
                    msg!("Leaderboard: {}", leaderboard.key);
                    msg!("New list (player_scores): {}", new_list.key);
                    msg!("System program: {}", system_program.key);
                    
                    // Register player with leaderboard - match RegisterPlayer struct
                    let accounts = vec![
                        AccountMeta::new(*payer.key, true),           // payer (mutable and signer)
                        AccountMeta::new_readonly(*user.key, true),   // user (signer)
                        AccountMeta::new_readonly(*player_account.key, false), // player_account
                        AccountMeta::new_readonly(*game_account.key, false),   // game
                        AccountMeta::new_readonly(*leaderboard.key, false),    // leaderboard
                        AccountMeta::new(*new_list.key, false),       // new_list (player_scores PDA)
                        AccountMeta::new_readonly(*system_program.key, false), // system_program
                    ];
                    
                    // Create the instruction data with anchor discriminator
                    let mut instruction_data = Vec::with_capacity(8);
                    instruction_data.extend_from_slice(&REGISTER_PLAYER_DISCRIMINATOR);
                    
                    let instruction = Instruction {
                        program_id: *soar_program.key,
                        accounts,
                        data: instruction_data,
                    };
                    
                    // Create account_infos array in the same order as accounts
                    let account_infos = &[
                        soar_program.clone(),    // Program ID
                        payer.clone(),           // payer (mutable and signer)
                        user.clone(),            // user (signer)
                        player_account.clone(),  // player account
                        game_account.clone(),    // game
                        leaderboard.clone(),     // leaderboard
                        new_list.clone(),        // new_list (player_scores)
                        system_program.clone(),  // system_program
                    ];
                    
                    // Log account info before CPI call
                    msg!("Invoking register_player instruction");
                    
                    // Invoke the instruction
                    match invoke(&instruction, account_infos) {
                        Ok(_) => {
                            msg!("Successfully registered player with leaderboard in SOAR");
                        },
                        Err(e) => {
                            msg!("Failed to register player with leaderboard in SOAR: {:?}", e);
                            return Err(LeaderboardError::SoarSubmissionFailed.into());
                        }
                    }
                } else {
                    msg!("Not enough remaining accounts for SOAR player registration (needed 11, got {})",
                        ctx.remaining_accounts.len());
                    return Err(LeaderboardError::SoarSubmissionFailed.into());
                }
            },
            
            // Submit Score
            2 => {
                msg!("Submitting score to SOAR leaderboard");
                
                // Check if we have the required remaining accounts
                if ctx.remaining_accounts.len() >= 8 {
                    let soar_program = &ctx.remaining_accounts[4]; // SOAR program
                    let authority = &ctx.remaining_accounts[5]; // Authority (signer)
                    let player_account = &ctx.remaining_accounts[6]; // Player account
                    let game_account = &ctx.remaining_accounts[7]; // Game account
                    let leaderboard = &ctx.remaining_accounts[8]; // Leaderboard account
                    let top_entries = &ctx.remaining_accounts[9]; // Top entries account
                    let system_program = &ctx.remaining_accounts[10]; // System program
                    let player_scores = &ctx.remaining_accounts[11]; // Player scores account
                    
                    // Debug logging for account addresses
                    msg!("ctx.remaining_accounts.len(): {}", ctx.remaining_accounts.len());
                    msg!("SOAR program ID: {}", soar_program.key);
                    msg!("Authority: {}", authority.key);
                    msg!("Player account: {}", player_account.key);
                    msg!("Game account: {}", game_account.key);
                    msg!("Leaderboard: {}", leaderboard.key);
                    msg!("Player scores: {}", player_scores.key);
                    msg!("Top entries: {}", top_entries.key);
                    msg!("System program: {}", system_program.key);
                    
                    // Create the accounts in the exact order they appear in the SOAR program's SubmitScore struct
                    let accounts = vec![
                        AccountMeta::new(*authority.key, true),        // payer (must be mutable and signer)
                        AccountMeta::new_readonly(*authority.key, true), // authority (must be signer)
                        AccountMeta::new_readonly(*player_account.key, false), // player_account
                        AccountMeta::new_readonly(*game_account.key, false), // game
                        AccountMeta::new_readonly(*leaderboard.key, false), // leaderboard
                        AccountMeta::new(*player_scores.key, false),  // player_scores (must be mutable)
                        AccountMeta::new(*top_entries.key, false),     // top_entries (must be mutable)
                        AccountMeta::new_readonly(*system_program.key, false), // system_program
                    ];
                    
                    // Create instruction data with Anchor discriminator and score
                    let mut instruction_data = Vec::with_capacity(16);
                    instruction_data.extend_from_slice(&SUBMIT_SCORE_DISCRIMINATOR);
                    instruction_data.extend_from_slice(&total_value.to_le_bytes()); // Add score as u64
                    
                    let instruction = Instruction {
                        program_id: *soar_program.key,
                        accounts,
                        data: instruction_data,
                    };
                    
                    // Create account_infos array in the same order as accounts
                    let account_infos = &[
                        soar_program.clone(),    // Program ID (not in accounts list)
                        authority.clone(),       // payer (must be mutable and signer) 
                        authority.clone(),       // authority (must be signer)
                        player_account.clone(),  // player_account
                        game_account.clone(),    // game
                        leaderboard.clone(),     // leaderboard
                        player_scores.clone(),   // player_scores (must be mutable)
                        top_entries.clone(),     // top_entries (must be mutable)
                        system_program.clone(),  // system_program
                    ];
                    
                    // Extra debug to check all signer states
                    msg!("Authority is_signer: {}", authority.is_signer);
                    
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
                    msg!("Not enough remaining accounts for SOAR submission (needed 8, got {})", 
                            ctx.remaining_accounts.len());
                    return Err(LeaderboardError::SoarSubmissionFailed.into());
                }
            },
            
            // Invalid operation
            _ => {
                msg!("Invalid operation type: {}", args.operation_type);
                return Err(LeaderboardError::InvalidOperation.into());
            }
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
    
    #[msg("Invalid operation type")]
    InvalidOperation,
}