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

const queryClient = new QueryClient();

export function Providers(props: PropsWithChildren<object>) {
    // Only enable the PersistGate on the client to avoid hydration issues
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    return (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                {isClient ? (
                    <PersistGate loading={null} persistor={persistor}>
                        <SolanaProvider>
                            <MagicBlockEngineProvider>
                                <ThemeProvider>
                                    <PrivyProviders>
                                        {props.children}
                                    </PrivyProviders>
                                </ThemeProvider>
                            </MagicBlockEngineProvider>
                        </SolanaProvider>
                    </PersistGate>
                ) : (
                    <SolanaProvider>
                        <MagicBlockEngineProvider>
                            <ThemeProvider>
                                <PrivyProviders>
                                    {props.children}
                                </PrivyProviders>
                            </ThemeProvider>
                        </MagicBlockEngineProvider>
                    </SolanaProvider>
                )}
            </Provider>
        </QueryClientProvider>
    );
}
