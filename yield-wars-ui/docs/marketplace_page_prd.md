# PRD: Currency Exchange Page (`/marketplace`)

## 1. Overview

This document outlines the Product Requirements for the Currency Exchange Page (designated as `/marketplace` in the UI). This page will provide users with the ability to swap various in-game currencies and tokens, view basic price information, and manage their token balances within the Yield Wars game. It aims to provide a user-friendly interface for common decentralized exchange (DEX) functionalities tailored to the game's economy.

## 2. Goals

*   [ ] Enable users to seamlessly exchange one in-game currency/token for another.
*   [ ] Provide users with a clear view of their current balances for relevant currencies.
*   [ ] Display indicative price information for listed tokens (e.g., price against a common currency like USDC or SOL, percentage change).
*   [ ] Offer a visual representation of price history for selected currency pairs (e.g., a simple line or candle chart).
*   [ ] Ensure secure transaction handling via Privy wallet integration.
*   [ ] Leverage existing backend `EconomySystem` for executing exchange transactions and `PriceActionSystem` (or equivalent) for fetching price data.
*   [ ] Integrate cleanly with the overall UI theme and navigation of Yield Wars.

## 3. User Stories / Features

*   **Token Listing:**
    *   [ ] As a user, I want to see a list of available tokens/currencies I can trade (e.g., USDC, SOL, BTC, ETH, AIFI, COMP, etc.).
    *   [ ] For each token, I want to see its name, symbol, current price (e.g., vs. USDC), and a recent price change percentage.
    *   [ ] I want to see the volume traded for each token (if available from the backend).
*   **Price Chart:**
    *   [ ] As a user, I want to select a currency pair (e.g., SOL/USDC) to view its price chart.
    *   [ ] The chart should display historical price data, allowing me to understand recent trends.
    *   [ ] (Optional V1) Basic chart controls like time range selection (e.g., 24h, 7d, 30d).
*   **Swap Interface:**
    *   [ ] As a user, I want to select a "Swap From" currency and a "Swap To" currency.
    *   [ ] I want to see my current balance for the "Swap From" currency.
    *   [ ] I want to input the amount of the "Swap From" currency I wish to trade.
    *   [ ] The interface should show me the estimated amount of "Swap To" currency I will receive based on current exchange rates (including any fees).
    *   [ ] I want to be able to easily swap which currency is "From" and "To".
    *   [ ] I want to execute the swap transaction, which should prompt me for a signature via my connected Privy wallet.
    *   [ ] I want to receive clear feedback on the transaction status (pending, success, failure).
*   **Balance Display:**
    *   [ ] As a user, I want to see my balances for the currencies involved in the swap interface.
    *   [ ] (Optional) A general overview of my token balances relevant to the marketplace.
*   **Order Types (Future Consideration - Not for V1):**
    *   [ ] (Future) As a user, I might want to place limit orders.
    *   [ ] (Future) As a user, I might want to engage in short/long positions if the game mechanics support this. (Based on mockup, but likely out of scope for initial currency swap).

## 4. Design & UI

*   Refer to the "Marketplace" image provided:
    *   **Layout:** Three main sections: Top Tokens list (left), Chart (center), Swap Interface (right).
    *   **Styling:** Adhere to the existing Yield Wars dark theme, font choices, and component styles.
    *   **Console:** The debug console at the bottom should remain if it's a global UI element.
    *   **Navigation:** Standard header with "Home", "AI Insights", "Rewards", "Marketplace", "Leaderboard", "Data Centers", "Wallet Connection".
    *   **Footer:** Standard footer displaying connection status and key currency balances.

## 5. Technical Design & Implementation Details

### 5.1. Frontend

*   **Framework/Routing:** Next.js App Router for the `/marketplace` page.
*   **State Management:**
    *   Redux Toolkit: For global state like user wallet connection, `worldPda`, initialized currency entity PDAs, and potentially cached price data.
    *   TanStack Query: For managing server state, including fetching token lists, price data, user balances, and handling mutations for swap transactions.
