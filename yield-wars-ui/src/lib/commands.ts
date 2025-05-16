import { 
    Command, 
    PrivyCommandContext,
    // StaticCommand,
    // DynamicCommand 
} from '@/models/commands';
import { store } from '@/stores/store'; // Import Redux store from the correct location
import {
    toggleWorldFlat,
    setTerminalHeight, // Import terminal action
    closeTerminal,     // Import terminal action
    expandTerminal,     // Import terminal action
    toggleResourcesVisible,   // Added
    toggleLeaderboardVisible,  // Added
    toggleProfileContainerVisible, // Added
    toggleLoginVisible
} from '@/stores/features/uiSlice';

// Import necessary functions from actions
import { fetchWalletBalance } from '@/app/actions/fetchWalletBalance';
import { getWalletGpus } from '@/app/actions/getWalletGpus';
import { purchaseGpu } from '@/app/actions/purchaseGpu';
import { CurrencyType } from '@/lib/constants/programEnums';
import * as constants from '@/lib/consts';

// Command Registry
const commands = new Map<string, Command>();

// Helper function to register commands
function registerCommand(command: Command) {
    commands.set(command.name, command);
}

// Helper to get all commands
export function getAllCommands(): Command[] {
    return Array.from(commands.values());
}

// Helper to get command by name
export function getCommand(name: string): Command | undefined {
    return commands.get(name.toLowerCase());
}

// Removed Terminal state management callbacks and registration function
// let terminalHeightCallback: ((height: string) => void) | null = null;
// let terminalCloseCallback: (() => void) | null = null;
// export function registerTerminalCallbacks(...) { ... }

// Terminal control commands
registerCommand({
    name: 'resize',
    type: 'dynamic',
    description: 'Resize the terminal window to a specific height',
    category: 'system',
    parameters: [
        {
            name: 'height',
            type: 'number',
            description: 'Height in vh (10-90)',
            required: true
        }
    ],
    execute: async (args: string[]) => {
        if (!args.length) {
            return 'Error: Please specify a height (10-90)';
        }
        const height = parseInt(args[0]);
        if (isNaN(height)) {
            return 'Error: Height must be a number';
        }
        if (height < 10 || height > 90) {
            return 'Error: Height must be between 10 and 90';
        }

        const newHeight = `${height}vh`;
        store.dispatch(setTerminalHeight(newHeight));
        return `Terminal height set to ${newHeight}`;
    }
});

registerCommand({
    name: 'expand',
    type: 'dynamic',
    description: 'Expand the terminal window to 70% of viewport height',
    category: 'system',
    execute: async () => {
        store.dispatch(expandTerminal());
        return 'Terminal expanded to 70vh';
    }
});

registerCommand({
    name: 'close',
    type: 'dynamic',
    description: 'Close the terminal window',
    category: 'system',
    execute: async () => {
        store.dispatch(closeTerminal());
        return 'Closing terminal...';
    }
});

// Add the new toggle-globe command
registerCommand({
    name: 'toggle-globe',
    type: 'dynamic',
    description: 'Toggle between the 3D globe and the 2D map view',
    category: 'system', // Or perhaps 'display' or 'ui' category later?
    execute: async () => {
        store.dispatch(toggleWorldFlat());
        // We need to read the state *after* dispatching to report the new state
        const currentState = store.getState().ui.isWorldFlat;
        return `Globe view set to: ${currentState ? '2D Map' : '3D Globe'}`;
    }
});

// Add the new toggle-resources command
registerCommand({
    name: 'toggle-resources',
    type: 'dynamic',
    description: 'Show or hide the Resources side panel',
    category: 'system',
    execute: async () => {
        // Dispatch first to change state
        store.dispatch(toggleResourcesVisible());
        // Read the *new* state after dispatch
        const currentState = store.getState().ui.isResourcesVisible;
        return `Resources panel ${currentState ? 'shown' : 'hidden'}`;
    }
});

