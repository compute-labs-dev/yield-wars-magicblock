import { useState, useCallback } from 'react';
import { processCommand, getAllCommands } from '../lib/commands';
import { Command } from '../models/commands';
import { usePrivy } from '@privy-io/react-auth';

interface CommandHistory {
    command: string;
    response: string;
    timestamp: number;
}

interface UseTerminalCommandsReturn {
    // Command processing
    executeCommand: (command: string) => Promise<string>;
    isProcessing: boolean;
    
    // Command history management
    commandHistory: CommandHistory[];
    clearHistory: () => void;
    
    // Available commands
    availableCommands: Command[];
    
    // Command state
    lastCommand: string | null;
    lastResponse: string | null;
}

export function useTerminalCommands(): UseTerminalCommandsReturn {
    // State for command processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
    const [lastCommand, setLastCommand] = useState<string | null>(null);
    const [lastResponse, setLastResponse] = useState<string | null>(null);

    // Get Privy context
    const { authenticated, login, logout, user } = usePrivy();

    // Get available commands
    const availableCommands = getAllCommands();

    // Execute command
    const executeCommand = useCallback(async (command: string) => {
        setIsProcessing(true);
        setLastCommand(command);

        try {
            // Pass Privy context to processCommand
            const response = await processCommand(command, {
                authenticated,
                user,
                login,
                logout
            });
            
            // Update history
            setCommandHistory(prev => [...prev, {
                command,
                response,
                timestamp: Date.now()
            }]);

            setLastResponse(response);
            return response;
        } catch (error: unknown) {
            const errorMessage = `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`;
            setLastResponse(errorMessage);
            return errorMessage;
        } finally {
            setIsProcessing(false);
        }
    }, [authenticated, user, login, logout]);

    // Clear history
    const clearHistory = useCallback(() => {
        setCommandHistory([]);
        setLastCommand(null);
        setLastResponse(null);
    }, []);

    return {
        executeCommand,
        isProcessing,
        commandHistory,
        clearHistory,
        availableCommands,
        lastCommand,
        lastResponse
    };
}

// Optional: Export types for use in other components
export type { CommandHistory, UseTerminalCommandsReturn };
