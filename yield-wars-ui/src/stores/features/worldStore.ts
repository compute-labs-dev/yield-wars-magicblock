import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { CurrencyType, EntityType } from '@/lib/constants/programEnums';

// Define interface for GPU entity details
export interface GpuEntityDetails {
  entityPda: string;
  ownershipPda: string;
  productionPda: string;
  upgradeablePda: string;
  stakeablePda: string;
  type?: string; // Optional type descriptor (e.g., "Entry GPU", "Standard GPU", "Premium GPU")
}

interface WorldState {
  worldPda: string | null;
  currencyEntities: {
    [key in CurrencyType]?: {
      entityPda: string;
      pricePda: string;
    };
  };
  gpuEntities: GpuEntityDetails[];
  isInitialized: boolean;
  lastInitializedAt: number | null;
}

const initialState: WorldState = {
  worldPda: null,
  currencyEntities: {},
  gpuEntities: [],
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
    setGpuEntities: (state, action: PayloadAction<GpuEntityDetails[]>) => {
      state.gpuEntities = action.payload;
    },
    addGpuEntity: (state, action: PayloadAction<GpuEntityDetails>) => {
      state.gpuEntities.push(action.payload);
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
  setGpuEntities,
  addGpuEntity,
  setInitialized,
  resetWorld
} = worldSlice.actions;

// Export selectors
export const selectWorldState = (state: RootState) => state.world;
export const selectWorldPda = (state: RootState) => state.world.worldPda;
export const selectCurrencyEntities = (state: RootState) => state.world.currencyEntities;
export const selectCurrencyEntity = (state: RootState, currencyType: CurrencyType) => 
  state.world.currencyEntities[currencyType];
export const selectGpuEntities = (state: RootState) => state.world.gpuEntities;
export const selectIsWorldInitialized = (state: RootState) => state.world.isInitialized;

export default worldSlice.reducer; 