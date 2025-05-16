import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useTerminalCommands } from '../../hooks/useTerminalCommands';
import { toast } from 'sonner';

interface TerminalEntry {
    type: 'input' | 'output';
    content: string;
}

interface PrimaryTerminalProps {
    // Optional initial messages to display
    initialEntries?: TerminalEntry[];
    // Optional welcome message to display at the top
    welcomeMessage?: string;
    // Optional text for the input prompt (defaults to ">")
    promptSymbol?: string;
    // Optional delay before the terminal appears (in milliseconds)
    appearDelay?: number;
    // Control terminal visibility
    isVisible: boolean;
    // Whether this is the initial page load
    isInitialLoad?: boolean;
    // Callback for when close button is clicked
    onClose: () => void;
    // Height control
    height?: string;
    // Callback for height changes
    onHeightChange?: (height: string) => void;
}

const PrimaryTerminal: React.FC<PrimaryTerminalProps> = ({ 
    initialEntries = [],
    welcomeMessage,
    promptSymbol = '>',
    appearDelay = 0,
    isVisible,
    isInitialLoad = true,
    onClose,
    height = '40vh',
}) => {
    const [inputValue, setInputValue] = useState<string>('');
    const [entries, setEntries] = useState<TerminalEntry[]>(
        welcomeMessage 
        ? [{ type: 'output', content: welcomeMessage }, ...initialEntries] 
        : initialEntries
    );
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [hasInitiallyAppeared, setHasInitiallyAppeared] = useState<boolean>(appearDelay === 0);
    
    const { executeCommand, isProcessing } = useTerminalCommands();
    
    const inputRef = useRef<HTMLInputElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    // Handle appearance delay only on initial load
    useEffect(() => {
        if (appearDelay > 0 && isInitialLoad) {
            const timer = setTimeout(() => {
                setHasInitiallyAppeared(true);
            }, appearDelay);
        
            return () => clearTimeout(timer);
        } else if (!isInitialLoad) {
            setHasInitiallyAppeared(true);
        }
    }, [appearDelay, isInitialLoad]);
  
    // Focus input when component mounts or when terminal is clicked
    useEffect(() => {
        if (isVisible) {
            inputRef.current?.focus();
            // Initialize cursor position at the beginning
            if (cursorRef.current) {
                cursorRef.current.style.left = '0px';
            }
        }
    }, [isVisible]);

    // Auto-scroll to bottom when entries change
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [entries]);

    // Refocus input after command processing is complete
    useEffect(() => {
        if (!isProcessing) {
            // Small timeout to ensure UI updates first
            setTimeout(() => {
                inputRef.current?.focus();
                setIsFocused(true);
                // Ensure cursor is positioned correctly
                if (cursorRef.current && inputValue === '') {
                cursorRef.current.style.left = '0px';
                }
            }, 10);
        }
    }, [isProcessing, inputValue]);

  // Update cursor position based on text width
    useEffect(() => {
        if (cursorRef.current && inputRef.current) {
            if (inputValue === '') {
                // When empty, position at the start
                cursorRef.current.style.left = '0px';
            } else {
                // Create a temporary span to measure the text width
                const tempSpan = document.createElement('span');
                tempSpan.style.font = window.getComputedStyle(inputRef.current).font;
                tempSpan.style.visibility = 'hidden';
                tempSpan.style.position = 'absolute';
                tempSpan.style.whiteSpace = 'pre'; // Preserve whitespace including spaces
                
                // Use textContent to properly handle spaces
                tempSpan.textContent = inputValue;
                
                document.body.appendChild(tempSpan);
                
                const width = tempSpan.getBoundingClientRect().width;
                document.body.removeChild(tempSpan);
                
                cursorRef.current.style.left = `${width}px`;
            }
        }
    }, [inputValue, isFocused]); // Add isFocused dependency to update cursor position when focus changes

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSubmit = async () => {
        if (!inputValue.trim() || isProcessing) return;
        
        // Add to command history
        const trimmedInput = inputValue.trim();
        setCommandHistory(prev => [trimmedInput, ...prev]);
        setHistoryIndex(-1);
        
        // Add the input to entries
        const newEntries: TerminalEntry[] = [...entries, { type: 'input', content: trimmedInput }];
        setEntries(newEntries);
        
        // Process command
        try {
            const response = await executeCommand(trimmedInput);
            setEntries(prev => [...prev, { type: 'output', content: response }]);
        } catch (error: unknown) {
            setEntries(prev => [...prev, { type: 'output', content: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}` }]);
        }
        
        // Clear input
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isProcessing) {
            handleSubmit();
        } else if (e.key === 'ArrowUp') {
            // Navigate up through command history
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            // Navigate down through command history or clear if at end
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue('');
            }
        }
    };

    const handleTerminalClick = () => {
        inputRef.current?.focus();
        setIsFocused(true);
        
        // Explicitly set cursor position to beginning on initial click
        if (cursorRef.current && inputValue === '') {
            cursorRef.current.style.left = '0px';
        }
    };

    // Get the green glow style for text
    const getGlowStyle = (opacity: number = 0.8) => ({
        color: '#4AFF4A',
        textShadow: `0 0 4px rgba(74, 255, 74, ${opacity})`
    });

    // Get the white style for user input
    const getUserInputStyle = (opacity: number = 1.0) => ({
        color: '#FFFFFF',
        textShadow: `0 0 2px rgba(255, 255, 255, ${opacity})`
    });

    // Format terminal output with syntax highlighting
    const formatOutput = (content: string): ReactNode => {
        // Check for URLs in the content and make them clickable
        const containsUrl = content.match(/https?:\/\/[^\s]+/g);
        
        if (containsUrl) {
            // Replace URLs with clickable links
            return (
                <div className="whitespace-pre-wrap font-mono text-sm leading-tight">
                    {content.split('\n').map((line, i) => {
                        // Process any line that might contain a URL
                        const urlPattern = /(https?:\/\/[^\s]+)/g;
                        if (line.match(urlPattern)) {
                            // Split the line into parts: text and URLs
                            const parts = line.split(urlPattern);
                            return (
                                <div key={i}>
                                    {parts.map((part, j) => {
                                        if (part.match(urlPattern)) {
                                            // This is a URL, make it clickable
                                            return (
                                                <span key={j} className="inline-flex items-center">
                                                    <a 
                                                        href={part}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:underline cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {part}
                                                    </a>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(part);
                                                            toast.success('Link copied to clipboard', {
                                                                position: 'bottom-center',
                                                                style: {
                                                                    background: '#1E1E1E',
                                                                    color: '#4AFF4A',
                                                                    border: '1px solid #4AFF4A',
                                                                },
                                                                duration: 2000,
                                                            });
                                                        }}
                                                        className="ml-1 text-gray-400 hover:text-white opacity-70 hover:opacity-100"
                                                        title="Copy to clipboard"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                        </svg>
                                                    </button>
                                                </span>
                                            );
                                        }
                                        return <span key={j}>{part}</span>;
                                    })}
                                </div>
                            );
                        }
                        return <div key={i}>{line}</div>;
                    })}
                </div>
            );
        }
        
        // Check if content has section headers (both help and season outputs)
        if (content.match(/^\[.*\]$/m)) {
            return (
                <div className="whitespace-pre font-mono text-sm leading-tight">
                    {content.split('\n').map((line, i) => {
                        // Highlight section headers
                        if (line.match(/^\[.*\]$/)) {
                            return (
                                <div key={i} className="text-[#4AFF4A] font-bold mt-2 first:mt-0">
                                    {line}
                                </div>
                            );
                        }
                        
                        // Handle empty lines
                        if (line.trim() === '') {
                            return <div key={i} className="h-1"></div>;
                        }
                        
                        // Handle command/info lines
                        if (line.trim().length > 0 && !line.startsWith('Type')) {
                            const parts = line.trim().match(/^(\S+(?:\s+(?:<[^>]+>|\S+))*)\s{2,}(.+)$/);
                            if (parts) {
                                return (
                                    <div key={i} className="ml-2 flex items-center">
                                        <span className="text-[#4AFF4A] w-[140px] inline-flex items-center">
                                            {parts[1].split(/(<[^>]+>)/).map((part, j) => (
                                                <span key={j} className={part.startsWith('<') ? 'text-yellow-400' : ''}>
                                                    {part}
                                                </span>
                                            ))}
                                        </span>
                                        <span className="text-gray-400">{parts[2]}</span>
                                    </div>
                                );
                            }
                            return <div key={i} className="ml-2">{line}</div>;
                        }
                        
                        // Handle footer text
                        if (line.startsWith('Type')) {
                            return (
                                <div key={i} className="text-gray-400 text-xs mt-2">
                                    {line}
                                </div>
                            );
                        }
                        
                        return <div key={i}>{line}</div>;
                    })}
                </div>
            );
        }
        
        // For other command outputs (like price, etc.)
        return content;
    };

    return (
        <div 
            className={`relative w-full overflow-hidden border-t border-b border-[#4AFF4A]/20 transition-all duration-300 ${(isVisible && (hasInitiallyAppeared || !isInitialLoad)) ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleTerminalClick}
            style={{ height }}
        >
            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-2 right-2 z-[2001] w-6 h-6 flex items-center justify-center rounded hover:bg-[#4AFF4A]/20 transition-colors"
                style={getGlowStyle()}
            >
                ×
            </button>

            {/* Grid background */}
            <div className="absolute inset-0 bg-black bg-grid-pattern z-0"></div>
            
            {/* Terminal window */}
            <div 
                ref={terminalRef}
                className="relative w-full h-full bg-black bg-opacity-90 font-mono p-4 overflow-y-auto z-[2000]"
            >
                {/* Command history */}
                {entries.map((entry, index) => (
                    <div key={index} className="mb-2">
                        <div className="flex">
                            <span className="mr-2 opacity-90" style={entry.type === 'input' ? getUserInputStyle(0.8) : getGlowStyle(0.8)}>
                                {entry.type === 'input' ? ` ${promptSymbol}` : ' <'}
                            </span>
                            <span 
                                className="flex-1" 
                                style={entry.type === 'input' ? getUserInputStyle() : getGlowStyle()}
                            >
                                {entry.type === 'output' ? formatOutput(entry.content) : entry.content}
                            </span>
                        </div>
                    </div>
                ))}
                
                {/* Input line */}
                <div className="flex items-center">
                    <span className="mr-2 opacity-90" style={getUserInputStyle(0.8)}> {promptSymbol}</span>
                    <div ref={inputContainerRef} className="flex-grow relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="w-full bg-transparent border-none outline-none font-mono caret-transparent"
                            style={getUserInputStyle()}
                            disabled={isProcessing}
                            aria-label="Terminal input"
                            autoComplete="off"
                            spellCheck="false"
                        />
                        {isFocused && (
                            <span 
                                ref={cursorRef}
                                className="absolute h-5 w-2 bg-white opacity-70 animate-cursor-blink" 
                                style={{ 
                                    top: '2px',
                                    boxShadow: '0 0 5px rgba(255, 255, 255, 0.7)'
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrimaryTerminal;
