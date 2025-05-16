'use client';

import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaProvider } from '@/components/providers/SolanaProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PrivyProviders from './PrivyProvider';
import { MagicBlockEngineProvider } from '@/engine/MagicBlockEngineProvider';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/stores/store';
import { useState, useEffect } from 'react';
import { AnchorWalletProvider } from './AnchorWalletProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers(props: PropsWithChildren<object>) {
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Base providers that don't need client-side checks
    const baseProviders = (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <ThemeProvider>
                    {props.children}
                </ThemeProvider>
            </Provider>
        </QueryClientProvider>
    );

    // Client-side only providers
    if (!isClient) {
        return baseProviders;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <ThemeProvider>
                        <PrivyProviders>
                            <SolanaProvider>
                                <AnchorWalletProvider>
                                    <MagicBlockEngineProvider>
                                        {props.children}
                                    </MagicBlockEngineProvider>
                                </AnchorWalletProvider>
                            </SolanaProvider>
                        </PrivyProviders>
                    </ThemeProvider>
                </PersistGate>
            </Provider>
        </QueryClientProvider>
    );
}
