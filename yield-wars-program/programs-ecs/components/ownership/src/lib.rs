#![allow(unexpected_cfgs)]

use bolt_lang::*;
use borsh::{BorshDeserialize};

declare_id!("4M5dU6my7BmVMoAUYmRa3ZnJRMMQzW7e4Yf32wiPh9wS");

/// Ownership component that tracks which entities own other entities
///
/// This component is used to establish ownership relationships between entities in the YieldWars game.
/// For example, a player entity can own multiple GPU entities, Data Centers, Land Rights, etc.
/// The component stores a list of the public keys of owned entities along with their types.
#[component]
#[derive(Default)]
pub struct Ownership {
    /// The type of the entity this ownership component is attached to
    pub owner_type: u8,
    
    /// Array of owned entity public keys
    #[max_len(32)]
    pub owned_entities: Vec<Pubkey>,
    
    /// Array of entity types corresponding to owned entities
    #[max_len(32)]
    pub owned_entity_types: Vec<u8>,
    
    /// The public key of the entity that owns this entity (if applicable)
    /// This enables bidirectional ownership tracking
    pub owner_entity: Option<Pubkey>,
}

/// Entity type enum for the Ownership component
pub enum EntityType {
    /// Player account (wallet)
    Player = 0,
    /// Graphics Processing Unit
    GPU = 1,
    /// Data Center
    DataCenter = 2,
    /// Land parcel
    Land = 3,
    /// Energy contract
    EnergyContract = 4,
    /// Unknown entity type
    Unknown = 255,
}

impl EntityType {
    /// Convert entity type to u8
    pub fn to_u8(&self) -> u8 {
        match self {
            EntityType::Player => 0,
            EntityType::GPU => 1,
            EntityType::DataCenter => 2,
            EntityType::Land => 3,
            EntityType::EnergyContract => 4,
            EntityType::Unknown => 255,
        }
    }
}

/// Errors that can occur when interacting with the Ownership component
#[error_code]
pub enum OwnershipError {
    /// Attempted to add more entities than the maximum allowed
    #[msg("Cannot add more entities than the maximum allowed")]
    TooManyEntities,
    
    /// Attempted to access an entity at an invalid index
    #[msg("Entity index out of bounds")]
    InvalidEntityIndex,
    
    /// Entity is not owned by the current owner
    #[msg("Entity is not owned by this owner")]
    NotOwned,
}