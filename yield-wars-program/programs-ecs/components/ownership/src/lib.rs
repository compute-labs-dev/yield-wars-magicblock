#![allow(unexpected_cfgs)]

use bolt_lang::*;
use borsh::{BorshDeserialize};

declare_id!("5tnVfBszH3gaVqXgWJ3cNDenZwU1ThwfBHL323SihDaa");

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
    
    /// Array of entity types corresponding to each owned entity
    #[max_len(32)]
    pub owned_entity_types: Vec<u8>,
}

/// Types of entities in the YieldWars game
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum EntityType {
    /// Player entity
    Player = 0,
    /// GPU mining hardware
    GPU = 1,
    /// Data center that houses GPUs
    DataCenter = 2,
    /// Land rights for placing data centers
    Land = 3,
    /// Energy contract for reducing costs
    EnergyContract = 4,
    /// Unspecified or unknown entity type
    Unknown = 255,
}

impl EntityType {
    /// Converts a u8 to an EntityType
    pub fn from_u8(value: u8) -> Self {
        match value {
            0 => EntityType::Player,
            1 => EntityType::GPU,
            2 => EntityType::DataCenter,
            3 => EntityType::Land,
            4 => EntityType::EnergyContract,
            _ => EntityType::Unknown,
        }
    }
    
    /// Converts an EntityType to a u8
    pub fn to_u8(&self) -> u8 {
        *self as u8
    }
}

impl Default for EntityType {
    fn default() -> Self {
        EntityType::Unknown
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