#![allow(unexpected_cfgs)]

use bolt_lang::*;
use ownership::Ownership;

declare_id!("AFiHj9n9khQjMG1U4dSoVVD7KLnVtgrcgvtfZcZHR2L3");

/// AssignOwnership system for managing entity ownership relationships
///
/// This system allows:
/// - Initializing ownership settings
/// - Assigning resources to wallets
/// - Removing resource ownership
/// - Transferring resource ownership between wallets
/// - Batch updating ownership records
#[system]
pub mod assign_ownership {

    /// Operation types supported by the AssignOwnership system
    pub enum OperationType {
        /// Initialize ownership settings
        Initialize = 0,
        /// Assign resource to wallet
        AssignToWallet = 1,
        /// Remove resource ownership
        RemoveOwnership = 2,
        /// Transfer resource between wallets
        TransferOwnership = 3,
        /// Batch update ownership records
        BatchUpdate = 4,
    }

    /// Arguments for the AssignOwnership system
    #[arguments]
    pub struct Args {
        /// Type of operation to perform
        pub operation_type: u8,
        /// Owner type (0 = Player, 1 = GPU, etc.)
        pub owner_type: u8,
        /// Entity ID to add, remove, or transfer
        pub entity_id: u64,
        /// Entity type of the managed entity
        pub entity_type: u8,
        /// Destination owner entity ID for transfers
        pub destination_entity_id: u64,
        /// The owner entity's ID (used for bidirectional tracking)
        pub owner_entity_id: u64,
    }

    /// Main execution function for the AssignOwnership system
    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        // Convert a u64 entity ID to a Pubkey for ownership tracking
        // This function creates a consistent, stable PublicKey for each entity ID
        fn entity_id_to_pubkey(entity_id: u64) -> bolt_lang::Pubkey {
            // Create a 32-byte array for the Pubkey
            let mut bytes = [0u8; 32];
            
            // Ensure we're using a consistent byte representation
            // Just use the first 8 bytes for the entity ID in little-endian format
            bytes[0..8].copy_from_slice(&entity_id.to_le_bytes());
            
            // Add a consistent prefix to the remaining bytes to make these
            // keys distinct from other types of keys in the system
            // Using bytes 8-15 for a marker
            if bytes.len() > 8 {
                bytes[8..16].copy_from_slice(b"ENTITYID");
            }
            
            // Create Pubkey from the byte array
            let pubkey = bolt_lang::Pubkey::new_from_array(bytes);
            
            // Log the entity ID and its corresponding pubkey for debugging
            msg!("DEBUG: Entity ID {} converted to pubkey: {}", entity_id, pubkey);
            
            pubkey
        }
        
