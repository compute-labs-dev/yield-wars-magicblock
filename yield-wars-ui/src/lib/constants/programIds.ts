import { PublicKey } from '@solana/web3.js';
import { MagicBlockEngine } from '../../engine/MagicBlockEngine'

import { Economy } from '@/lib/program/types/economy'
import { Movement } from '@/lib/program/types/movement'
import { Ownership } from '@/lib/program/types/ownership'
import { Price } from '@/lib/program/types/price'
import { PriceAction } from '@/lib/program/types/price_action'
import { Production } from '@/lib/program/types/production'
import { ResourceProduction } from '@/lib/program/types/resource_production'
import { Stakeable } from '@/lib/program/types/stakeable'
import { Upgrade } from '@/lib/program/types/upgrade'
import { Upgradeable } from '@/lib/program/types/upgradeable'
import { Wallet } from '@/lib/program/types/wallet'

import * as EconomyIdl from '@/lib/program/idl/economy.json'
import * as MovementIdl from '@/lib/program/idl/movement.json'
import * as OwnershipIdl from '@/lib/program/idl/ownership.json'
import * as PriceIdl from '@/lib/program/idl/price.json'
import * as PriceActionIdl from '@/lib/program/idl/price_action.json'
import * as ProductionIdl from '@/lib/program/idl/production.json'
import * as ResourceProductionIdl from '@/lib/program/idl/resource_production.json'
import * as StakeableIdl from '@/lib/program/idl/stakeable.json'
import * as UpgradeIdl from '@/lib/program/idl/upgrade.json'
import * as UpgradeableIdl from '@/lib/program/idl/upgradeable.json'
import * as WalletIdl from '@/lib/program/idl/wallet.json'

export const componentOwnership = OwnershipIdl as Ownership
export const componentPrice = PriceIdl as Price
export const componentProduction = ProductionIdl as Production
export const componentStakeable = StakeableIdl as Stakeable
export const componentUpgradeable = UpgradeableIdl as Upgradeable
export const componentWallet = WalletIdl as Wallet

export const systemEconomy = EconomyIdl as Economy
export const systemMovement = MovementIdl as Movement
export const systemPriceAction = PriceActionIdl as PriceAction
export const systemResourceProduction = ResourceProductionIdl as ResourceProduction
export const systemUpgrade = UpgradeIdl as Upgrade

export const COMPONENT_OWNERSHIP_PROGRAM_ID = new PublicKey(componentOwnership.address)
export const COMPONENT_PRICE_PROGRAM_ID = new PublicKey(componentPrice.address)
export const COMPONENT_PRODUCTION_PROGRAM_ID = new PublicKey(componentProduction.address)
export const COMPONENT_STAKEABLE_PROGRAM_ID = new PublicKey(componentStakeable.address)
export const COMPONENT_UPGRADEABLE_PROGRAM_ID = new PublicKey(componentUpgradeable.address)
export const COMPONENT_WALLET_PROGRAM_ID = new PublicKey(componentWallet.address)

export const SYSTEM_ECONOMY_PROGRAM_ID = new PublicKey(systemEconomy.address)
export const SYSTEM_MOVEMENT_PROGRAM_ID = new PublicKey(systemMovement.address)
export const SYSTEM_PRICE_ACTION_PROGRAM_ID = new PublicKey(systemPriceAction.address)
export const SYSTEM_RESOURCE_PRODUCTION_PROGRAM_ID = new PublicKey(systemResourceProduction.address)
export const SYSTEM_UPGRADE_PROGRAM_ID = new PublicKey(systemUpgrade.address)

export function getComponentOwnershipOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Ownership>(componentOwnership)
}

export function getComponentPriceOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Price>(componentPrice)
}

export function getComponentProductionOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Production>(componentProduction)
}

export function getComponentStakeableOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Stakeable>(componentStakeable)
}

export function getComponentUpgradeableOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Upgradeable>(componentUpgradeable)
}

export function getComponentWalletOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Wallet>(componentWallet)
}


export function getComponentOwnershipOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Ownership>(componentOwnership)
}

export function getComponentPriceOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Price>(componentPrice)
}

export function getComponentProductionOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Production>(componentProduction)
}

export function getComponentStakeableOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Stakeable>(componentStakeable)
}

export function getComponentUpgradeableOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Upgradeable>(componentUpgradeable)
}

export function getComponentWalletOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Wallet>(componentWallet)
}

export function getEconomySystemOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Economy>(systemEconomy)
}

export function getMovementSystemOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Movement>(systemMovement)
}

export function getPriceActionSystemOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<PriceAction>(systemPriceAction)
}

export function getResourceProductionSystemOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<ResourceProduction>(systemResourceProduction)
}

export function getUpgradeSystemOnChain(engine: MagicBlockEngine) {
    return engine.getProgramOnChain<Upgrade>(systemUpgrade)
}

export function getEconomySystemOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Economy>(systemEconomy)
}

export function getMovementSystemOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Movement>(systemMovement)
}

export function getPriceActionSystemOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<PriceAction>(systemPriceAction)
}

export function getResourceProductionSystemOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<ResourceProduction>(systemResourceProduction)
}

export function getUpgradeSystemOnEphem(engine: MagicBlockEngine) {
    return engine.getProgramOnEphem<Upgrade>(systemUpgrade)
}