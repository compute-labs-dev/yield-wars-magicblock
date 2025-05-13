'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types
interface EntityInfo {
  entityPda: string;
  walletComponentPda: string;
  usdcPriceComponentPda: string;
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
        usdcPriceComponentPda: string;
      }>
    ) => {
      const { walletAddress, entityPda, walletComponentPda, usdcPriceComponentPda } = action.payload;
      state.entities[walletAddress] = {
        entityPda,
        walletComponentPda,
        usdcPriceComponentPda,
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