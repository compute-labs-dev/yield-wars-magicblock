#![allow(unexpected_cfgs)]

use bolt_lang::*;

declare_id!("8nrcTHv976M5VozmZQ86akuyo4MZPjdwctuDjE8wqLXm");

/// Wallet component that tracks currency balances for the player
///
/// This component stores the balances of different cryptocurrencies
/// that a player can own in the YieldWars game. It tracks:
/// - USDC: Base currency used for most transactions
/// - BTC: Bitcoin, a tradable cryptocurrency with fluctuating value
/// - ETH: Ethereum, a tradable cryptocurrency with fluctuating value
/// - SOL: Solana, a tradable cryptocurrency with fluctuating value
/// - AiFi: Special token produced by GPUs, used for advanced upgrades
#[component]
#[derive(Default)]
pub struct Wallet {
    /// Balance of USDC (stablecoin), the base currency
    pub usdc_balance: u64,
    
    /// Balance of Bitcoin (BTC)
    pub btc_balance: u64,
    
    /// Balance of Ethereum (ETH)
    pub eth_balance: u64,
    
    /// Balance of Solana (SOL)
    pub sol_balance: u64,
    
    /// Balance of AiFi tokens
    pub aifi_balance: u64,
}

/// Enum representing the different types of currencies in the game
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum CurrencyType {
    /// USDC stablecoin - base currency
    USDC,
    /// Bitcoin cryptocurrency
    BTC,
    /// Ethereum cryptocurrency
    ETH,
    /// Solana cryptocurrency
    SOL,
    /// AiFi token - special token for advanced upgrades
    AiFi,
}

/// Errors that can occur when interacting with the Wallet component
#[error_code]
pub enum WalletError {
    /// Not enough funds for the requested operation
    #[msg("Insufficient funds for the requested operation")]
    InsufficientFunds,
}