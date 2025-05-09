#![allow(unexpected_cfgs)]

use bolt_lang::prelude::*;

declare_id!("3gnT2CxCTT6QBZHyqtETVnhxfHBK3wccAYqfxq4Xn8PT");

#[program]
pub mod yield_wars_program {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
