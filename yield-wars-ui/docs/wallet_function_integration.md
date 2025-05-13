# Wallet Function Integration PRD

## 1. Overview

This document outlines the requirements for integrating core wallet functionalities from the `yield-wars-program` into the `yield-wars-ui` frontend. The primary goal is to enable users to manage their in-game assets, specifically initializing their wallets, transferring USDC, and exchanging various currencies.

## 2. Goals

*   Provide a seamless onboarding experience by automatically initializing and funding a user's game wallet.
*   Enable users to transfer USDC to other players within the game.
*   Allow users to exchange different types of in-game currencies.
*   Ensure secure transaction handling by leveraging user-specific signatures for relevant actions and admin signatures for system-level operations.
*   Maintain a robust and responsive user interface by utilizing TanStack Query for data fetching and state management.

## 3. User Stories / Features

*   **Wallet Initialization:**
    *   As a new user, when I first join the game, I want my game-specific wallet (entity and associated components like Wallet, Price) to be automatically created and funded with a starting balance so I can begin interacting with the game economy immediately.
*   **Currency Transfer:**
    *   As a user, I want to be able to securely transfer a specified currency (e.g., USDC, AiFi) from my wallet to another user's wallet by specifying their address, the currency type, and the amount, so I can trade or send gifts.
*   **Currency Exchange:**
    *   As a user, I want to be able to exchange one type of currency (e.g., USDC) for another (e.g., BTC, AiFi) within my wallet at the current market rates, so I can manage my asset portfolio according to game needs.

## 4. Functional Requirements

### 4.1. General
*   All frontend functions interacting with the Solana blockchain should follow a similar pattern to what's established in `@/lib/program/account-data-access.tsx`, particularly regarding the use of TanStack Query for managing asynchronous operations, caching, and UI updates.
*   Error handling must be robust, providing clear feedback to the user in case of transaction failures or network issues.
*   Loading states should be implemented for all asynchronous operations to inform the user that an action is in progress.

### 4.2. Wallet Initialization
*   **Trigger:** This process should ideally be triggered automatically upon a user's first login or a designated "create character/profile" step.
*   **Action:**
    *   Create a new game entity for the user.
    *   Initialize necessary components for this entity, including `WalletComponent` and `PriceComponent` (for USDC, and potentially others if initialized by default).
    *   Fund the newly created `WalletComponent` with a predetermined starting amount of USDC (e.g., 1000 USDC as seen in `Initialize wallet with starting funds using EconomySystem` test).
*   **Signing Mechanism:** This operation should be performed by the system/admin. The transaction will be prepared on the client, but sent to a server-side endpoint to be signed and submitted using the game's admin/treasury authority. This is similar to the flow in `@/hooks/server/sendFreeGas.ts` or `@/hooks/server/signAndSendTransaction.ts`.
    *   The `ApplySystem` call for initializing the wallet in `yield-wars-program.ts` (lines 309-343) uses the `provider.wallet.publicKey` as authority, which translates to an admin key in a live environment.

### 4.3. Currency Transfer
*   **Trigger:** User initiates a transfer from their wallet UI, specifying the recipient's public key, the currency type, and the amount.
*   **Action:**
    *   Construct a transaction that calls the `EconomySystem` to perform a `TRANSFER` operation.
    *   The `currency_type` parameter in the `EconomySystem` call will be set based on the user's selection.
    *   The source wallet will be the user's game wallet component.
*   **Signing Mechanism:** This transaction **must** be signed by the user (the owner of the source wallet) using their connected Privy wallet on the client-side.
    *   The `ApplySystem` call for transfers in `yield-wars-program.ts` (lines 374-442) uses `provider.wallet.publicKey` as authority. For a user-initiated transfer, this authority must be the user's wallet.
    *   The transaction construction might resemble parts of `@/hooks/useEmptyWallet.ts` for creating `TransactionMessage` and `VersionedTransaction`, but the signing step will involve the user's wallet via Privy, not a server-side signer for this specific action.

### 4.4. Currency Exchange
*   **Trigger:** User initiates an exchange from their wallet UI, specifying the source currency, destination currency, and the amount to exchange.
*   **Action:**
    *   Construct a transaction that calls the `EconomySystem` to perform an `EXCHANGE` operation.
    *   The user's `WalletComponent` will be the source of funds and the recipient of the exchanged currency.
    *   Relevant `PriceComponent` PDAs for both source and destination currencies must be included.
*   **Signing Mechanism:** This transaction **must** be signed by the user (the owner of the wallet performing the exchange) using their connected Privy wallet on the client-side.
    *   The `ApplySystem` call for exchanges in `yield-wars-program.ts` (lines 822-899) uses `provider.wallet.publicKey` as authority. For a user-initiated exchange, this authority must be the user's wallet.

## 5. Technical Implementation Notes

*   **Backend Reference:** The tests in `yield-wars-program/tests/yield-wars-program.ts` serve as the primary reference for constructing `ApplySystem` calls, arguments, and required accounts/components. Specifically:
    *   Wallet Initialization: `Initialize wallet with starting funds using EconomySystem` (lines 309-343).
    *   Currency Transfer: `Transfer USDC between wallets` (lines 374-442) - Note: The test is specific to USDC, but the underlying system supports various currency types.
    *   Currency Exchange: `Exchange USDC for BTC` (lines 822-899).

