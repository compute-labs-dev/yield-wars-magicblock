/**
 * Formats a number as a currency string with 2 decimal places
 * @param value - The number to format
 * @returns A string with the formatted currency value
 */
export function formatCurrency(value: number): string {
    // Handle undefined, null, or NaN
    if (!value || isNaN(value)) {
        return '0.00';
    }

    // Format with 2 decimal places and thousands separator
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
} 