# PRD: Supply Shack - Asset Inventory & Management (`/supply` - Inventory Tab)

## 1. Overview

This document outlines the Product Requirements for the "Inventory" tab within the `/supply` page (referred to as the "GPU Supply Shack" in mockups). This section of the page will allow players to view and manage their owned productive assets, such as GPUs. It will provide interfaces for interacting with these assets, including managing their resource production, upgrading them, and staking them.

## 2. Goals

*   [ ] Provide players with a clear and organized view of all their owned productive assets (e.g., GPUs, Data Centers, etc.).
*   [ ] Enable players to initiate and manage resource production from their assets.
*   [ ] Allow players to upgrade their assets to improve performance and output.
*   [ ] Facilitate staking of assets for players to earn additional rewards.
*   [ ] Ensure all interactions are secure and update the game state correctly via backend system calls.
*   [ ] Leverage existing backend systems: `Ownership` (to fetch owned entities), `ResourceProduction`, `Upgrade`, and `Staking`.

## 3. User Stories / Features

### 3.1. Asset Inventory Display

*   [ ] As a player, I want to see a tab labeled "Inventory" on the `/supply` page.
*   [ ] In my inventory, I want to see a grid or list of all the productive assets I own (e.g., GPUs).
*   [ ] Each asset card should display key information at a glance: asset type (e.g., "GPU1"), current stats (e.g., "28MH/s", "120W"), location (e.g., "Location: Kyoto, Japan"), and potentially its current level or status (e.g., producing, idle, staked).
*   [ ] I want to see my current balance of primary game currencies (e.g., USDC) prominently displayed on this page, as shown in the mockup ("USDC: 50000").

### 3.2. Asset Details & Actions (Per Asset)

*   [ ] As a player, when I select an asset from my inventory, I want to see more detailed information and available actions for it.
*   **Production Management:**
    *   [ ] I want to see if the asset is currently active and producing resources.
    *   [ ] I want to be able to start production if it's inactive.
    *   [ ] I want to be able to stop production if it's active.
    *   [ ] I want to see its current production rates (e.g., USDC/hour, AIFI/hour).
    *   [ ] I want to see its operating costs (if applicable).
    *   [ ] I want to be able to collect any accumulated resources from its production.
*   **Upgrade Management:**
    *   [ ] I want to see the asset's current level and its maximum level.
    *   [ ] If an upgrade is available, I want to see the resource costs (e.g., USDC, AIFI) for the next upgrade.
    *   [ ] I want to see the benefits of the next upgrade (e.g., increased production rate, new abilities).
    *   [ ] I want to see any cooldown period remaining before the next upgrade can be performed.
    *   [ ] I want to be able to initiate an upgrade if I have sufficient resources and the cooldown has passed.
*   **Staking Management:**
    *   [ ] I want to see if the asset is currently staked.
    *   [ ] If not staked, I want to have an option to stake it.
    *   [ ] If staked, I want to see information like staking start time, current reward rate, and minimum staking period.
    *   [ ] I want to be able to unstake the asset (understanding any penalties for early unstaking).
    *   [ ] I want to be able to collect any accumulated staking rewards.

## 4. Design & UI

*   Refer to the "GPU Supply Shack" image provided for the "Inventory" tab layout.
    *   **Layout:** Tabbed interface. The "Inventory" tab should display a grid of owned assets.
    *   **Asset Cards:** Each card should visually represent the asset (e.g., GPU icon) and display key stats as seen in the mockup (Type, Hashrate, Power, Location, Price - though "Price" here might mean "Upgrade Cost" or "Current Value" rather than purchase price).
    *   **Action Buttons:** Mockup shows "2000 USDC" buttons below GPUs. This might be for purchasing (on the other tab) or could represent an action like "Upgrade for 2000 USDC" or "Quick Collect & Restart". The exact function of these buttons for the inventory needs clarification. For asset management, more specific action buttons (Start/Stop Production, Upgrade, Stake) will be needed, likely in a detail view or context menu for each asset.
    *   **Styling:** Adhere to the existing Yield Wars dark theme.
    *   The bottom console and footer with currency balances should be consistent.

## 5. Technical Design & Implementation Details

### 5.1. Frontend

*   **Framework/Routing:** Part of the `/supply` page, managed by Next.js App Router.
*   **State Management:**
    *   Redux Toolkit: For global state (user wallet, `worldPda`), and potentially caching the list of owned asset PDAs and their high-level details.
    *   TanStack Query: For fetching detailed asset data, production status, upgrade info, staking info, and for handling all asset management mutations.
*   **Key Components:**
    *   `SupplyPageLayout`: Main container for the `/supply` page with tabs.
    *   `InventoryTab`: Component rendering the grid of owned assets.
    *   `AssetCard`: Displays summary information for a single owned asset in the grid.
    *   `AssetDetailView` (or Modal): Displays detailed information and action buttons when an asset is selected.
        *   `ProductionControls`
        *   `UpgradeControls`
        *   `StakingControls`
*   **Hooks (New):**
    *   `useOwnedAssets`: Fetches a list of all productive assets owned by the player (interacts with `Ownership` component data on entities).
    *   `useAssetProduction(entityPda)`: Fetches production details and provides functions to manage production for a specific asset PDA (interacts with `ResourceProductionSystem`).
    *   `useAssetUpgrades(entityPda)`: Fetches upgrade details and provides functions to perform upgrades for a specific asset PDA (interacts with `UpgradeSystem`).
    *   `useAssetStaking(entityPda)`: Fetches staking details and provides functions to manage staking for a specific asset PDA (interacts with `StakingSystem`).
