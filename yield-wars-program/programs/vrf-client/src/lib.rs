use crate::instruction::ConsumeRandomness;
use anchor_lang::prelude::borsh::BorshDeserialize;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::sysvar::slot_hashes;
use ephemeral_vrf_sdk::anchor::{vrf, VrfProgram};
use ephemeral_vrf_sdk::consts::IDENTITY;
use ephemeral_vrf_sdk::instructions::create_request_randomness_ix;
use ephemeral_vrf_sdk::instructions::RequestRandomnessParams;
use ephemeral_vrf_sdk::rnd::{random_bool, random_u32, random_u8_with_range};

declare_id!("HQUAWY4CM72rw6TqGZW91Q8kZtpfNBx1z1sDqcGDbeFM");

// Constants for the PDA seeds
pub const RANDOMNESS_SEED: &[u8] = b"randomness";
pub const USER_SEED: &[u8] = b"user";

#[program]
pub mod vrf_client {
    use super::*;

    pub fn request_randomness(ctx: Context<RequestRandomnessCtx>, client_seed: u8) -> Result<()> {
        msg!(
            "Generating a random number: (from program: {:?})",
            ctx.program_id
        );
        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: ConsumeRandomness::DISCRIMINATOR.to_vec(),
            caller_seed: hash(&[client_seed]).to_bytes(),
            ..Default::default()
        });
        msg!(
            "Discriminator: {:?}",
            ConsumeRandomness::DISCRIMINATOR.to_vec()
        );
        invoke_signed(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.program_identity.to_account_info(),
                ctx.accounts.oracle_queue.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.slot_hashes.to_account_info(),
            ],
            &[&[IDENTITY, &[ctx.bumps.program_identity]]],
        )?;
        Ok(())
    }

    pub fn simpler_request_randomness(
        ctx: Context<RequestRandomnessSimplerCtx>,
        client_seed: u8,
    ) -> Result<()> {
        msg!("Generating a random number");
        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: crate::ID,
            callback_discriminator: ConsumeRandomness::DISCRIMINATOR.to_vec(),
            caller_seed: hash(&[client_seed]).to_bytes(),
            ..Default::default()
        });
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    // This is called by the VRF program with the randomness value
    pub fn consume_randomness(
        ctx: Context<ConsumeRandomnessCtx>,
        randomness: [u8; 32],
    ) -> Result<()> {
        // If the PDA identity is a signer, this means the VRF program is the caller
        msg!(
            "VRF identity: {:?}",
            ctx.accounts.vrf_program_identity.key()
        );
        msg!(
            "VRF identity is signer: {:?}",
            ctx.accounts.vrf_program_identity.is_signer
        );

        // Store the randomness in a PDA for this user
        ctx.accounts.user_randomness_account.set_inner(UserRandomness {
            user: ctx.accounts.payer.key(),
            randomness,
            timestamp: Clock::get()?.unix_timestamp,
            is_used: false,
        });

        // Log the randomness for debugging
        msg!("Consuming random u32: {:?}", random_u32(&randomness));
        msg!(
            "Consuming random u8 (range 1-6): {:?}",
            random_u8_with_range(&randomness, 1, 6)
        );
        msg!("Consuming random bool: {:?}", random_bool(&randomness));
        msg!("Randomness stored for user: {:?}", ctx.accounts.payer.key());

        Ok(())
    }

    // Get stored randomness for a user
    pub fn get_randomness(ctx: Context<GetRandomnessCtx>) -> Result<()> {
        if ctx.accounts.user_randomness_account.is_used {
            return err!(VrfClientError::RandomnessAlreadyUsed);
        }

        // Log the randomness for the user
        msg!("Randomness for user {:?}:", ctx.accounts.user.key());
        msg!(
            "Randomness bytes: {:?}",
            ctx.accounts.user_randomness_account.randomness
        );
        msg!(
            "Generated at: {:?}",
            ctx.accounts.user_randomness_account.timestamp
        );

        Ok(())
    }

    // Mark randomness as used (call this after using it for a bet)
    pub fn mark_randomness_used(ctx: Context<MarkRandomnessUsedCtx>) -> Result<()> {
        if ctx.accounts.user_randomness_account.is_used {
            return err!(VrfClientError::RandomnessAlreadyUsed);
        }

        ctx.accounts.user_randomness_account.is_used = true;
        msg!(
            "Marked randomness as used for user: {:?}",
            ctx.accounts.user.key()
        );

        Ok(())
    }

    // Get randomness value for placing a bet
    pub fn get_randomness_for_bet(ctx: Context<GetRandomnessForBetCtx>) -> Result<[u8; 32]> {
        if ctx.accounts.user_randomness_account.is_used {
            return err!(VrfClientError::RandomnessAlreadyUsed);
        }

        let randomness = ctx.accounts.user_randomness_account.randomness;

        // Mark as used
        ctx.accounts.user_randomness_account.is_used = true;

        msg!("Retrieved randomness for bet: {:?}", randomness);
        Ok(randomness)
    }
}

