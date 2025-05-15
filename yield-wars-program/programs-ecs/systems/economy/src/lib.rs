#![allow(unexpected_cfgs)]

use bolt_lang::*;
use wallet::Wallet;
use price::Price;

declare_id!("CqPDvk7AJ7hVYsEvuFUDkZgYjnn5zy5YWEyinkRdFGb1");

/// EconomySystem handles all currency transactions and exchanges
///
/// This system allows entities to:
/// - Transfer currency between wallets
/// - Convert between different currencies
/// - Apply transaction fees
/// - Purchase game assets with currency
#[system]
pub mod economy {

    /// Transaction types supported by the EconomySystem
    pub enum TransactionType {
        /// Transfer currency from one wallet to another
        Transfer = 0,
        /// Exchange one currency for another
        Exchange = 1,
        /// Purchase an asset using currency
        Purchase = 2,
    }

    /// Supported currency types
    pub enum CurrencyType {
        /// USDC - base currency
        USDC = 0,
        /// Bitcoin
        BTC = 1,
        /// Ethereum
        ETH = 2,
        /// Solana
        SOL = 3,
        /// AiFi - game token
        AIFI = 4,
    }

    /// Arguments for the EconomySystem
    #[arguments]
    pub struct Args {
        /// Type of transaction to perform
        pub transaction_type: u8,
        /// Currency type for transfer and source for exchange
        pub currency_type: u8,
        /// Destination currency type for exchange
        pub destination_currency_type: u8,
        /// Amount of currency to transfer or exchange
        pub amount: u64,
    }

