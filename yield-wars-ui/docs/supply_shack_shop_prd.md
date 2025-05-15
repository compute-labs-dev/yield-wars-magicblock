# PRD: Supply Shack - Asset Shop (`/supply` - Shop Tab)

## 1. Overview

This document outlines the Product Requirements for the "Shop" tab within the `/supply` page (referred to as the "GPU Supply Shack" in mockups). This section of the page will function as a system-run store where players can purchase new productive assets, such as GPUs, using their in-game currencies.

## 2. Goals

*   [ ] Enable players to browse and purchase new productive assets (e.g., GPUs of different types/tiers) from a system-operated shop.
*   [ ] Clearly display the cost and specifications of each available asset.
*   [ ] Handle the purchase transaction securely, deducting the correct currency amount from the player's wallet and granting them ownership of the new asset.
*   [ ] Ensure purchased assets are correctly added to the player's inventory (viewable in the "Inventory" tab).
*   [ ] Leverage existing backend systems: `EconomySystem` for currency transactions and `AssignOwnership` for granting asset ownership.

## 3. User Stories / Features

*   **Shop Display:**
    *   [ ] As a player, I want to see a tab labeled "Shop" (or similar, e.g., "All" as in the mockup if it serves as the primary shop view) on the `/supply` page.
    *   [ ] In the shop, I want to see a categorized list or grid of assets available for purchase (e.g., different models of GPUs, Data Centers).
    *   [ ] Each item in the shop should display: a visual representation (icon/image), asset name/type (e.g., "GPU1"), key specifications (e.g., "28MH/s", "120W", "Location: Kyoto, Japan"), and its purchase price in one or more game currencies (e.g., "2000 USDC").
    *   [ ] I want to see my current balance of primary game currencies (e.g., USDC) prominently displayed, similar to the "Inventory" tab.
*   **Asset Purchase:**
    *   [ ] As a player, I want to be able to select an asset I wish to purchase.
    *   [ ] Upon selecting, I want to see a confirmation (perhaps a modal) showing the item and its cost before finalizing the purchase.
    *   [ ] I want a clear "Buy" or "Purchase" button for each asset.
    *   [ ] If I have insufficient funds, the purchase option should be disabled or provide clear feedback.
    *   [ ] When I confirm a purchase, the system should deduct the cost from my game wallet.
    *   [ ] Upon successful purchase, the new asset should be added to my inventory (viewable in the "Inventory" tab).
    *   [ ] I want to receive clear feedback on the transaction status (pending, success, failure).

## 4. Design & UI

*   Refer to the "GPU Supply Shack" image provided. The main view with items and prices (e.g., GPUs listed with "2000 USDC" buttons) will serve as the primary reference for the "Shop" tab.
    *   **Layout:** Tabbed interface. The "Shop" tab will display a grid of purchasable assets.
    *   **Shop Item Cards:** Each card should visually represent the asset and display its name, icon, key stats, and a clear purchase price with a button.
    *   **Purchase Confirmation:** A modal or clear confirmation step is recommended before deducting funds.
    *   **Styling:** Adhere to the existing Yield Wars dark theme.
    *   The bottom console and footer with currency balances should be consistent.

## 5. Technical Design & Implementation Details

### 5.1. Frontend

*   **Framework/Routing:** Part of the `/supply` page, managed by Next.js App Router.
*   **State Management:**
    *   Redux Toolkit: For global state (user wallet, `worldPda`), potentially caching the list of shop items if they are relatively static.
    *   TanStack Query: For fetching the list of available shop items (if dynamic) and for handling the purchase mutation.
*   **Key Components:**
    *   `SupplyPageLayout`: Main container for the `/supply` page with tabs.
    *   `ShopTab`: Component rendering the grid of purchasable assets.
    *   `ShopItemCard`: Displays summary information and purchase button for a single asset in the shop.
    *   `PurchaseConfirmationModal`: Modal component for purchase confirmation.
*   **Hooks (New):**
    *   `useShopListings`: Fetches the list of assets available for purchase from the system shop.
    *   `usePurchaseAsset`: Handles the logic for an asset purchase transaction, interacting with backend server actions.
*   **Data Fetching & Services:**
    *   A mechanism to define what assets are available in the shop. This could be: 
        *   A static list defined in the frontend/backend configuration.
        *   Fetched from a dedicated backend endpoint if shop inventory is dynamic.
    *   Server actions will wrap calls to the `EconomySystem` (for payment) and `AssignOwnership` system (to grant the item).

### 5.2. Backend Interaction

*   **Shop Item Availability:** The backend needs a way to define what entities are for sale, their prices, and their types. These might be pre-initialized unowned entities or entities minted on demand.
*   **Purchase Transaction Flow:**
    1.  Frontend sends a purchase request (asset type, player entity PDA, player wallet public key).
    2.  Backend server action verifies player funds (via `Wallet` component).
    3.  Backend orchestrates the transaction:
        *   Instructs `EconomySystem` to transfer currency from player's wallet to a system/treasury wallet (or burn, depending on game design).
        *   Finds/creates an entity of the purchased type.
        *   Instructs `AssignOwnership` system to assign the new asset entity to the player's `Ownership` component.
        *   Initializes necessary components on the new asset (e.g., default `ResourceProduction` settings, `Upgradeable` component at level 1, `Stakeable` component).
*   The backend will need to handle the creation or designation of the specific entity being sold and ensure its components (`Ownership`, `Production`, `Upgradeable`, `Stakeable`, etc.) are initialized correctly upon purchase.

### 5.3. Wallet Integration

*   Privy for wallet connection and signing the purchase transaction.
*   The `useSignAndSendTransaction` hook for processing transactions.

## 6. Success Metrics / Acceptance Criteria

*   [ ] Player can view a list/grid of purchasable assets in the shop tab with their prices and stats.
*   [ ] Player can successfully purchase an asset if they have sufficient funds.
*   [ ] The correct amount of currency is deducted from the player's wallet upon purchase.
*   [ ] The purchased asset appears in the player's "Inventory" tab with default/initial settings.
*   [ ] Player receives clear feedback for successful purchases or errors (e.g., insufficient funds).
*   [ ] Shop UI is responsive and usable.

## 7. Future Considerations / Out of Scope for V1

*   Dynamic shop inventory (e.g., limited stock, rotating items, daily deals).
*   Bundled offers.
*   Discounts or special promotions.
*   Purchase of non-entity items (e.g., consumables, temporary boosts) if they are introduced.
*   Gifting items to other players directly from the shop.

---
This PRD outlines the functionality for players to buy new assets from a system-run shop. It complements the "Asset Inventory & Management" PRD where players manage assets they already own. 