// Add the new toggle-leaderboard command
registerCommand({
    name: 'toggle-leaderboard',
    type: 'dynamic',
    description: 'Show or hide the Leaderboard (Squads/Referrals) side panel',
    category: 'system',
    execute: async () => {
        // Dispatch first to change state
        store.dispatch(toggleLeaderboardVisible());
        // Read the *new* state after dispatch
        const currentState = store.getState().ui.isLeaderboardVisible;
        return `Leaderboard panel ${currentState ? 'shown' : 'hidden'}`;
    }
});

// Add the new baremetal command
registerCommand({
    name: 'baremetal',
    type: 'dynamic',
    description: 'Switch to the Bare Metal terminal interface',
    category: 'system', // Or 'navigation' if preferred
    execute: async () => {
        // Check if running in a browser environment before using window
        if (typeof window !== 'undefined') {
            window.location.href = '/b';
            return 'Switching to Bare Metal interface...';
        } else {
            // Handle non-browser environment (e.g., server-side execution) if necessary
            return 'Error: Cannot navigate in this environment.';
        }
    }
});

// Add the new login command
registerCommand({
    name: 'login',
    type: 'dynamic',
    description: 'Log in or show current login status',
    category: 'system',
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';

        if (context.authenticated && context.user?.wallet) {
            // Shorten address for display
            const addr = context.user.wallet.address;
            const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
            return `Currently logged in with ${shortAddr}`;
        } else if (context.authenticated) {
            return 'Currently logged in, but wallet address not found.';
        } else {
            store.dispatch(toggleLoginVisible());
            context.login();
            return 'Initiating login...';
        }
    }
});

registerCommand({
    name: 'profile',
    type: 'dynamic',
    description: 'Open the user profile modal',
    category: 'system',
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';
        
        if (!context.authenticated) {
            return 'Error: You need to be logged in to view your profile. Try using the `login` command first.';
        }
        
        store.dispatch(toggleProfileContainerVisible()); 
        return 'Opening profile...';
    }
});

// Add the new logout command
registerCommand({
    name: 'logout',
    type: 'dynamic',
    description: 'Log out of your current session',
    category: 'system',
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';

        if (!context.authenticated) {
            return 'Error: You are not currently logged in.';
        }

        try {
            // Get the current wallet address for the message
            const addr = context.user?.wallet?.address;
            const shortAddr = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'your account';
            
            // Call the logout function from context
            await context.logout();
            
            return `Successfully logged out ${shortAddr}`;
        } catch (error) {
            console.error('Error logging out:', error);
            return 'Error occurred while logging out. Please try again.';
        }
    }
});

// Add marketplace command
registerCommand({
    name: 'marketplace',
    type: 'dynamic',
    description: 'Navigate to the marketplace page',
    category: 'system',
    execute: async () => {
        if (typeof window !== 'undefined') {
            window.location.href = '/marketplace';
            return 'Navigating to marketplace...';
        } else {
            return 'Error: Cannot navigate in this environment.';
        }
    }
});

// Add store command
registerCommand({
    name: 'store',
    type: 'dynamic',
    description: 'Navigate to the store page',
    category: 'system',
    execute: async () => {
        if (typeof window !== 'undefined') {
            window.location.href = '/supply-shack?tab=store';
            return 'Navigating to store...';
        } else {
            return 'Error: Cannot navigate in this environment.';
        }
    }
});

// Add inventory command
registerCommand({
    name: 'inventory',
    type: 'dynamic',
    description: 'Navigate to the inventory page',
    category: 'system',
    execute: async () => {
        if (typeof window !== 'undefined') {
            window.location.href = '/supply-shack?tab=inventory';
            return 'Navigating to inventory...';
        } else {
            return 'Error: Cannot navigate in this environment.';
        }
    }
});