    /// Main execution function for the EconomySystem
    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        match args.transaction_type {
            // Transfer currency between wallets
            0 => {
                // Transfer currency logic
                
                let destination_wallet = &mut ctx.accounts.destination_wallet;
                let source_wallet = &mut ctx.accounts.source_wallet;
                let amount = args.amount;

                // Perform the transfer based on currency type
                match args.currency_type {
                    0 => { // USDC
                        // Check if source has enough funds
                        if source_wallet.usdc_balance < amount {
                            return Err(EconomyError::InsufficientFunds.into());
                        }
                        
                        // Update balances
                        source_wallet.usdc_balance = source_wallet.usdc_balance.checked_sub(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;

                        destination_wallet.usdc_balance = destination_wallet.usdc_balance.checked_add(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                    },
                    1 => { // BTC
                        if source_wallet.btc_balance < amount {
                            return Err(EconomyError::InsufficientFunds.into());
                        }
                        
                        source_wallet.btc_balance = source_wallet.btc_balance.checked_sub(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                        
                        destination_wallet.btc_balance = destination_wallet.btc_balance.checked_add(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                    },
                    2 => { // ETH
                        if source_wallet.eth_balance < amount {
                            return Err(EconomyError::InsufficientFunds.into());
                        }
                        
                        source_wallet.eth_balance = source_wallet.eth_balance.checked_sub(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                        
                        destination_wallet.eth_balance = destination_wallet.eth_balance.checked_add(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                    },
                    3 => { // SOL
                        if source_wallet.sol_balance < amount {
                            return Err(EconomyError::InsufficientFunds.into());
                        }
                        
                        source_wallet.sol_balance = source_wallet.sol_balance.checked_sub(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                        
                        destination_wallet.sol_balance = destination_wallet.sol_balance.checked_add(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                    },
                    4 => { // AIFI
                        if source_wallet.aifi_balance < amount {
                            return Err(EconomyError::InsufficientFunds.into());
                        }
                        
                        source_wallet.aifi_balance = source_wallet.aifi_balance.checked_sub(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                        
                        destination_wallet.aifi_balance = destination_wallet.aifi_balance.checked_add(amount)
                            .ok_or(EconomyError::ArithmeticOverflow)?;
                    },
                    _ => return Err(EconomyError::InvalidCurrencyType.into()),
                }
            },
            // Exchange currency based on market rates
            1 => {
                let source_currency = args.currency_type;
                let destination_currency = args.destination_currency_type;
                let source_amount = args.amount;
                
                // Exchange currency logic
                // Validate currency types
                if source_currency > 4 || destination_currency > 4 {
                    return Err(EconomyError::InvalidCurrencyType.into());
                }
                
                // Don't allow exchange between the same currency
                if source_currency == destination_currency {
                    return Err(EconomyError::SameCurrencyExchange.into());
                }
                
                let source_wallet = &mut ctx.accounts.destination_wallet;
                let source_price = &ctx.accounts.source_price;
                let destination_price = &ctx.accounts.destination_price;
                
                // Check if prices are enabled
                if !source_price.price_updates_enabled || !destination_price.price_updates_enabled {
                    return Err(EconomyError::PriceUpdatesDisabled.into());
                }
                
                // Verify price components are for the correct currencies
                if source_price.price_type != source_currency || destination_price.price_type != destination_currency {
                    return Err(EconomyError::CurrencyPriceMismatch.into());
                }
                
                // Check if user has enough of the source currency
                match source_currency {
                    0 => if source_wallet.usdc_balance < source_amount { return Err(EconomyError::InsufficientFunds.into()); },
                    1 => if source_wallet.btc_balance < source_amount { return Err(EconomyError::InsufficientFunds.into()); },
                    2 => if source_wallet.eth_balance < source_amount { return Err(EconomyError::InsufficientFunds.into()); },
                    3 => if source_wallet.sol_balance < source_amount { return Err(EconomyError::InsufficientFunds.into()); },
                    4 => if source_wallet.aifi_balance < source_amount { return Err(EconomyError::InsufficientFunds.into()); },
                    _ => return Err(EconomyError::InvalidCurrencyType.into()),
                }
                
                // Calculate exchange amount
                // Formula: (source_amount * source_price) / destination_price
                let source_value = source_amount
                    .checked_mul(source_price.current_price)
                    .ok_or(EconomyError::ArithmeticOverflow)?;
                    
                // Apply transaction fee (1% of transaction value)
                let fee_multiplier = 99; // 99% of value (1% fee)
                let source_value_after_fee = source_value
                    .checked_mul(fee_multiplier)
                    .ok_or(EconomyError::ArithmeticOverflow)?
                    .checked_div(100)
                    .ok_or(EconomyError::ArithmeticOverflow)?;
                    
                // Calculate destination amount
                let destination_amount = source_value_after_fee
                    .checked_div(destination_price.current_price)
                    .ok_or(EconomyError::ArithmeticOverflow)?;
                    
                // Make sure we're not giving away free money
                if destination_amount == 0 {
                    return Err(EconomyError::ExchangeAmountTooSmall.into());
                }
                
                // Deduct source currency
                match source_currency {
                    0 => source_wallet.usdc_balance = source_wallet.usdc_balance.checked_sub(source_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    1 => source_wallet.btc_balance = source_wallet.btc_balance.checked_sub(source_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    2 => source_wallet.eth_balance = source_wallet.eth_balance.checked_sub(source_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    3 => source_wallet.sol_balance = source_wallet.sol_balance.checked_sub(source_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    4 => source_wallet.aifi_balance = source_wallet.aifi_balance.checked_sub(source_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    _ => return Err(EconomyError::InvalidCurrencyType.into()),
                }
                
                // Add destination currency
                match destination_currency {
                    0 => source_wallet.usdc_balance = source_wallet.usdc_balance.checked_add(destination_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    1 => source_wallet.btc_balance = source_wallet.btc_balance.checked_add(destination_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    2 => source_wallet.eth_balance = source_wallet.eth_balance.checked_add(destination_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    3 => source_wallet.sol_balance = source_wallet.sol_balance.checked_add(destination_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    4 => source_wallet.aifi_balance = source_wallet.aifi_balance.checked_add(destination_amount).ok_or(EconomyError::ArithmeticOverflow)?,
                    _ => return Err(EconomyError::InvalidCurrencyType.into()),
                }
            },
            // Initialize a player wallet with starting funds
            2 => {
                let usdc_amount = args.amount;
                
                // Initialize wallet logic
                let destination_wallet = &mut ctx.accounts.destination_wallet;
                
                // Check for overflow
                destination_wallet.usdc_balance = destination_wallet.usdc_balance
                    .checked_add(usdc_amount)
                    .ok_or(EconomyError::ArithmeticOverflow)?;
            },
            _ => {}
        }
        
        Ok(ctx.accounts)
    }
    
    /// Components required for the EconomySystem
    #[system_input]
    pub struct Components {
        pub source_wallet: Wallet,
        pub destination_wallet: Wallet,
        pub source_price: Price,
        pub destination_price: Price,
    }

    /// Errors that can occur in the EconomySystem
    #[error_code]
    pub enum EconomyError {
        /// Insufficient funds for transaction
        #[msg("Insufficient funds for transaction")]
        InsufficientFunds,
        
        /// Arithmetic overflow during calculation
        #[msg("Arithmetic overflow in calculation")]
        ArithmeticOverflow,
        
        /// Invalid currency type specified
        #[msg("Invalid currency type specified")]
        InvalidCurrencyType,
        
        /// Cannot exchange between the same currency
        #[msg("Cannot exchange between the same currency")]
        SameCurrencyExchange,
        
        /// Price updates are disabled
        #[msg("Price updates are currently disabled")]
        PriceUpdatesDisabled,
        
        /// Currency type doesn't match price component
        #[msg("Currency type does not match price component")]
        CurrencyPriceMismatch,
        
        /// Exchange amount is too small
        #[msg("Exchange amount is too small")]
        ExchangeAmountTooSmall,
    }
}