*   **Data Fetching & Services:**
    *   An initial fetch to get all entity PDAs owned by the player that are of manageable types (e.g., GPU, Data Center).
    *   Subsequent fetches for details when an asset is selected or actions are performed.
    *   Server actions will wrap calls to the various Solana program systems (`ResourceProduction`, `Upgrade`, `Staking`).

### 5.2. Backend Interaction

*   **Fetching Owned Assets:** This will likely involve querying for the player's primary `Ownership` component and iterating through its `owned_entities` list, then filtering by desired asset types.
*   **Production Management:** Calls to `systemResourceProduction` with appropriate operation types (INITIALIZE, COLLECT, SET_ACTIVE, UPDATE_RATES).
*   **Upgrade Management:** Calls to `systemUpgrade` with appropriate operation types (INITIALIZE, UPGRADE, UPDATE_PARAMS).
*   **Staking Management:** Calls to `systemStaking` with appropriate operation types (INITIALIZE, STAKE, UNSTAKE, COLLECT_REWARDS, UPDATE_PARAMS).
*   Each backend interaction will require the `worldPda`, the specific `entityPda` of the asset being managed, and relevant component PDAs associated with that entity.

### 5.3. Wallet Integration

*   Privy for wallet connection and signing transactions for all asset management actions (collecting, upgrading, staking, etc.).
*   The `useSignAndSendTransaction` hook for processing transactions.

## 6. Success Metrics / Acceptance Criteria

*   [ ] Player can view a list/grid of their owned GPUs (or other productive assets).
*   [ ] For a selected GPU, player can see its current production status and rates.
*   [ ] Player can successfully start and stop production for an asset.
*   [ ] Player can successfully collect produced resources, and their wallet balance updates.
*   [ ] Player can see current level, upgrade costs, and benefits for an asset.
*   [ ] Player can successfully upgrade an asset, resources are deducted, and asset stats/level update.
*   [ ] Player can see current staking status and staking parameters for an asset.
*   [ ] Player can successfully stake and unstake an asset.
*   [ ] Player can successfully collect staking rewards, and their wallet balance updates.
*   [ ] All UI elements are responsive and interactions provide clear feedback (loading, success, error).

## 7. Future Considerations / Out of Scope for V1

*   Batch actions (e.g., "Collect All Resources", "Restake All").
*   Detailed historical logs for asset performance or actions.
*   Renaming or customizing assets.
*   Visual indicators of asset "health" or "maintenance needs" if such mechanics are introduced.
*   Directly "selling" assets from inventory (this might be part of a player-to-player marketplace PRD).

---
This PRD focuses on the management of already-owned assets. The acquisition of new assets will be covered in the "Supply Shack - Asset Shop" PRD. 

## 8. Implementation Progress Update

### 8.1. Completed Features

*   [x] Created core data hooks:
    *   `useOwnedAssets`: Fetches all productive assets owned by the player
    *   `useAssetProduction`: Manages resource production for assets
    *   `useAssetUpgrade`: Manages asset upgrade operations
    *   `useAssetStaking`: Manages asset staking (placeholder implementation)
    *   `usePurchaseGpu`: Manages GPU purchase using Economy system
*   [x] Implemented basic UI components in the scratch page for testing:
    *   Asset list view showing owned assets
    *   Asset details panel with production/upgrade/staking information
    *   Action buttons for controlling production, upgrades, and staking
    *   Store UI for purchasing GPUs
*   [x] GPU entity creation functionality:
    *   Enhanced `initializeNewWorld.ts` to create sample GPU entities with different tiers
    *   Added Redux store support for GPU entities
    *   Added full ownership, production, upgrade and stakeable components
*   [x] GPU purchasing functionality in the UI:
    *   Created "Store" UI for displaying available GPUs
    *   Connected the `usePurchaseGpu` hook to UI
    *   Added detailed GPU cards with pricing and specifications
    *   Implemented refresh after purchase to display owned assets

### 8.2. Pending Features

*   [ ] Complete error handling based on program test scenarios:
    *   Production collection while inactive
    *   Upgrade with insufficient funds
    *   Cooldown period validation
    *   Max level checks
*   [ ] Full staking system integration (currently using placeholders)
*   [ ] Dedicated Supply Shack page (currently only in scratch page)
*   [ ] Asset batch operations (if prioritized for v1)

### 8.3. Technical Gaps & Next Steps

1. **Error Handling Refinement**:
   * Add proper validation for all edge cases demonstrated in program tests
   * Implement user-friendly error messages and recovery options
   * Add transaction retry functionality
   * Add dedicated error components for each type of operation

2. **Staking System Integration**:
   * Complete the staking system implementation with proper parameters
   * Implement functionality to calculate accrued rewards
   * Test staking/unstaking lifecycle

3. **Testing Strategy**:
   * Continue using the scratch page for rapid testing of functionality
   * Create proper integration tests once core functionality works
   * Test edge cases directly (e.g., attempting collection when inactive)

4. **Production Deployment**:
   * Move from scratch page implementation to dedicated Supply Shack page
   * Apply proper styling and UX improvements
   * Add analytics tracking for user interactions

### 8.4. Testing Instructions

To test the current implementation:

1. Navigate to the `/scratch` page
2. Initialize your user and world if not already done
3. The "Supply Shack Store" section will display available GPUs for purchase
4. Select a GPU and click "Purchase" to buy it
5. After purchasing, the asset will appear in the "Supply Shack Inventory" section
6. From there, you can:
   * Toggle production on/off
   * Collect resources when available
   * Upgrade the asset (if you have sufficient resources and cooldown has passed)
   * View detailed information about the asset

Note: You'll need USDC in your wallet to purchase GPUs (the costs are 50, 100, or 200 USDC depending on the tier). 