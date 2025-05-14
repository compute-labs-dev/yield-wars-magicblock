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
// Removed direct import of User type as it's now in types/commands.ts via context

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
  balance              Show balance
  price <token>        Get token price
  buy <amt> <token>    Buy specified amount
  sell <amt> <token>   Sell specified amount
  portfolio           View holdings

[GAME]
  stats               Show stats
  leaderboard         Show top players
  yield               Check yields
  gnft list          List GNFTs
  comp info          Show COMP info

[SOCIAL]
  refer               Get referral link
  referral-stats     View referral earnings
  learn              View tutorials

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
  help buy           Show buy command details`;
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
