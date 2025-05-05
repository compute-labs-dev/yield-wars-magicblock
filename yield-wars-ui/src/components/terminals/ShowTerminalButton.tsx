import React, { useState, useEffect } from 'react';

interface ShowTerminalButtonProps {
    onClick: () => void;
    appearDelay?: number;
    bypassDelay?: boolean;
}

const ShowTerminalButton: React.FC<ShowTerminalButtonProps> = ({ 
    onClick, 
    appearDelay = 1000,
    bypassDelay = false 
}) => {
    const [isVisible, setIsVisible] = useState(bypassDelay);

    useEffect(() => {
        if (bypassDelay) {
            setIsVisible(true);
            return;
        }

        const timer = setTimeout(() => setIsVisible(true), appearDelay);
        return () => clearTimeout(timer);
    }, [appearDelay, bypassDelay]);

    // Get the green glow style for text
    const getGlowStyle = (opacity: number = 0.8) => ({
        color: '#4AFF4A',
        textShadow: `0 0 4px rgba(74, 255, 74, ${opacity})`
    });

    if (!isVisible) return null;

    return (
        <button
            onClick={onClick}
            className="fixed bottom-12 right-4 px-4 py-2 bg-black bg-opacity-90 border border-[#4AFF4A]/20 rounded hover:bg-[#4AFF4A]/20 transition-colors z-[2000]"
            style={getGlowStyle()}
        >
            Show Terminal
        </button>
    );
};

export default ShowTerminalButton; 