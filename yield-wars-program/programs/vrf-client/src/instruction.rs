use anchor_lang::prelude::*;

/// A discriminator that is used by the VRF program to identify the consume_randomness instruction
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConsumeRandomness;

impl ConsumeRandomness {
    pub const DISCRIMINATOR: [u8; 8] = [116, 80, 235, 101, 208, 17, 133, 232];
}
