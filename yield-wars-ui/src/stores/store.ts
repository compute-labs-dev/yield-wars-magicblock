import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './features/uiSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    // Add other reducers here if needed
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {ui: UiState, ...}
export type AppDispatch = typeof store.dispatch; 