#![allow(unexpected_cfgs)]

use bolt_lang::*;
use wallet::Wallet;
use ownership::Ownership;
use price::Price;

declare_id!("EE1nNQ7zsRFqnR5E6EUDjjpMMmsa1Y9NzX1ukQ2ks8WC");

/// Market system for asset trading and marketplace functionality
///
/// This system allows players to:
/// - List assets for sale
/// - Purchase assets from other players
/// - Manage asset listings
/// - Transfer assets between entities
#[system]
pub mod market {

    /// Operation types supported by the Market system
    pub enum OperationType {
        /// Create a listing for an asset
        CreateListing = 0,
        /// Purchase an asset from a listing
        PurchaseAsset = 1,
        /// Cancel a listing
        CancelListing = 2,
        /// Update a listing's price
        UpdateListing = 3,
        /// Transfer asset to another entity
        TransferAsset = 4,
    }

    /// Status values for marketplace listings
    pub enum ListingStatus {
        /// Asset is available for purchase
        Active = 0,
        /// Asset has been sold
        Sold = 1,
        /// Listing has been cancelled
        Cancelled = 2,
    }

    /// Asset types that can be traded in the marketplace
    pub enum AssetType {
        /// Graphics Processing Unit
        GPU = 0,
        /// Data Center
        DataCenter = 1,
        /// Land parcel
        Land = 2,
        /// Energy contract
        EnergyContract = 3,
    }

    /// Payment methods accepted in the marketplace
    pub enum PaymentMethod {
        /// USDC stablecoin
        USDC = 0,
        /// AiFi token
        AiFi = 1,
    }

    /// Arguments for the Market system
    #[arguments]
    pub struct Args {
        /// Type of operation to perform
        pub operation_type: u8,
        /// Asset type being traded
        pub asset_type: u8,
        /// Asset ID
        pub asset_id: u64,
        /// Status of the listing
        pub listing_status: u8,
        /// Price of the asset
        pub price: u64,
        /// Currency used for payment
        pub payment_method: u8,
        /// Seller's entity ID
        pub seller_entity_id: u64,
        /// Buyer's entity ID
        pub buyer_entity_id: u64,
        /// Listing ID 
        pub listing_id: u64,
    }

    /// Main execution function for the Market system
    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        // Convert a u64 asset ID to a Pubkey for ownership checks
        // This function creates a consistent, stable PublicKey for each entity ID
        fn asset_id_to_pubkey(asset_id: u64) -> bolt_lang::Pubkey {
            // Create a 32-byte array for the Pubkey
            let mut bytes = [0u8; 32];
            
            // Ensure we're using a consistent byte representation
            // Just use the first 8 bytes for the entity ID in little-endian format
            bytes[0..8].copy_from_slice(&asset_id.to_le_bytes());
            
            // Add a consistent prefix to the remaining bytes to make these
            // keys distinct from other types of keys in the system
            // Using bytes 8-15 for a marker
            if bytes.len() > 8 {
                bytes[8..16].copy_from_slice(b"ENTITYID");
            }
            
            // Create Pubkey from the byte array
            let pubkey = bolt_lang::Pubkey::new_from_array(bytes);
            
            // Log the entity ID and its corresponding pubkey for debugging
            msg!("DEBUG: Asset ID {} converted to pubkey: {}", asset_id, pubkey);
            
            pubkey
        }

        // Convert a u64 entity ID to a Pubkey for ownership checks
        // For consistency, we use the same function as asset_id_to_pubkey
        fn entity_id_to_pubkey(entity_id: u64) -> bolt_lang::Pubkey {
            // Just call asset_id_to_pubkey since the logic is identical
            return asset_id_to_pubkey(entity_id);
        }

        // Check if an entity (seller/buyer) owns a specific asset
        fn check_entity_owns_asset(
            ownership: &ownership::Ownership,
            _entity_id: u64,   // Only used for debugging log
            _entity_type: u8,   // Only used for debugging log
            asset_id: u64,
            asset_type: u8
        ) -> bool {
            // Convert the asset ID to PublicKey using our consistent function
            let asset_pubkey = asset_id_to_pubkey(asset_id);
            
            msg!("Checking if entity owns asset: ID={}, type={}, pubkey={}", asset_id, asset_type, asset_pubkey);
            msg!("Ownership has {} entities", ownership.owned_entities.len());
            
            // Iterate through owned entities to find the matching asset
            for i in 0..ownership.owned_entities.len() {
                if i < ownership.owned_entity_types.len() {
                    let owned_entity = ownership.owned_entities[i];
                    let owned_type = ownership.owned_entity_types[i];
                    
                    if owned_type == asset_type && owned_entity == asset_pubkey {
                        msg!("Found matching asset in ownership!");
                        return true;
                    }
                }
            }
            
            msg!("Asset not found in ownership records");
            false
        }

