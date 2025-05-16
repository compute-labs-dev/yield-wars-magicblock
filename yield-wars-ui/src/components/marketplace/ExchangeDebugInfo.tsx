import React from 'react';
import { CurrencyType } from '@/lib/constants/programEnums';

interface ExchangeDebugInfoProps {
    worldPda?: string;
    userEntity?: {
        entityPda: string;
        walletComponentPda: string;
        ownershipComponentPda: string;
        priceComponentPdas: Record<CurrencyType, string>;
    } | null;
    priceComponentPdas?: Record<CurrencyType, string>;
}

export const ExchangeDebugInfo = ({ worldPda, userEntity, priceComponentPdas }: ExchangeDebugInfoProps) => {
    if (!worldPda || !userEntity) return null;

    return (
        <div className="mt-4 p-4 bg-[#1a1b1e] rounded-lg border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Debug Info</h3>
            <div className="space-y-1 text-xs text-gray-500">
                <p>World PDA: {worldPda}</p>
                <p>User Entity: {userEntity.entityPda}</p>
                {priceComponentPdas && Object.entries(priceComponentPdas).map(([currency, pda]) => (
                    <p key={currency}>
                        {CurrencyType[Number(currency)]} Price PDA: {pda}
                    </p>
                ))}
            </div>
        </div>
    );
}; 