'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CurrencyType } from '@/lib/constants/programEnums';

// Define types
export type PriceComponentPdas = {
  [key in CurrencyType]: string;
};

// Helper type for currency type keys
export type CurrencyTypeKey = keyof PriceComponentPdas;

interface EntityInfo {
  entityPda: string;
  walletComponentPda: string;
  ownershipComponentPda: string;
  priceComponentPdas: PriceComponentPdas;
  createdAt: string;
}

interface UserEntityState {
  entities: {
    [walletAddress: string]: EntityInfo;
  };
  currentEntity: string | null;
}

// Initial state
const initialState: UserEntityState = {
  entities: {},
  currentEntity: null,
};

// Create the user entity slice
export const userEntitySlice = createSlice({
  name: 'userEntity',
  initialState,
  reducers: {
    setUserEntity: (
      state,
      action: PayloadAction<{
        walletAddress: string;
        entityPda: string;
        walletComponentPda: string;
        ownershipComponentPda: string;
        priceComponentPdas: PriceComponentPdas;
      }>
    ) => {
      const { walletAddress, entityPda, walletComponentPda, ownershipComponentPda, priceComponentPdas } = action.payload;
      state.entities[walletAddress] = {
        entityPda,
        walletComponentPda,
        ownershipComponentPda,
        priceComponentPdas,
        createdAt: new Date().toISOString(),
      };
    },
    setCurrentEntity: (state, action: PayloadAction<string | null>) => {
      state.currentEntity = action.payload;
    },
  },
});

// Export actions
export const { setUserEntity, setCurrentEntity } = userEntitySlice.actions;

// Export selectors
export const selectUserEntity = (state: { userEntity: UserEntityState }, walletAddress: string) => 
  state.userEntity.entities[walletAddress] || null;

export const selectCurrentEntity = (state: { userEntity: UserEntityState }) => 
  state.userEntity.currentEntity;

export const selectUserPriceComponentPdas = (state: { userEntity: UserEntityState }, walletAddress: string) => 
  state.userEntity.entities[walletAddress]?.priceComponentPdas || null;

export const selectUserPriceComponentPda = (state: { userEntity: UserEntityState }, walletAddress: string, currencyType: CurrencyType) => 
  state.userEntity.entities[walletAddress]?.priceComponentPdas[currencyType] || null;

export const selectUserOwnershipComponentPda = (state: { userEntity: UserEntityState }, walletAddress: string) => 
  state.userEntity.entities[walletAddress]?.ownershipComponentPda || null;

// Export reducer
export default userEntitySlice.reducer; 