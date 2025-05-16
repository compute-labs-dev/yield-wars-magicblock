import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { CurrencyType } from '@/lib/constants/programEnums';
import { EnhancedGpuOwnership } from '@/hooks/useWalletGpus';

// Define interface for GPU entity details
export interface GpuEntityDetails {
    entityPda: string;
    ownershipPda: string;
    productionPda: string;
    upgradeablePda: string;
    stakeablePda: string;
    walletComponentPda: string;
    type: string;
}

// Define interface for currency entity details
export interface CurrencyEntityDetails {
    currencyType: CurrencyType;
    entityPda: string;
    pricePda: string;
}

// Define the state interface
interface WorldState {
    worldPda: string | null;
    gpuEntities: GpuEntityDetails[];
    currencyEntities: CurrencyEntityDetails[];
    isInitialized: boolean;
    lastInitializedAt: number | null;
    cachedGpus: EnhancedGpuOwnership[];
}

// Define initial state
const initialState: WorldState = {
    worldPda: null,
    gpuEntities: [],
    currencyEntities: [],
    isInitialized: false,
    lastInitializedAt: null,
    cachedGpus: [],
};

// Create the slice
const worldSlice = createSlice({
    name: 'world',
    initialState,
    reducers: {
        setWorldPda: (state, action: PayloadAction<string>) => {
            state.worldPda = action.payload;
        },
        addGpuEntity: (state, action: PayloadAction<GpuEntityDetails>) => {
            state.gpuEntities.push(action.payload);
        },
        setGpuEntities: (state, action: PayloadAction<GpuEntityDetails[]>) => {
            state.gpuEntities = action.payload;
        },
        setCurrencyEntity: (state, action: PayloadAction<CurrencyEntityDetails>) => {
            state.currencyEntities.push(action.payload);
        },
        setInitialized: (state, action: PayloadAction<boolean>) => {
            state.isInitialized = action.payload;
            state.lastInitializedAt = Date.now();
        },
        resetWorld: () => {
            return initialState;
        },
        setCachedGpus: (state, action: PayloadAction<EnhancedGpuOwnership[]>) => {
            state.cachedGpus = action.payload;
        }
    }
});

// Export actions
export const {
    setWorldPda,
    addGpuEntity,
    setGpuEntities,
    setCurrencyEntity,
    setInitialized,
    resetWorld,
    setCachedGpus
} = worldSlice.actions;

// Export selectors
export const selectWorldPda = (state: RootState) => state.world.worldPda;
export const selectGpuEntities = (state: RootState) => state.world.gpuEntities;
export const selectIsWorldInitialized = (state: RootState) => state.world.isInitialized;
export const selectCachedGpus = (state: RootState) => state.world.cachedGpus;

export default worldSlice.reducer; 