        match args.operation_type {
            // Initialize ownership settings
            0 => {
                let ownership = &mut ctx.accounts.owner_ownership;
                
                // Set the owner type
                ownership.owner_type = args.owner_type;
                
                // Clear existing owned entities
                ownership.owned_entities = Vec::new();
                ownership.owned_entity_types = Vec::new();
                
                // Reset owner_entity to None (this entity is not owned by anyone)
                ownership.owner_entity = None;
                
                msg!("Initialized ownership for entity type: {}", args.owner_type);
            },
            
            // Assign resource to wallet
            1 => {
                let ownership = &mut ctx.accounts.owner_ownership;
                let destination_ownership = &mut ctx.accounts.destination_ownership;
                
                // Make sure we're assigning to a wallet component
                if args.owner_type != ownership::EntityType::Player.to_u8() {
                    msg!("Cannot assign to non-wallet entity type {}", args.owner_type);
                    return Err(OwnershipError::InvalidEntityType.into());
                }
                
                // Convert entity ID to Pubkey
                let entity_pubkey = entity_id_to_pubkey(args.entity_id);
                msg!("Attempting to assign entity ID {} to wallet. Entity pubkey: {}", args.entity_id, entity_pubkey);
                
                // Print current ownership state for debugging
                msg!("Before assignment: Owner has {} entities", ownership.owned_entities.len());
                if !ownership.owned_entities.is_empty() {
                    for i in 0..ownership.owned_entities.len() {
                        if i < ownership.owned_entity_types.len() {
                            msg!("Entity {}: pubkey={}, type={}", 
                                i, 
                                ownership.owned_entities[i], 
                                ownership.owned_entity_types[i]);
                        }
                    }
                }
                
                // Check if the entity is already owned
                let mut already_owned = false;
                for i in 0..ownership.owned_entities.len() {
                    if ownership.owned_entities[i] == entity_pubkey {
                        // Already owned, don't add again
                        msg!("Entity {} already owned, skipping", args.entity_id);
                        already_owned = true;
                        break;
                    }
                }
                
                if !already_owned {
                    // Check if we would exceed the maximum length
                    if ownership.owned_entities.len() >= 32 {
                        msg!("Cannot add more entities, maximum limit reached");
                        return Err(OwnershipError::TooManyEntities.into());
                    }
                    
                    // Add the entity to ownership arrays
                    ownership.owned_entities.push(entity_pubkey);
                    ownership.owned_entity_types.push(args.entity_type);
                    
                    // Update the entity's ownership component to point back to the owner
                    // Check if we're assigning to the entity's ownership component
                    // The destination_ownership should be the owned entity's component
                    // No need to check type, just update the bidirectional relationship
                    let wallet_entity_id = if args.owner_entity_id != 0 {
                        args.owner_entity_id
                    } else {
                        // Fallback - use program ID hash as u64
                        let program_id_bytes = ctx.program_id.to_bytes();
                        let mut entity_id: u64 = 0;
                        // Use first 8 bytes of program ID to create u64
                        if program_id_bytes.len() >= 8 {
                            entity_id = u64::from_le_bytes([
                                program_id_bytes[0], program_id_bytes[1], 
                                program_id_bytes[2], program_id_bytes[3],
                                program_id_bytes[4], program_id_bytes[5],
                                program_id_bytes[6], program_id_bytes[7],
                            ]);
                        }
                        entity_id
                    };
                    
                    let owner_entity_pubkey = entity_id_to_pubkey(wallet_entity_id);
                    
                    // Always update the entity's owner reference in destination_ownership
                    destination_ownership.owner_entity = Some(owner_entity_pubkey);
                    msg!("Updated entity ownership with owner ID {}, pubkey: {}", wallet_entity_id, owner_entity_pubkey);
                    
                    msg!("Assigned entity {} of type {} to wallet. Current owned entity count: {}", 
                        args.entity_id, args.entity_type, ownership.owned_entities.len());
                    
                    // Print the updated ownership state for debugging
                    msg!("After assignment: Owner has {} entities", ownership.owned_entities.len());
                    for i in 0..ownership.owned_entities.len() {
                        if i < ownership.owned_entity_types.len() {
                            msg!("Entity {}: pubkey={}, type={}", 
                                i, 
                                ownership.owned_entities[i], 
                                ownership.owned_entity_types[i]);
                        }
                    }
                }
            },
            
            // Remove resource ownership
            2 => {
                let ownership = &mut ctx.accounts.owner_ownership;
                let destination_ownership = &mut ctx.accounts.destination_ownership;
                
                // Convert entity ID to Pubkey
                let entity_pubkey = entity_id_to_pubkey(args.entity_id);
                msg!("Attempting to remove entity: ID={}, type={}, pubkey={}", 
                     args.entity_id, args.entity_type, entity_pubkey);
                
                // Find and remove the entity
                let mut found_index: Option<usize> = None;
                
                for i in 0..ownership.owned_entities.len() {
                    if ownership.owned_entities[i] == entity_pubkey {
                        found_index = Some(i);
                        break;
                    }
                }
                
                if let Some(index) = found_index {
                    // Capture the entity type before removal
                    let entity_type = if index < ownership.owned_entity_types.len() {
                        ownership.owned_entity_types[index]
                    } else {
                        args.entity_type // fallback to the provided type
                    };
                    
                    // Remove by swapping with the last element and popping
                    let last_index = ownership.owned_entities.len() - 1;
                    
                    if index != last_index {
                        // Only swap if not already the last element
                        ownership.owned_entities[index] = ownership.owned_entities[last_index];
                        
                        if index < ownership.owned_entity_types.len() && last_index < ownership.owned_entity_types.len() {
                            ownership.owned_entity_types[index] = ownership.owned_entity_types[last_index];
                        }
                    }
                    
                    // Remove the last element
                    ownership.owned_entities.pop();
                    if !ownership.owned_entity_types.is_empty() {
                        ownership.owned_entity_types.pop();
                    }
                    
                    // Update the entity's ownership if it matches
                    if destination_ownership.owner_type == entity_type {
                        // Clear the owner reference
                        destination_ownership.owner_entity = None;
                        msg!("Cleared owner reference from entity");
                    }
                    
                    msg!("Removed entity {} from ownership", args.entity_id);
                } else {
                    msg!("Entity {} not found in ownership", args.entity_id);
                    return Err(OwnershipError::EntityNotFound.into());
                }
            },
            
            // Transfer resource between wallets
            3 => {
                let source_ownership = &mut ctx.accounts.owner_ownership;
                let destination_ownership = &mut ctx.accounts.destination_ownership;
                
                // Validate source and destination are both wallet entities
                if source_ownership.owner_type != ownership::EntityType::Player.to_u8() || 
                   destination_ownership.owner_type != ownership::EntityType::Player.to_u8() {
                    msg!("Both source and destination must be wallet entities");
                    return Err(OwnershipError::InvalidEntityType.into());
                }
                
                // Convert entity ID to Pubkey
                let entity_pubkey = entity_id_to_pubkey(args.entity_id);
                msg!("Attempting to transfer entity: ID={}, type={}, pubkey={}", 
                     args.entity_id, args.entity_type, entity_pubkey);
                
                // Find the entity in the source ownership
                let mut found_index: Option<usize> = None;
                let mut entity_type: u8 = 0;
                
                for i in 0..source_ownership.owned_entities.len() {
                    if source_ownership.owned_entities[i] == entity_pubkey {
                        found_index = Some(i);
                        if i < source_ownership.owned_entity_types.len() {
                            entity_type = source_ownership.owned_entity_types[i];
                        }
                        break;
                    }
                }
                
                if let Some(index) = found_index {
                    // First check if destination already owns this entity
                    for i in 0..destination_ownership.owned_entities.len() {
                        if destination_ownership.owned_entities[i] == entity_pubkey {
                            msg!("Entity {} already owned by destination", args.entity_id);
                            return Err(OwnershipError::AlreadyOwned.into());
                        }
                    }
                    
                    // Check if destination has enough space
                    if destination_ownership.owned_entities.len() >= 32 {
                        msg!("Destination ownership array would exceed maximum length");
                        return Err(OwnershipError::TooManyEntities.into());
                    }
                    
                    // Log ownership before transfer
                    msg!("Before transfer - Source has {} entities, Destination has {} entities", 
                         source_ownership.owned_entities.len(), 
                         destination_ownership.owned_entities.len());
                    
                    // Update the entity's owner reference
                    // (This would be handled by a subsequent call that updates the actual entity component)
                    
                    // Remove from source using swap and pop
                    let last_index = source_ownership.owned_entities.len() - 1;
                    
                    if index != last_index {
                        // Only swap if not already the last element
                        source_ownership.owned_entities[index] = source_ownership.owned_entities[last_index];
                        
                        if index < source_ownership.owned_entity_types.len() && last_index < source_ownership.owned_entity_types.len() {
                            source_ownership.owned_entity_types[index] = source_ownership.owned_entity_types[last_index];
                        }
                    }
                    
                    // Remove the last element
                    source_ownership.owned_entities.pop();
                    if !source_ownership.owned_entity_types.is_empty() {
                        source_ownership.owned_entity_types.pop();
                    }
                    
                    // Add to destination
                    destination_ownership.owned_entities.push(entity_pubkey);
                    destination_ownership.owned_entity_types.push(entity_type);
                    
                    // Log ownership after transfer
                    msg!("After transfer - Source has {} entities, Destination has {} entities", 
                         source_ownership.owned_entities.len(), 
                         destination_ownership.owned_entities.len());
                    
                    msg!("Transferred entity {} from source wallet to destination wallet", args.entity_id);
                } else {
                    msg!("Entity {} not found in source ownership", args.entity_id);
                    return Err(OwnershipError::EntityNotFound.into());
                }
            },
            
            // Batch update ownership records
            4 => {
                let ownership = &mut ctx.accounts.owner_ownership;
                
                // In a real batch update, you would process multiple entity assignments
                // For now, we just update the owner type as a placeholder
                ownership.owner_type = args.owner_type;
                
                msg!("Performed batch update, set owner type to {}", args.owner_type);
            },
            
            _ => return Err(OwnershipError::InvalidOperation.into()),
        }
        
        Ok(ctx.accounts)
    }

    /// Components required for the AssignOwnership system
    #[system_input]
    pub struct Components {
        pub owner_ownership: Ownership,
        pub destination_ownership: Ownership,
    }
}

/// Errors that can occur in the AssignOwnership system
#[error_code]
pub enum OwnershipError {
    /// Entity not found in ownership records
    #[msg("Entity not found in ownership records")]
    EntityNotFound,
    
    /// Entity is already owned by the destination
    #[msg("Entity is already owned by the destination")]
    AlreadyOwned,
    
    /// Invalid operation type specified
    #[msg("Invalid operation type specified")]
    InvalidOperation,
    
    /// Ownership array would exceed maximum length
    #[msg("Ownership array would exceed maximum length")]
    TooManyEntities,
    
    /// Invalid entity type for operation
    #[msg("Invalid entity type for this operation")]
    InvalidEntityType,
}