        // Remove an asset from an entity's ownership
        fn remove_asset(ownership: &mut ownership::Ownership, asset_type: u8, asset_id: u64) -> Result<()> {
            let asset_id_pubkey = asset_id_to_pubkey(asset_id);
            msg!("Attempting to remove asset: ID={}, type={}", asset_id, asset_type);
            
            // Find the index of the asset in the ownership arrays
            let mut asset_index = None;
            for i in 0..ownership.owned_entities.len() {
                if i < ownership.owned_entity_types.len() && 
                   ownership.owned_entity_types[i] == asset_type && 
                   ownership.owned_entities[i] == asset_id_pubkey {
                    asset_index = Some(i);
                    break;
                }
            }
            
            // If found, remove the asset by replacing it with the last element and popping
            if let Some(index) = asset_index {
                let last_index = ownership.owned_entities.len() - 1;
                
                if index != last_index {
                    // Only swap if not already the last element
                    ownership.owned_entities[index] = ownership.owned_entities[last_index];
                    if last_index < ownership.owned_entity_types.len() {
                        ownership.owned_entity_types[index] = ownership.owned_entity_types[last_index];
                    }
                }
                
                // Remove the last element
                ownership.owned_entities.pop();
                if !ownership.owned_entity_types.is_empty() {
                    ownership.owned_entity_types.pop();
                }
                
                msg!("Successfully removed asset from ownership");
                Ok(())
            } else {
                // Asset not found, cannot remove
                msg!("Failed to remove asset - not found in ownership");
                Err(MarketError::NotTheOwner.into())
            }
        }

        // Add an asset to an entity's ownership
        fn add_asset(ownership: &mut ownership::Ownership, asset_type: u8, asset_id: u64) -> Result<()> {
            let asset_id_pubkey = asset_id_to_pubkey(asset_id);
            msg!("Attempting to add asset: ID={}, type={}", asset_id, asset_type);
            
            // Check if the asset is already in ownership - using 0 for entity_id and entity_type here
            // as we're checking if the asset itself is already owned, not by a specific entity
            if check_entity_owns_asset(ownership, 0, 0, asset_id, asset_type) {
                msg!("Asset already exists in ownership, cannot add");
                return Err(MarketError::InvalidListing.into());
            }
            
            // Add the asset to the ownership arrays
            ownership.owned_entities.push(asset_id_pubkey);
            ownership.owned_entity_types.push(asset_type);
            
            msg!("Successfully added asset to ownership");
            Ok(())
        }
        