#[derive(Accounts)]
pub struct RequestRandomnessCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Used to verify the identity of the program
    #[account(seeds = [b"identity"], bump)]
    pub program_identity: AccountInfo<'info>,
    /// CHECK: Oracle queue
    #[account(mut, address = DEFAULT_TEST_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: Slot hashes sysvar
    #[account(address = slot_hashes::ID)]
    pub slot_hashes: AccountInfo<'info>,
    pub vrf_program: Program<'info, VrfProgram>,
}

#[vrf]
#[derive(Accounts)]
pub struct RequestRandomnessSimplerCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: The oracle queue
    #[account(mut, address = DEFAULT_TEST_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ConsumeRandomnessCtx<'info> {
    /// Signer PDA of the VRF program
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,

    /// CHECK: This account pays for the storage
    #[account(mut)]
    pub payer: AccountInfo<'info>,

    /// PDA where randomness will be stored for this user
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + UserRandomness::SPACE,
        seeds = [RANDOMNESS_SEED, payer.key().as_ref()],
        bump
    )]
    pub user_randomness_account: Account<'info, UserRandomness>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetRandomnessCtx<'info> {
    pub user: Signer<'info>,

    #[account(
        seeds = [RANDOMNESS_SEED, user.key().as_ref()],
        bump,
        constraint = user_randomness_account.user == user.key() @ VrfClientError::InvalidUser
    )]
    pub user_randomness_account: Account<'info, UserRandomness>,
}

#[derive(Accounts)]
pub struct MarkRandomnessUsedCtx<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [RANDOMNESS_SEED, user.key().as_ref()],
        bump,
        constraint = user_randomness_account.user == user.key() @ VrfClientError::InvalidUser
    )]
    pub user_randomness_account: Account<'info, UserRandomness>,
}

#[derive(Accounts)]
pub struct GetRandomnessForBetCtx<'info> {
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [RANDOMNESS_SEED, user.key().as_ref()],
        bump,
        constraint = user_randomness_account.user == user.key() @ VrfClientError::InvalidUser
    )]
    pub user_randomness_account: Account<'info, UserRandomness>,
}

#[account]
#[derive(Default)]
pub struct UserRandomness {
    pub user: Pubkey,         // 32 bytes
    pub randomness: [u8; 32], // 32 bytes
    pub timestamp: i64,       // 8 bytes
    pub is_used: bool,        // 1 byte
}

impl UserRandomness {
    pub const SPACE: usize = 32 + 32 + 8 + 1;
}

#[error_code]
pub enum VrfClientError {
    #[msg("Invalid user for randomness account")]
    InvalidUser,
    #[msg("Randomness has already been used")]
    RandomnessAlreadyUsed,
}

pub const DEFAULT_TEST_QUEUE: Pubkey = pubkey!("GKE6d7iv8kCBrsxr78W3xVdjGLLLJnxsGiuzrsZCGEvb");
