/**
 * Utilities for formatting values for display
 */

/**
 * Format a wallet address to show the beginning and end only
 * @param address The full wallet address string
 * @param startChars Number of characters to show at the beginning
 * @param endChars Number of characters to show at the end
 * @returns Formatted address string with ellipsis in the middle
 */
export function formatAddress(address: string, startChars = 4, endChars = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
} 