// System Commands
registerCommand({
    name: 'help',
    type: 'dynamic',
    description: 'Display available commands and their usage',
    category: 'help',
    parameters: [
        {
            name: 'command',
            type: 'string',
            description: 'Command to get detailed help for',
            required: false
        }
    ],
    execute: async (args: string[]) => {
        if (args.length > 0) {
            return getCommandHelp(args[0]);
        }

        return `[AUTHENTICATION]
  login                Log in or show login status
  logout               Log out of current session
  profile              View and manage your profile

[TRADING]
  price <token>        Get token price
  wallet              Show your wallet balance and GPUs
  exchange            Exchange between currencies
  confirm-exchange    Confirm currency exchange

[GAME]
  purchase-gpu        Buy GPUs for mining
  season              Show current season info

[NAVIGATION]
  marketplace         Go to marketplace
  store              Go to supply store
  inventory          Go to inventory

[SYSTEM]
  resize <height>     Set height (10-90vh)
  expand             Expand to 70vh
  close              Close terminal
  toggle-globe       Toggle 3D/2D globe view
  toggle-resources   Show/Hide Resources panel
  toggle-leaderboard Show/Hide Leaderboard panel
  baremetal          Switch to Bare Metal interface
  clear              Clear terminal screen
  version            Show current version

Type 'help <command>' for details about specific commands
Examples: 
  help login         Show login command details
  help exchange      Show exchange command details`;
    }
});

registerCommand({
    name: 'version',
    type: 'static',
    description: 'Display current version of the game',
    category: 'system',
    response: 'YieldWars Season 1 (v1.0.0)'
});

registerCommand({
    name: 'season',
    type: 'static',
    description: 'Display information about the current season',
    category: 'game',
    response: `[SEASON 1]
  Market              SOL, ETH, USDC, AIFI, BTC
  Starting Balance    1000 USDC
  AIFI Updates       Every 60s (±5% range)
  
[FEATURES]
  Trading            Simulated Crypto Market
  Yield              COMP/GNFT with AiFi Yield
  Social             2% Referral System
  Education          Content Series & Rewards

[REWARDS]
  Referrals          Top 10 receive bonus
  Education          Complete tutorials for rewards
  Trading            Earn yield on holdings`
});

registerCommand({
    name: 'clear',
    type: 'static',
    description: 'Clear the terminal screen',
    category: 'system',
    response: '\x1Bc' // ANSI escape code to clear screen
});

// Example of a dynamic command
registerCommand({
    name: 'price',
    type: 'dynamic',
    description: 'Get current price of a token',
    category: 'trading',
    parameters: [
        {
            name: 'token',
            type: 'string',
            description: 'Token symbol (SOL, ETH, USDC, AIFI, BTC)',
            required: true
        }
    ],
    execute: async (args: string[]) => {
        const token = args[0]?.toUpperCase();
        if (!token) {
            return 'Error: Please specify a token symbol';
        }
        
        const validTokens = ['SOL', 'ETH', 'USDC', 'AIFI', 'BTC'];
        if (!validTokens.includes(token)) {
            return `Error: Invalid token. Valid tokens are: ${validTokens.join(', ')}`;
        }
        
        // TODO: Implement actual price fetching logic
        return `Fetching current price for ${token}...`;
    }
});

