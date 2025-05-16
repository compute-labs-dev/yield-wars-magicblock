'use client';

import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PrivyProviders from './PrivyProvider';
import { MagicBlockEngineProvider } from '@/engine/MagicBlockEngineProvider';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/stores/store';
import { useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ProgramProvider } from './ProgramProvider';

const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Initialize wallet adapters
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

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
                        <ConnectionProvider endpoint={DEFAULT_ENDPOINT}>
                            <WalletProvider wallets={wallets} autoConnect>
                                    <PrivyProviders>
                                        <MagicBlockEngineProvider>
                                            {props.children}
                                        </MagicBlockEngineProvider>
                                    </PrivyProviders>
                            </WalletProvider>
                        </ConnectionProvider>
                    </ThemeProvider>
                </PersistGate>
            </Provider>
        </QueryClientProvider>
    );
}
