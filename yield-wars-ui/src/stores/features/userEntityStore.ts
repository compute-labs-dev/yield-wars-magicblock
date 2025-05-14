'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CurrencyType } from '@/lib/constants/programEnums';

// Define types
export interface PriceComponentPdas {
  [CurrencyType.USDC]: string;
  [CurrencyType.BTC]: string;
  [CurrencyType.ETH]: string;
  [CurrencyType.SOL]: string;
  [CurrencyType.AIFI]: string;
}

interface EntityInfo {
  entityPda: string;
  walletComponentPda: string;
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
        priceComponentPdas: PriceComponentPdas;
      }>
    ) => {
      const { walletAddress, entityPda, walletComponentPda, priceComponentPdas } = action.payload;
      state.entities[walletAddress] = {
        entityPda,
        walletComponentPda,
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

// Export reducer
export default userEntitySlice.reducer; 