*   **File Structure for Wallet Integration:**
    *   **Client-side Hooks:** Located in `yield-wars-ui/src/hooks/` (e.g., `useInitializeUserWallet.ts`, `useTransferCurrency.ts`).
    *   **Server Actions:** For operations requiring admin/server-side signing, located in `yield-wars-ui/src/app/actions/` (e.g., `initializeUserWallet.ts`). This leverages Next.js Server Actions for RPC-like calls from the client.
    *   **Constants:**
        *   Program IDs: Centralized in `yield-wars-ui/src/lib/constants/programIds.ts`.
        *   Program Enums: Centralized in `yield-wars-ui/src/lib/constants/programEnums.ts` (e.g., `CurrencyType`, `EconomyTransactionType`).

*   **Frontend Hooks:**
    *   New React hooks (e.g., `useInitializeUserWallet`, `useTransferCurrency`, `useExchangeCurrency`) will be created as outlined.
    *   These hooks will encapsulate TanStack Query `useMutation` logic for managing asynchronous operations, state (loading, success, error), caching, and UI updates (via toasts and query invalidation).

*   **Transaction Signing:**
    *   **User-signed transactions (Transfer, Exchange):**
        1.  Client prepares the transaction object (preferably `VersionedTransaction`). The Bolt SDK's `ApplySystem` function is expected to return the necessary transaction details client-side.
        2.  User signs the transaction using their Privy-provided wallet. Privy's `signTransaction` (from `@privy-io/react-auth/solana`) typically signs the transaction object in-place and expects an options object containing the transaction, connection, and UI details.
        3.  Client sends the signed transaction (now modified in-place) to the network via `connection.sendRawTransaction(transaction.serialize())`.
    *   **Admin-signed transactions (Wallet Initialization):**
        1.  The client-side hook (`useInitializeUserWallet`) calls a Next.js Server Action (`initializeUserWalletServer` in `yield-wars-ui/src/app/actions/initializeUserWallet.ts`).
        2.  The Server Action prepares one or more transactions using the Bolt SDK.
        3.  The Server Action signs these transactions with the admin/system keypair and sends them to the network.

*   **Bolt SDK Usage:**
    *   **Server-Side (e.g., in `initializeUserWalletServer.ts`):**
        *   `AddEntity` appears to require a `connection` object passed directly in its arguments.
        *   `InitializeComponent` and `ApplySystem` might not take `connection` directly; their method of accessing the connection in a non-Anchor-provider environment needs to be robust (e.g., ensuring any implicit context is correctly set up if used, or adapting to manual transaction building if the SDK primarily returns instructions).
    *   **Client-Side (e.g., in `useTransferCurrency.ts`):
        *   `ApplySystem` is assumed to be callable client-side to return a `Transaction` object (or instructions to build one) that can then be signed by the user's wallet.

*   **Program ID and Enum Management:**
    *   Program IDs are stored as `PublicKey` constants in `yield-wars-ui/src/lib/constants/programIds.ts`.
    *   Relevant Rust enums are mirrored as TypeScript enums in `yield-wars-ui/src/lib/constants/programEnums.ts` to ensure type safety and clarity.

*   **Component PDAs:** The frontend will need a mechanism to fetch/derive the PDAs for the user's entity, their wallet component, and relevant price components. This might involve dedicated queries or a global state/context. The `initializeUserWalletServer` action returns these PDAs upon successful initialization.

## 6. Out of Scope (for this phase)

*   UI design for the wallet, transfer, and exchange interfaces.
*   Fetching and displaying transaction history.
*   Real-time price updates for currencies (beyond what's needed for an exchange operation).

## 7. Open Questions / Assumptions

*   **User Entity Creation & Ownership:** It's assumed that the user's main Solana public key (from Privy) will be linked to their in-game entity PDA. The `initializeUserWalletServer` currently has the admin create the entity. If direct user ownership (e.g., via an `OwnershipComponent` associating the entity with the user's public key) is required immediately at creation, this step needs to be added to the server action.
*   **Recipient Wallet Discovery:** For currency transfers, how will the frontend discover the recipient's game entity PDA (and thus their wallet component PDA) based on their main Solana public key or in-game username?
*   **Privy Integration for Signing:** The `useTransferCurrency` hook has been updated to align with the observed Privy `signTransaction` pattern (in-place signing, options object). Final verification with actual Privy hook usage is recommended.
*   **Bolt SDK Client-Side Behavior:** Confirm the exact behavior and requirements of `@magicblock-labs/bolt-sdk` functions like `ApplySystem` when used on the client-side for preparing transactions for user signing. Specifically, does it return a fully formed `Transaction` object or instructions?
*   **Bolt SDK Server-Side Connection Management:** For `InitializeComponent` and `ApplySystem` in server actions, clarify how they obtain connection context if not passed directly, ensuring this is reliable outside of an Anchor test environment.
*   **Error Codes:** The program uses specific error codes. The frontend should map these to user-friendly messages.
*   **`EconomyTransactionType.Initialize` vs. `Purchase`:** The `EconomyTransactionType` enum in `programEnums.ts` includes both `Initialize = 2` (based on test usage for wallet funding) and `Purchase = 2` (from the EconomySystem Rust enum). This needs to be reconciled. If wallet funding is a distinct operation, it should ideally have a unique type. If it's a form of system "purchase," the terminology and usage should be consistent.
*   **Transaction Types (Legacy vs. Versioned):** The client-side transaction signing flow (e.g., in `useTransferCurrency`) currently assumes a legacy `Transaction` object from `ApplySystem`. It is generally recommended to use `VersionedTransaction` for user-facing transactions. This should be adopted if `ApplySystem` can provide/be adapted for `VersionedTransaction`s, or if instructions are manually assembled into a `VersionedTransaction`.
