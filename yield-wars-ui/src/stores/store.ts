import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './features/uiSlice';
import userEntityReducer from './features/userEntityStore';
import worldReducer from './features/worldStore';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { combineReducers } from 'redux';

// Configure persist options for user entities
const userEntityPersistConfig = {
  key: 'userEntity',
  storage,
  whitelist: ['entities'], // Only persist the entities
};

// Create root reducer with persistence
const rootReducer = combineReducers({
  ui: uiReducer,
  userEntity: persistReducer(userEntityPersistConfig, userEntityReducer),
  world: worldReducer,
});

// Create the store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these redux-persist action types
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create the persistor
export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {ui: UiState, userEntity: UserEntityState, world: WorldState, ...}
export type AppDispatch = typeof store.dispatch; 