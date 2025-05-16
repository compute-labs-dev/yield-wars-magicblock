import { useState } from 'react';
import { ExchangeCurrencyParams } from '@/app/api/exchange/route';
import { toast } from 'sonner';

export const useExchangeCurrencyApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exchangeCurrencyAsync = async (params: ExchangeCurrencyParams): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange currency');
      }
      
      return data.signature;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    exchangeCurrencyAsync,
    isLoading,
    error,
  };
}; 