*   **Key Components:**
    *   `MarketplacePageLayout`: Main container for the page.
    *   `TokenSidebar`: Displays the list of "Top Tokens".
        *   `TokenListItem`: Individual token entry.
    *   `PriceChartComponent`: Displays the price chart. (Initial version might be a static image or a simplified chart library integration like Recharts or a lightweight trading chart library if complex features are deferred).
    *   `SwapInterface`: Handles currency selection, amount input, estimated output display, and transaction execution.
*   **Hooks:**
    *   `useCurrencyBalances`: Hook to fetch and display user balances for various tokens.
    *   `useTokenPrices`: Hook to fetch current prices and price change data for the token list.
    *   `usePriceChartData`: Hook to fetch historical data for the selected chart pair.
    *   `useExchangeCurrency`: (Leverage existing from `yield-wars-ui/src/hooks/program/useExchangeCurrency.ts`) for handling the swap logic.
*   **Data Fetching & Services:**
    *   Actions/functions to interact with the backend to:
        *   Fetch the list of supported currencies for exchange.
        *   Fetch current price data for these currencies (from `PriceActionSystem` outputs or a dedicated price feed).
        *   Fetch historical price data.
    *   Utilize `worldData.currencyEntities` and the initialized `priceComponentPdas` from the Redux store or context to ensure correct PDAs are used when interacting with the `EconomySystem`.

### 5.2. Backend Interaction

*   **Swap Execution:** The `exchangeCurrency` server action (and underlying `useExchangeCurrency` hook) will be used, which interacts with the `EconomySystem` on the Solana program.
    *   It requires: `worldPda`, `userEntityPda`, source/destination currency types, amount, `sourcePricePda`, `destinationPricePda`, `sourceCurrencyEntityPda`, `destinationCurrencyEntityPda`.
*   **Price Data:**
    *   The `PriceActionSystem` on the backend is responsible for maintaining and updating prices. The frontend will need a way to read these prices. This might involve:
        *   Fetching data from specific `Price` component accounts.
        *   A dedicated backend API endpoint that aggregates this data.
    *   Historical price data might need to be logged by the `PriceActionSystem` and made queryable.

### 5.3. Wallet Integration

*   Privy (`@privy-io/react-auth`) for wallet connection and transaction signing.
*   The `useSignAndSendTransaction` hook will be used to sign and send the exchange transaction prepared by the `exchangeCurrency` action.

## 6. Success Metrics / Acceptance Criteria

*   [ ] User can successfully connect their Privy wallet.
*   [ ] A list of at least 3-5 tradable tokens is displayed with their current prices.
*   [ ] User can select any two distinct listed tokens in the "Swap From" and "Swap To" fields.
*   [ ] User's balance for the "Swap From" token is accurately displayed.
*   [ ] Entering an amount in "Swap From" correctly calculates and displays an estimated "Swap To" amount.
*   [ ] User can successfully execute a swap transaction, and it is confirmed on-chain.
*   [ ] User's token balances in the UI update correctly after a successful swap.
*   [ ] Basic price chart (even if static initially for V1) displays for a default pair.
*   [ ] Page is responsive and usable on common desktop screen sizes.
*   [ ] Errors during swap (e.g., insufficient funds, slippage if applicable, transaction failure) are clearly communicated to the user.

## 7. Future Considerations / Out of Scope for V1

*   Advanced charting features (technical indicators, drawing tools).
*   Order book display.
*   Limit orders, stop-loss, take-profit orders.
*   Transaction history specific to the marketplace page.
*   Slippage tolerance settings.
*   Detailed analytics on token performance.
*   Support for non-Bolt standard tokens (if applicable in the future).
*   Real-time price updates via websockets.

---
This PRD provides a comprehensive guide for developing the Currency Exchange page. 