// Add wallet command
registerCommand({
    name: 'wallet',
    type: 'dynamic',
    description: 'Show your wallet balance and available GPUs',
    category: 'game',
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';
        
        if (!context.authenticated || !context.user?.wallet) {
            return 'Error: You need to be logged in to view your wallet. Try using the `login` command first.';
        }
        
        try {
            // Get redux store state to extract needed parameters
            const state = store.getState();
            const worldPda = state.world.worldPda;
            const userEntity = state.userEntity.entities[context.user.wallet.address];
            
            if (!worldPda || !userEntity?.entityPda) {
                return 'Error: Your wallet is not fully initialized. Please navigate to the main UI to complete initialization.';
            }
            
            if (!userEntity.walletComponentPda) {
                return 'Error: Wallet component not initialized. Please navigate to the main UI to complete initialization.';
            }
            
            // Get wallet balance - using walletComponentPda instead of entityPda
            const balance = await fetchWalletBalance({
                worldPda,
                userEntityPda: userEntity.walletComponentPda, // This is the key change - use walletComponentPda
                userWalletPublicKey: context.user.wallet.address
            });
            
            // Get GPU information
            const gpuData = await getWalletGpus({
                worldPda,
                playerEntityPda: userEntity.entityPda
            });
            
            // Format balance info
            let response = `[WALLET BALANCE]\n`;
            response += `  USDC: ${balance.usdc.toFixed(2)}\n`;
            response += `  BTC: ${balance.btc.toFixed(8)}\n`;
            response += `  ETH: ${balance.eth.toFixed(8)}\n`;
            response += `  SOL: ${balance.sol.toFixed(6)}\n`;
            response += `  AIFI: ${balance.aifi.toFixed(2)}\n\n`;
            
            // Format GPU info
            response += `[OWNED GPUS]\n`;
            if (gpuData && gpuData.data && gpuData.data.length > 0) {
                // We have the raw GPU data, now attempt to display it in a useful way
                response += `  You own: ${gpuData.pubkey}\n`;
                response += `  Use 'inventory' command to view details in the UI\n`;
            } else {
                response += `  You don't own any GPUs yet.\n`;
                response += `  Try the 'purchase-gpu' command to buy one.\n`;
            }
            
            return response;
        } catch (error) {
            console.error('Error fetching wallet data:', error);
            return `Error: Failed to fetch wallet data - ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
});

// Add purchase-gpu command
registerCommand({
    name: 'purchase-gpu',
    type: 'dynamic',
    description: 'Purchase a GPU for mining',
    category: 'game',
    parameters: [
        {
            name: 'id',
            type: 'number',
            description: 'ID of the GPU to purchase',
            required: false
        }
    ],
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';
        
        if (!context.authenticated || !context.user?.wallet) {
            return 'Error: You need to be logged in to purchase GPUs. Try using the `login` command first.';
        }
        
        // Get redux store state
        const state = store.getState();
        const worldPda = state.world.worldPda;
        const userEntity = state.userEntity.entities[context.user.wallet.address];
        
        if (!worldPda || !userEntity?.entityPda) {
            return 'Error: Your wallet is not fully initialized. Please navigate to the main UI to complete initialization.';
        }
        
        // Use actual GPU entities from the state or constants
        const availableGpus = [
            { 
                id: 1, 
                name: "Entry GPU", 
                price: 50, 
                price_raw: 50000000, 
                entityPda: constants.ENTRY_GPU_ENTITY.toBase58()
            },
            { 
                id: 2, 
                name: "Standard GPU", 
                price: 100, 
                price_raw: 100000000, 
                entityPda: constants.STANDARD_GPU_ENTITY.toBase58()
            },
            { 
                id: 3, 
                name: "Premium GPU", 
                price: 200, 
                price_raw: 200000000, 
                entityPda: constants.PREMIUM_GPU_ENTITY.toBase58()
            }
        ];
        
        // If no args are provided, just show the available GPUs
        if (!args.length) {
            let response = `[AVAILABLE GPUS]\n`;
            availableGpus.forEach(gpu => {
                response += `  ${gpu.id}. ${gpu.name} - ${gpu.price} USDC\n`;
            });
            
            response += `\nUse 'purchase-gpu <id>' to purchase a specific GPU.\n`;
            response += `For example: 'purchase-gpu 1' to purchase the Entry GPU.\n`;
            return response;
        }
        
        // Handle purchase if an id is provided
        const gpuId = parseInt(args[0]);
        
        if (isNaN(gpuId) || gpuId < 1 || gpuId > availableGpus.length) {
            return `Error: Invalid GPU ID. Please choose a number between 1 and ${availableGpus.length}.`;
        }
        
        const selectedGpu = availableGpus[gpuId - 1];
        
        try {
            // Confirm purchase
            const confirmMessage = `[PURCHASE PREVIEW]\n  GPU: ${selectedGpu.name}\n  Price: ${selectedGpu.price} USDC\n\nProcessing purchase...`;
            
            // Get the USDC price PDA from the user entity
            const usdcPricePda = userEntity.priceComponentPdas[CurrencyType.USDC];
            
            if (!usdcPricePda) {
                return 'Error: USDC price component PDA not found. Please navigate to the main UI to complete initialization.';
            }
            
            // Prepare parameters for purchase
            const purchaseParams = {
                worldPda: worldPda,
                gpuEntityPda: selectedGpu.entityPda,
                buyerEntityPda: userEntity.entityPda,
                adminEntityPda: constants.ADMIN_ENTITY,
                gpuPrice: selectedGpu.price_raw,
                userWalletPublicKey: context.user.wallet.address,
                sourcePricePda: usdcPricePda
            };
            
            // Call purchaseGpu with the prepared parameters
            const purchaseResult = await purchaseGpu(purchaseParams);
            
            // Return success message with transaction signatures
            let response = `${confirmMessage}\n\n`;
            response += `Purchase completed successfully!\n`;
            response += `Purchase signature: ${purchaseResult.purchaseSig.slice(0, 8)}...\n`;
            response += `Assign signature: ${purchaseResult.assignSig.slice(0, 8)}...\n\n`;
            response += `View on explorer: https://explorer.solana.com/tx/${purchaseResult.purchaseSig}?cluster=devnet\n`;
            
            return response;
        } catch (error) {
            console.error('Error purchasing GPU:', error);
            return `Error: Failed to purchase GPU - ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
});

// Add exchange command
registerCommand({
    name: 'exchange',
    type: 'dynamic',
    description: 'Exchange one currency for another',
    category: 'trading',
    parameters: [
        {
            name: 'source',
            type: 'string',
            description: 'Source currency (USDC, BTC, ETH, SOL, AIFI)',
            required: true
        },
        {
            name: 'destination',
            type: 'string',
            description: 'Destination currency (USDC, BTC, ETH, SOL, AIFI)',
            required: true
        },
        {
            name: 'amount',
            type: 'number',
            description: 'Amount to exchange',
            required: true
        }
    ],
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';
        
        if (!context.authenticated || !context.user?.wallet) {
            return 'Error: You need to be logged in to exchange currency. Try using the `login` command first.';
        }
        
        if (args.length < 3) {
            return 'Error: Please specify source currency, destination currency, and amount.\nUsage: exchange <source> <destination> <amount>';
        }
        
        const source = args[0].toUpperCase();
        const destination = args[1].toUpperCase();
        const amount = parseFloat(args[2]);
        
        const validCurrencies = ['USDC', 'BTC', 'ETH', 'SOL', 'AIFI'];
        
        if (!validCurrencies.includes(source)) {
            return `Error: Invalid source currency. Valid currencies are: ${validCurrencies.join(', ')}`;
        }
        
        if (!validCurrencies.includes(destination)) {
            return `Error: Invalid destination currency. Valid currencies are: ${validCurrencies.join(', ')}`;
        }
        
        if (source === destination) {
            return 'Error: Source and destination currencies cannot be the same.';
        }
        
        if (isNaN(amount) || amount <= 0) {
            return 'Error: Amount must be a positive number.';
        }
        
        // Map currency strings to enum values
        const currencyTypeMap: {[key: string]: CurrencyType} = {
            'USDC': CurrencyType.USDC,
            'BTC': CurrencyType.BTC,
            'ETH': CurrencyType.ETH,
            'SOL': CurrencyType.SOL,
            'AIFI': CurrencyType.AIFI
        };
        
        // Get redux store state
        const state = store.getState();
        const worldPda = state.world.worldPda;
        const userEntity = state.userEntity.entities[context.user.wallet.address];
        
        if (!worldPda || !userEntity?.entityPda) {
            return 'Error: Your wallet is not fully initialized. Please navigate to the main UI to complete initialization.';
        }
        
        try {
            // Calculate exchange rate - this would normally be fetched from the program
            // For demo purposes, we'll use simplified mock rates
            const exchangeRates: {[key: string]: {[key: string]: number}} = {
                'USDC': { 'BTC': 0.000025, 'ETH': 0.0004, 'SOL': 0.01, 'AIFI': 1.0 },
                'BTC': { 'USDC': 40000, 'ETH': 16, 'SOL': 400, 'AIFI': 40000 },
                'ETH': { 'USDC': 2500, 'BTC': 0.0625, 'SOL': 25, 'AIFI': 2500 },
                'SOL': { 'USDC': 100, 'BTC': 0.0025, 'ETH': 0.04, 'AIFI': 100 },
                'AIFI': { 'USDC': 1.0, 'BTC': 0.000025, 'ETH': 0.0004, 'SOL': 0.01 }
            };
            
            const rate = exchangeRates[source][destination];
            const destinationAmount = amount * rate;
            
            // Format the exchange preview
            let response = `[EXCHANGE PREVIEW]\n`;
            response += `  From: ${amount.toFixed(4)} ${source}\n`;
            response += `  To: ${destinationAmount.toFixed(4)} ${destination}\n`;
            response += `  Rate: 1 ${source} = ${rate} ${destination}\n\n`;
            response += `Type 'confirm-exchange ${source} ${destination} ${amount}' to execute this exchange.\n`;
            
            return response;
        } catch (error) {
            console.error('Error in exchange command:', error);
            return `Error: Failed to exchange currency - ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
});

// Add confirm-exchange command
registerCommand({
    name: 'confirm-exchange',
    type: 'dynamic',
    description: 'Confirm and execute a currency exchange',
    category: 'trading',
    parameters: [
        {
            name: 'source',
            type: 'string',
            description: 'Source currency (USDC, BTC, ETH, SOL, AIFI)',
            required: true
        },
        {
            name: 'destination',
            type: 'string',
            description: 'Destination currency (USDC, BTC, ETH, SOL, AIFI)',
            required: true
        },
        {
            name: 'amount',
            type: 'number',
            description: 'Amount to exchange',
            required: true
        }
    ],
    execute: async (args: string[], context?: PrivyCommandContext) => {
        if (!context) return 'Error: Privy context not available.';
        
        if (!context.authenticated || !context.user?.wallet) {
            return 'Error: You need to be logged in to exchange currency. Try using the `login` command first.';
        }
        
        if (args.length < 3) {
            return 'Error: Please specify source currency, destination currency, and amount.\nUsage: confirm-exchange <source> <destination> <amount>';
        }
        
        const source = args[0].toUpperCase();
        const destination = args[1].toUpperCase();
        const amount = parseFloat(args[2]);
        
        // Map currency strings to enum values
        const currencyTypeMap: {[key: string]: CurrencyType} = {
            'USDC': CurrencyType.USDC,
            'BTC': CurrencyType.BTC,
            'ETH': CurrencyType.ETH,
            'SOL': CurrencyType.SOL,
            'AIFI': CurrencyType.AIFI
        };
        
        // Get redux store state
        const state = store.getState();
        const worldPda = state.world.worldPda;
        const userEntity = state.userEntity.entities[context.user.wallet.address];
        
        if (!worldPda || !userEntity?.entityPda) {
            return 'Error: Your wallet is not fully initialized. Please navigate to the main UI to complete initialization.';
        }
        
        try {
            // Get price PDAs from user entity
            const sourcePricePda = userEntity.priceComponentPdas[currencyTypeMap[source]];
            const destinationPricePda = userEntity.priceComponentPdas[currencyTypeMap[destination]];
            
            // Find currency entities from world store
            const sourceCurrencyEntity = state.world.currencyEntities.find(
                entity => entity.currencyType === currencyTypeMap[source]
            );
            
            const destinationCurrencyEntity = state.world.currencyEntities.find(
                entity => entity.currencyType === currencyTypeMap[destination]
            );
            
            if (!sourcePricePda || !destinationPricePda) {
                return 'Error: Currency price component PDAs not found. Please navigate to the main UI to complete initialization.';
            }
            
            if (!sourceCurrencyEntity || !destinationCurrencyEntity) {
                return 'Error: Currency entities not found in world state. Please navigate to the main UI to complete initialization.';
            }
            
            // Convert amount to raw value (multiplied by 1,000,000 for 6 decimal places)
            const rawAmount = Math.floor(amount * 1000000);
            
            // Prepare exchange parameters
            const exchangeParams = {
                worldPda,
                userEntityPda: userEntity.entityPda,
                transaction_type: 0, // Exchange transaction type
                currency_type: currencyTypeMap[source],
                destination_currency_type: currencyTypeMap[destination],
                amount: rawAmount,
                userWalletPublicKey: context.user.wallet.address,
                privySigner: context.user.wallet.address,
                sourcePricePda,
                destinationPricePda,
                sourceCurrencyEntityPda: sourceCurrencyEntity.entityPda,
                destinationCurrencyEntityPda: destinationCurrencyEntity.entityPda
            };
            
            // Execute the exchange using the API endpoint instead of server action
            let response = `Processing exchange...\n\n`;
            

            const apiResponse = await fetch('/api/exchange', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exchangeParams),
            });
            
            const data = await apiResponse.json();
            
            if (!apiResponse.ok) {
                throw new Error(data.error || 'Failed to exchange currency');
            }
            
            const signature = data.signature;
            
            response += `Exchange completed successfully!\n`;
            response += `Transaction signature: ${signature.slice(0, 8)}...\n\n`;
            response += `View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet\n`;
            
            return response;
        } catch (error) {
            console.error('Error in confirm-exchange command:', error);
            return `Error: Failed to execute exchange - ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
});

// Helper function to get command help
function getCommandHelp(command: string): string {
    const cmd = getCommand(command);
    if (!cmd) {
        return `Command not found: ${command}`;
    }

    let help = `[${cmd.name.toUpperCase()}]\n`;
    help += `  Description: ${cmd.description}\n`;
    
    if (cmd.parameters?.length) {
        help += '\n  Parameters:\n';
        cmd.parameters.forEach(param => {
            help += `    ${param.name}: ${param.description}\n`;
            help += `    Type: ${param.type}${param.required ? ' (Required)' : ' (Optional)'}\n`;
        });
    }

    help += '\n  Example:';
    switch (cmd.name) {
        case 'resize':
            help += '\n    resize 30     Set terminal height to 30vh';
            help += '\n    resize 50     Set terminal height to 50vh';
            break;
        case 'buy':
            help += '\n    buy 100 SOL    Buy 100 worth of SOL';
            help += '\n    buy 50 ETH     Buy 50 worth of ETH';
            break;
        case 'sell':
            help += '\n    sell 100 SOL   Sell 100 worth of SOL';
            help += '\n    sell 50 ETH    Sell 50 worth of ETH';
            break;
        case 'price':
            help += '\n    price SOL      Get SOL price';
            help += '\n    price ETH      Get ETH price';
            break;
        case 'login':
            help += '\n    login          Initiate login or show current status';
            break;
        case 'profile':
            help += '\n    profile        Open your profile details';
            break;
        case 'logout':
            help += '\n    logout         Log out of current session';
            break;
        case 'marketplace':
            help += '\n    marketplace    Navigate to marketplace';
            break;
        case 'store':
            help += '\n    store          Navigate to supply store';
            break;
        case 'inventory':
            help += '\n    inventory      Navigate to inventory';
            break;
        default:
            if (!cmd.parameters || cmd.parameters.length === 0) {
                 help += `\n    ${cmd.name}`;
            } else {
                help += `\n    ${cmd.name} <parameters...>`;
            }
    }

    return help;
}

// Command processor
export async function processCommand(input: string, privyContext: PrivyCommandContext): Promise<string> {
    const [commandName, ...args] = input.trim().toLowerCase().split(' ');
    const command = commands.get(commandName);

    if (!command) {
        return `Command not found: ${commandName}\nType 'help' for a list of available commands.`
    }

    if (command.type === 'static') {
        return command.response;
    } else {
        try {
            // Pass the context to the command's execute function
            return await command.execute(args, privyContext); 
        } catch (error: unknown) {
            return `Error executing command: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        }
    }
}
