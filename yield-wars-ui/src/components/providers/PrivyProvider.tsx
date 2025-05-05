'use client';

import {PrivyProvider} from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export default function PrivyProviders({children}: {children: React.ReactNode}) {
    return (
        <PrivyProvider 
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
            config={{
                "appearance": {
                    "accentColor": "#6A6FF5",
                    "theme": "dark",
                    "showWalletLoginFirst": false,
                    "logo": "/logo.svg",
                    "walletChainType": "ethereum-and-solana",
                    "walletList": [
                        "detected_solana_wallets",
                        "detected_ethereum_wallets",
                        "coinbase_wallet",
                        "wallet_connect"
                    ]
                },
                "loginMethods": [
                    "wallet",
                    "email",
                    "twitter",
                    "discord",
                ],
                "fundingMethodConfig": {
                    "moonpay": {
                        "useSandbox": true
                    }
                },
                "embeddedWallets": {
                    "requireUserPasswordOnCreate": false,
                    "showWalletUIs": true,
                    "ethereum": {
                        "createOnLogin": "off"
                    },
                    "solana": {
                        "createOnLogin": "users-without-wallets"
                    }
                },
                "mfa": {
                    "noPromptOnMfaRequired": false
                },
                "externalWallets": {
                    solana: {connectors: toSolanaWalletConnectors()},
                    walletConnect: {enabled: true}
            }}}
        >
            {children}
        </PrivyProvider>
    );
}