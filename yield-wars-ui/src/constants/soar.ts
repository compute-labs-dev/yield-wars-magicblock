// Constants for SOAR program 
// export const SOAR_PROGRAM_ID = "SOAREG9W6uoZrjiv6Ui4KsWHrLvUoxQ8Ku1Zoijtk4D" // Mainnet
export const SOAR_PROGRAM_ID = "SoarNNzwQHMwcfdkdLc6kvbkoMSxcHy89gTHrjhJYkk" // Devnet

// SOAR Game and Leaderboard addresses
// These should be created once and then used for all interactions
export const GAME_ADDRESS = "4mXenhrhJ3ShRUgYP5qNfTcpsWGNDvNScEBS6Fuq9AGU"
export const LEADERBOARD_ADDRESS = "8huPFWRtuCJ2ByDnaLKp5pY9mdoe3DCgTQistq4uYAXT"
export const TOP_ENTRIES_ADDRESS = "G8HGX9GtApe5T2AJmEqeh6mFUeLaPpqtB4RbCAzvmgPQ"

// Seeds from the SOAR program for PDAs
export const PLAYER_SEED = "player"
export const PLAYER_SCORES_SEED = "player-scores"

// Game information
export const GAME_NAME = "Yield Wars"
export const GAME_DESCRIPTION = "A DeFi trading simulator on Solana with leaderboards and rewards"
export const GAME_GENRE = 5 // Strategy

// Achievement constants
export const ACHIEVEMENT_CATEGORIES = {
  BEGINNER: 0,
  TRADING: 1, 
  WEALTH: 2,
  COMMUNITY: 3
}

// Define some example achievements
export const ACHIEVEMENTS = [
  {
    id: "first_login",
    title: "First Login",
    description: "Log in to Yield Wars for the first time",
    category: ACHIEVEMENT_CATEGORIES.BEGINNER,
    points: 10
  },
  {
    id: "first_trade",
    title: "First Trade",
    description: "Complete your first trade",
    category: ACHIEVEMENT_CATEGORIES.TRADING,
    points: 20
  },
  {
    id: "millionaire",
    title: "Millionaire",
    description: "Accumulate 1,000,000 USDC in total wealth",
    category: ACHIEVEMENT_CATEGORIES.WEALTH,
    points: 100
  }
] 