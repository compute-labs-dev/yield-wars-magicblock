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
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';

const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";

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
        // Set ANCHOR_WALLET in localStorage if it doesn't exist
        if (typeof window !== 'undefined' && !localStorage.getItem('ANCHOR_WALLET')) {
            const wallet = Keypair.generate();
            localStorage.setItem('ANCHOR_WALLET', JSON.stringify(Array.from(wallet.secretKey)));
        }
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
                        <ConnectionProvider endpoint={DEFAULT_ENDPOINT}>
                            <PrivyProviders>
                                <SolanaProvider>
                                    <AnchorWalletProvider>
                                        <MagicBlockEngineProvider>
                                            {props.children}
                                        </MagicBlockEngineProvider>
                                    </AnchorWalletProvider>
                                </SolanaProvider>
                            </PrivyProviders>
                        </ConnectionProvider>
                    </ThemeProvider>
                </PersistGate>
            </Provider>
        </QueryClientProvider>
    );
}
