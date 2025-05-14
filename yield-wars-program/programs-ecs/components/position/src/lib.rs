#![allow(unexpected_cfgs)]

use bolt_lang::*;

declare_id!("BL5C5RUqP8zE8EY9G1268Z5zvuj6SHRcKcDf7i4Pfv9j");

#[component]
#[derive(Default)]
pub struct Position {
    pub x: i64,
    pub y: i64,
    pub z: i64,
    #[max_len(20)]
    pub description: String,
}