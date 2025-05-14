# Wallet Function Integration PRD

## 1. Overview

This document outlines the requirements and successful implementation of core wallet functionalities from the `yield-wars-program` into the `yield-wars-ui` frontend. The primary goal is to enable users to manage their in-game assets, specifically initializing their wallets, transferring USDC, and exchanging various currencies.

## 2. Goals [✓ COMPLETED]

*   [✓] Provide a seamless onboarding experience by automatically initializing and funding a user's game wallet.
*   [✓] Enable users to transfer USDC to other players within the game.
*   [✓] Allow users to exchange different types of in-game currencies.
*   [✓] Ensure secure transaction handling by leveraging user-specific signatures for relevant actions and admin signatures for system-level operations.
*   [✓] Maintain a robust and responsive user interface by utilizing TanStack Query for data fetching and state management.

## 3. User Stories / Features [✓ IMPLEMENTED]

*   **Wallet Initialization:** [✓ COMPLETE]
    *   Successfully implemented automatic game-specific wallet creation and funding with starting balance.
    *   Entity and component initialization handled through server-side actions.
    *   Price components initialized for all supported currencies.
*   **Currency Transfer:** [✓ COMPLETE]
    *   Implemented secure transfer functionality between user wallets.
    *   Supports all currency types with proper decimal handling.
    *   Transaction signing handled through Privy integration.
*   **Currency Exchange:** [✓ COMPLETE]
    *   Implemented cross-currency exchange functionality.
    *   Dynamic price component integration for accurate exchange rates.
    *   Proper error handling and transaction confirmation.

## 4. Implementation Details

### 4.1. Server Actions
*   **World Initialization** (`initializeNewWorld.ts`):
    *   Creates a new game world with currency entities
    *   Initializes price components for all supported currencies
    *   Sets up initial price data and enables price updates
*   **Wallet Initialization** (`initializeUserWallet.ts`):
    *   Creates user entity and components
    *   Initializes wallet with starting USDC balance
    *   Sets up price component PDAs for all currencies
*   **Currency Operations**:
    *   Transfer (`transferCurrency.ts`): Handles direct currency transfers
    *   Exchange (`exchangeCurrency.ts`): Manages currency exchange operations

### 4.2. React Hooks
*   **World Management**:
    *   `useInitializeNewWorld`: Manages world creation and currency setup
*   **Wallet Operations**:
    *   `useInitializeUserWallet`: Handles wallet initialization and setup
    *   `useTransferCurrency`: Manages currency transfers
    *   `useExchangeCurrency`: Handles currency exchange operations

### 4.3. State Management
*   Redux store implementation for:
    *   World state and initialization status
    *   User entity and wallet data
    *   Currency entities and price components
*   TanStack Query for:
    *   Transaction state management
    *   Cache invalidation on successful operations
    *   Optimistic updates

### 4.4. Transaction Signing
*   Privy integration for wallet operations
*   Server-side admin signing for initialization
*   Client-side user signing for transfers and exchanges

## 5. Technical Implementation Notes

### 5.1. Transaction Flow
1. **World Initialization**:
   ```typescript
   const result = await initializeWorld({ userPublicKey });
   // World PDA and currency entities stored in Redux
   ```

2. **Wallet Initialization**:
   ```typescript
   const result = await initializeWallet({ 
     userPublicKey, 
     worldPda 
   });
   // Entity PDA and component PDAs stored
   ```

3. **Currency Operations**:
   ```typescript
   // Transfer
   const transferResult = await transferCurrency({
     worldPda,
     sourceEntityPda,
     destinationEntityPda,
     currencyType,
     amount
   });

   // Exchange
   const exchangeResult = await exchangeCurrency({
     worldPda,
     userEntityPda,
     sourceCurrency,
     destinationCurrency,
     amount
   });
   ```

### 5.2. Component Structure
- Server actions in `app/actions/`
- React hooks in `hooks/program/`
- Redux state in `stores/features/`
- UI components in `components/`

## 6. Testing & Verification [✓ COMPLETE]

*   [✓] World initialization tested and verified
*   [✓] Wallet initialization with starting funds verified
*   [✓] Currency transfer functionality tested
*   [✓] Exchange operations verified with multiple currency pairs
*   [✓] Error handling and recovery tested

## 7. Future Improvements

1. **Performance Optimization**
   - Implement batch transactions for multiple operations
   - Add caching for frequently accessed price data

2. **User Experience**
   - Add transaction history tracking
   - Implement real-time price updates
   - Add transaction confirmation modals

3. **Security Enhancements**
   - Add transaction amount validation
   - Implement rate limiting for operations
   - Add additional error recovery mechanisms

## 8. Migration Guide

For teams implementing this wallet functionality:

1. Ensure proper setup of environment variables:
   ```env
   NEXT_PUBLIC_RPC_ENDPOINT=
   FE_CL_BS58_SIGNER_PRIVATE_KEY=
   ```

2. Required dependencies:
   ```json
   {
     "@magicblock-labs/bolt-sdk": "latest",
     "@privy-io/react-auth": "latest",
     "@tanstack/react-query": "latest"
   }
   ```

3. Follow the implementation order:
   - World initialization
   - User wallet initialization
   - Currency operations setup
