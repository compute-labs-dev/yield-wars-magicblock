import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { CurrencyType } from '@/lib/constants/programEnums';

interface WorldState {
  worldPda: string | null;
  currencyEntities: {
    [key in CurrencyType]?: {
      entityPda: string;
      pricePda: string;
    };
  };
  isInitialized: boolean;
  lastInitializedAt: number | null;
}

const initialState: WorldState = {
  worldPda: null,
  currencyEntities: {},
  isInitialized: false,
  lastInitializedAt: null,
};

export const worldSlice = createSlice({
  name: 'world',
  initialState,
  reducers: {
    setWorldPda: (state, action: PayloadAction<string>) => {
      state.worldPda = action.payload;
    },
    setCurrencyEntity: (state, action: PayloadAction<{
      currencyType: CurrencyType;
      entityPda: string;
      pricePda: string;
    }>) => {
      const { currencyType, entityPda, pricePda } = action.payload;
      state.currencyEntities[currencyType] = { entityPda, pricePda };
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
      if (action.payload) {
        state.lastInitializedAt = Date.now();
      }
    },
    resetWorld: () => {
      return initialState;
    }
  }
});

// Export actions
export const {
  setWorldPda,
  setCurrencyEntity,
  setInitialized,
  resetWorld
} = worldSlice.actions;

// Export selectors
export const selectWorldState = (state: RootState) => state.world;
export const selectWorldPda = (state: RootState) => state.world.worldPda;
export const selectCurrencyEntities = (state: RootState) => state.world.currencyEntities;
export const selectCurrencyEntity = (state: RootState, currencyType: CurrencyType) => 
  state.world.currencyEntities[currencyType];
export const selectIsWorldInitialized = (state: RootState) => state.world.isInitialized;

export default worldSlice.reducer; 