        match args.operation_type {
            // Create a listing for an asset
            0 => {
                let seller_ownership = &mut ctx.accounts.seller_ownership;
                let price_component = &mut ctx.accounts.price;
                
                // Validate the price is reasonable
                if args.price == 0 {
                    return Err(MarketError::InvalidPrice.into());
                }

                // Validate payment method
                if args.payment_method > 1 {
                    return Err(MarketError::InvalidPaymentMethod.into());
                }
                
                // Store the listing in the price component
                price_component.current_price = args.price;
                price_component.price_type = args.payment_method; // Use payment_method as price_type
                
                // Store asset metadata in the price component fields
                price_component.supply_factor = args.asset_type.into();
                price_component.demand_factor = (args.asset_id & 0xFFFFFFFF) as u32; // Lower 32 bits of asset ID
                
                // Record additional ID information in price history array (if needed)
                if !price_component.price_history.is_empty() {
                    price_component.price_history[0] = ((args.asset_id >> 32) & 0xFFFFFFFF) as u64; // Upper 32 bits
                }
                
                // Set the listing as active
                price_component.price_updates_enabled = true;
                
                // Store the listing ID in the history index field
                price_component.history_index = (args.listing_id & 0xFF) as u8;
                
                msg!("Created listing for asset type {} with ID {}, price: {}", 
                    args.asset_type, args.asset_id, args.price);
            },
            
            // Purchase an asset from a listing
            1 => {
                let buyer_wallet = &mut ctx.accounts.buyer_wallet;
                let seller_wallet = &mut ctx.accounts.seller_wallet;
                let buyer_ownership = &mut ctx.accounts.buyer_ownership;
                let seller_ownership = &mut ctx.accounts.seller_ownership;
                let price_component = &mut ctx.accounts.price;
                
                // Verify the listing exists and is active
                if !price_component.price_updates_enabled {
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Extract asset details from price component
                let stored_asset_type = price_component.supply_factor as u8;
                let stored_asset_id_lower = price_component.demand_factor as u64;
                
                // Reconstruct full asset ID if higher bits were stored
                let mut full_asset_id = stored_asset_id_lower;
                if !price_component.price_history.is_empty() {
                    let asset_id_upper = price_component.price_history[0] as u64;
                    full_asset_id |= asset_id_upper << 32;
                }
                
                // Log asset information for debugging
                msg!("Listing info - Asset type: {}, Asset ID: {}, Stored Asset ID lower: {}, Full Asset ID: {}", 
                    stored_asset_type, args.asset_id, stored_asset_id_lower, full_asset_id);

                // Verify asset details match - for 64-bit asset IDs we need to check all bits
                if stored_asset_type != args.asset_type || 
                   ((!price_component.price_history.is_empty() && full_asset_id != args.asset_id) ||
                    (price_component.price_history.is_empty() && stored_asset_id_lower != (args.asset_id & 0xFFFFFFFF))) {
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Verify the price matches
                let stored_price = price_component.current_price;
                if stored_price != args.price {
                    return Err(MarketError::InvalidPrice.into());
                }
                
                // Verify payment method matches
                let stored_payment_method = price_component.price_type;
                if stored_payment_method != args.payment_method {
                    return Err(MarketError::InvalidPaymentMethod.into());
                }
                
                // Verify seller owns the asset
                if !check_entity_owns_asset(seller_ownership, args.seller_entity_id, 0 /* Player */, args.asset_id, args.asset_type) {
                    msg!("Seller is not the owner of asset ID={} type={}", args.asset_id, args.asset_type);
                    return Err(MarketError::NotTheOwner.into());
                }
                
                // Verify buyer has sufficient funds
                let has_funds = match args.payment_method {
                    0 => buyer_wallet.usdc_balance >= args.price,
                    1 => buyer_wallet.aifi_balance >= args.price,
                    _ => return Err(MarketError::InvalidPaymentMethod.into()),
                };
                
                if !has_funds {
                    return Err(MarketError::InsufficientFunds.into());
                }
                
                // Log wallet balances for debugging
                msg!("Purchase - Buyer balance before: {}, Seller balance before: {}", 
                    buyer_wallet.usdc_balance, seller_wallet.usdc_balance);
                
                // Transfer funds from buyer to seller
                match args.payment_method {
                    0 => {
                        // Transfer USDC
                        buyer_wallet.usdc_balance = buyer_wallet.usdc_balance
                            .checked_sub(args.price)
                            .ok_or(MarketError::ArithmeticOverflow)?;
                            
                        seller_wallet.usdc_balance = seller_wallet.usdc_balance
                            .checked_add(args.price)
                            .ok_or(MarketError::ArithmeticOverflow)?;
                    },
                    1 => {
                        // Transfer AiFi
                        buyer_wallet.aifi_balance = buyer_wallet.aifi_balance
                            .checked_sub(args.price)
                            .ok_or(MarketError::ArithmeticOverflow)?;
                            
                        seller_wallet.aifi_balance = seller_wallet.aifi_balance
                            .checked_add(args.price)
                            .ok_or(MarketError::ArithmeticOverflow)?;
                    },
                    _ => return Err(MarketError::InvalidPaymentMethod.into()),
                }
                
                // Log wallet balances after transfer
                msg!("Purchase - Buyer balance after: {}, Seller balance after: {}", 
                    buyer_wallet.usdc_balance, seller_wallet.usdc_balance);
                
                // Transfer ownership of the asset
                remove_asset(seller_ownership, args.asset_type, args.asset_id)?;
                add_asset(buyer_ownership, args.asset_type, args.asset_id)?;
                
                // Mark the listing as sold
                price_component.price_updates_enabled = false;
                price_component.price_type = args.listing_status; // Set to SOLD (1)
                
                msg!("Asset purchased successfully: type {} with ID {}, price: {}", 
                     args.asset_type, args.asset_id, args.price);
            },
            
            // Cancel a listing
            2 => {
                let seller_ownership = &mut ctx.accounts.seller_ownership;
                let price_component = &mut ctx.accounts.price;
                
                // Verify the listing exists and is active
                if !price_component.price_updates_enabled {
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Extract asset details from price component
                let stored_asset_type = price_component.supply_factor as u8;
                let stored_asset_id_lower = price_component.demand_factor as u64;
                
                // Reconstruct full asset ID if higher bits were stored
                let mut full_asset_id = stored_asset_id_lower;
                if !price_component.price_history.is_empty() {
                    let asset_id_upper = price_component.price_history[0] as u64;
                    full_asset_id |= asset_id_upper << 32;
                }
                
                // Verify asset details match - for 64-bit asset IDs we need to check all bits
                if stored_asset_type != args.asset_type || 
                   ((!price_component.price_history.is_empty() && full_asset_id != args.asset_id) ||
                    (price_component.price_history.is_empty() && stored_asset_id_lower != (args.asset_id & 0xFFFFFFFF))) {
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Verify the seller still owns the asset
                if !check_entity_owns_asset(seller_ownership, args.seller_entity_id, 0 /* Player */, args.asset_id, args.asset_type) {
                    msg!("Seller is not the owner of asset ID={} type={}", args.asset_id, args.asset_type);
                    return Err(MarketError::NotTheOwner.into());
                }
                
                // Mark the listing as cancelled
                price_component.price_updates_enabled = false;
                price_component.price_type = args.listing_status; // Set to CANCELLED (2)
                
                msg!("Listing cancelled for asset type {} with ID {}", args.asset_type, args.asset_id);
            },
            
            // Update a listing's price
            3 => {
                let seller_ownership = &mut ctx.accounts.seller_ownership;
                let price_component = &mut ctx.accounts.price;
                
                // Verify the listing exists and is active
                if !price_component.price_updates_enabled {
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Extract asset details from price component
                let stored_asset_type = price_component.supply_factor as u8;
                let stored_asset_id_lower = price_component.demand_factor as u64;
                
                // Reconstruct full asset ID if higher bits were stored
                let mut full_asset_id = stored_asset_id_lower;
                if !price_component.price_history.is_empty() {
                    let asset_id_upper = price_component.price_history[0] as u64;
                    full_asset_id |= asset_id_upper << 32;
                }
                
                // Verify asset details match - for 64-bit asset IDs we need to check all bits
                if stored_asset_type != args.asset_type || 
                   ((!price_component.price_history.is_empty() && full_asset_id != args.asset_id) ||
                    (price_component.price_history.is_empty() && stored_asset_id_lower != (args.asset_id & 0xFFFFFFFF))) {
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Verify the new price is valid
                if args.price == 0 {
                    return Err(MarketError::InvalidPrice.into());
                }
                
                // Store the previous price
                price_component.previous_price = price_component.current_price;
                
                // Update the listing price
                price_component.current_price = args.price;
                
                // Update the last update time
                price_component.last_update_time = i64::try_from(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs()
                ).unwrap_or(0);
                
                msg!("Listing updated with new price for asset type {} with ID {}, new price: {}", 
                     args.asset_type, args.asset_id, args.price);
            },
            
            // Transfer asset to another entity
            4 => {
                let seller_ownership = &mut ctx.accounts.seller_ownership;
                let buyer_ownership = &mut ctx.accounts.buyer_ownership;
                
                // Check if the recipient already owns an asset with the same ID
                if check_entity_owns_asset(buyer_ownership, args.buyer_entity_id, 0 /* Player */, args.asset_id, args.asset_type) {
                    msg!("Buyer already owns asset ID={} type={}", args.asset_id, args.asset_type);
                    return Err(MarketError::InvalidListing.into());
                }
                
                // Transfer ownership of the asset
                remove_asset(seller_ownership, args.asset_type, args.asset_id)?;
                add_asset(buyer_ownership, args.asset_type, args.asset_id)?;
                
                // Log the transfer with descriptive asset type
                let asset_type_name = match args.asset_type {
                    0 => "GPU",
                    1 => "Data Center",
                    2 => "Land",
                    3 => "Energy Contract",
                    _ => "Unknown",
                };
                
                msg!("Asset transferred: {} with ID {}", asset_type_name, args.asset_id);
            },
            
            _ => return Err(MarketError::InvalidOperation.into()),
        }
        
        Ok(ctx.accounts)
    }

    /// Components required for the Market system
    #[system_input]
    pub struct Components {
        pub seller_wallet: Wallet,
        pub buyer_wallet: Wallet,
        pub seller_ownership: Ownership,
        pub buyer_ownership: Ownership,
        pub price: Price,
    }
}

/// Errors that can occur in the Market system
#[error_code]
pub enum MarketError {
    /// Seller does not own the asset
    #[msg("Seller is not the owner of this asset")]
    NotTheOwner,
    
    /// Invalid price for listing or auction
    #[msg("Invalid price for listing")]
    InvalidPrice,
    
    /// Buyer has insufficient funds
    #[msg("Insufficient funds for purchase")]
    InsufficientFunds,
    
    /// Invalid payment method specified
    #[msg("Invalid payment method specified")]
    InvalidPaymentMethod,
    
    /// Listing not found or invalid
    #[msg("Listing not found or invalid")]
    InvalidListing,
    
    /// Arithmetic overflow during calculation
    #[msg("Arithmetic overflow in calculation")]
    ArithmeticOverflow,
    
    /// Invalid operation type specified
    #[msg("Invalid operation type specified")]
    InvalidOperation,
}