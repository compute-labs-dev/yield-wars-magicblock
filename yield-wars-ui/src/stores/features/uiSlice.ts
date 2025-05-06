import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const DEFAULT_TERMINAL_HEIGHT = '20vh';

interface UiState {
  isWorldFlat: boolean;
  isInitialLoad: boolean;
  isTerminalVisible: boolean;
  terminalHeight: string;
  wasClosedByUser: boolean;
  isResourcesVisible: boolean;
  isLeaderboardVisible: boolean;
  isLoginVisible: boolean;
  isProfileContainerVisible: boolean;
}

const initialState: UiState = {
  isWorldFlat: false,
  isInitialLoad: true,
  isTerminalVisible: true,
  terminalHeight: DEFAULT_TERMINAL_HEIGHT,
  wasClosedByUser: false,
  isResourcesVisible: false,
  isLeaderboardVisible: false, 
  isLoginVisible: false,
  isProfileContainerVisible: false, 
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Globe state
    toggleWorldFlat: (state) => {
      state.isWorldFlat = !state.isWorldFlat;
    },
    setWorldFlat: (state, action: PayloadAction<boolean>) => {
      state.isWorldFlat = action.payload;
    },
    setInitialLoad: (state, action: PayloadAction<boolean>) => {
      state.isInitialLoad = action.payload;
    },
    // Terminal state
    setTerminalVisible: (state, action: PayloadAction<boolean>) => {
      state.isTerminalVisible = action.payload;
      // If setting to invisible, mark as closed by user
      if (!action.payload) {
        state.wasClosedByUser = true;
      }
    },
    setTerminalHeight: (state, action: PayloadAction<string>) => {
      state.terminalHeight = action.payload;
    },
    setWasClosedByUser: (state, action: PayloadAction<boolean>) => {
        state.wasClosedByUser = action.payload;
    },
    // Convenience action to close terminal
    closeTerminal: (state) => {
      state.isTerminalVisible = false;
      state.wasClosedByUser = true;
    },
    // Convenience action to expand terminal
    expandTerminal: (state) => {
      state.terminalHeight = '70vh';
    },
    // Side Panel State
    toggleResourcesVisible: (state) => {
        state.isResourcesVisible = !state.isResourcesVisible;
    },
    toggleLeaderboardVisible: (state) => {
        state.isLeaderboardVisible = !state.isLeaderboardVisible;
    },
    // Login Modal state
    toggleLoginVisible: (state) => {
        state.isLoginVisible = !state.isLoginVisible;
    },
    // Profile Container state
    toggleProfileContainerVisible: (state) => {
      state.isProfileContainerVisible = !state.isProfileContainerVisible;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  toggleWorldFlat,
  setWorldFlat,
  setInitialLoad,
  setTerminalVisible,
  setTerminalHeight,
  setWasClosedByUser,
  closeTerminal,
  expandTerminal,
  toggleResourcesVisible,
  toggleLeaderboardVisible,
  toggleLoginVisible,
  toggleProfileContainerVisible
} = uiSlice.actions;

export default uiSlice.reducer; 