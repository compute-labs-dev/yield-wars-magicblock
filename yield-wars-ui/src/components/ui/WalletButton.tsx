'use client';

import React, { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { formatAddress } from '@/lib/formatters';

type WalletButtonProps = {
  className?: string;
};

export default function WalletButton({ className = '' }: WalletButtonProps) {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnectClick = useCallback(() => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  }, [connected, disconnect, setVisible]);

  return (
    <button
      className={`px-4 py-2 rounded-md bg-[#1a4d1a] hover:bg-[#143914] text-white transition-colors ${className}`}
      onClick={handleConnectClick}
    >
      {connected ? (
        <span>
          {formatAddress(publicKey?.toString() || '')} • Disconnect
        </span>
      ) : (
        'Connect Wallet'
      )}
    </button>
  );
} 