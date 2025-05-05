'use client';

import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaProvider } from '@/components/providers/SolanaProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import PrivyProviders from './PrivyProvider';
const queryClient = new QueryClient();

export function Providers(props: PropsWithChildren<object>) {
    return (
        <QueryClientProvider client={queryClient}>
            <SolanaProvider>
                <ThemeProvider>
                    <PrivyProviders>
                        {props.children}
                    </PrivyProviders>
                </ThemeProvider>
            </SolanaProvider>
        </QueryClientProvider>
    );
}
