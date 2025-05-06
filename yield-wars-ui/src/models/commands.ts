import type { User } from '@privy-io/react-auth';

// Command parameter types
export interface CommandParameter {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
}

// Base command interface
export interface BaseCommand {
    name: string;
    description: string;
    category: 'system' | 'trading' | 'game' | 'help' | 'social';
    parameters?: CommandParameter[];
}

// Static command with fixed response
export interface StaticCommand extends BaseCommand {
    type: 'static';
    response: string;
}

// Added: Define context type for Privy data needed by commands
export interface PrivyCommandContext {
    authenticated: boolean;
    user: User | null;
    login: () => void;
    logout: () => Promise<void>;
}

// Dynamic command that requires processing
export interface DynamicCommand extends BaseCommand {
    type: 'dynamic';
    // Modified to optionally accept context
    execute: (args: string[], context?: PrivyCommandContext) => Promise<string>;
}

export type Command = StaticCommand | DynamicCommand;