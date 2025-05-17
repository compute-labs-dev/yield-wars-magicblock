import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { SoarProgram, GameClient } from '@magicblock-labs/soar-sdk';
import { Keypair, PublicKey, SendTransactionError } from '@solana/web3.js';
import { toast } from 'sonner';
import { setupAnchorProvider } from '@/lib/utils/anchorUtils';
import BN from 'bn.js';

// Import config file
import soarConfig from '@/config/soar-config.json';

export interface LeaderboardEntry {
  rank: number;
  score: number;
  wallet: string;
  displayName?: string;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: number;
  points: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface TopScoreEntry {
  player: PublicKey;
  entry: {
    score: BN;
    timestamp: BN;
  };
}

export interface SoarConfig {
  soarProgramId: string;
  gameAddress: string;
  leaderboardAddress: string;
  topEntriesAddress: string;
}

export function useSoar() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [soarProgram, setSoarProgram] = useState<SoarProgram | null>(null);
  const [gameClient, setGameClient] = useState<GameClient | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = soarConfig as SoarConfig;

  // Initialize the SOAR program and game client
  useEffect(() => {
    if (!connection || !publicKey) return;
    
    console.log('Using SOAR config:', config);
    
    try {
      // Initialize SOAR program
      console.log('Initializing SOAR program with ID:', config.soarProgramId);
      
      // Setup provider with current wallet connection
      const providerSetup = setupAnchorProvider(connection, "4qj2Bz3xu3fzea33FDok4Bn5YwKMoRaM9wJPhXT8MsRHKcfmmM2ode6Ci5ekdf1KaBF639b68PufD9xpdH9LxVB9");
      
      if (!providerSetup || !providerSetup.provider) {
        throw new Error('Failed to setup Anchor provider');
      }
      
      const provider = providerSetup.provider;
      console.log('Provider setup complete');
      
      // Get SOAR program using the SDK
      const program = SoarProgram.get(provider, new PublicKey(config.soarProgramId));
      setSoarProgram(program);
      
      // Validate Game Address
      let gamePublicKey: PublicKey;
      try {
        gamePublicKey = new PublicKey(config.gameAddress);
        console.log('Game address valid:', config.gameAddress);
      } catch (err) {
        console.error('Invalid Game address:', config.gameAddress, err);
        setError('Invalid Game address');
        return;
      }
      
      // Create game client using the SDK
      program.newGameClient(gamePublicKey)
        .then((client) => {
          console.log('Game client created');
          setGameClient(client);
          console.log('SOAR Game client initialized');
        })
        .catch((err: Error) => {
          console.error('Failed to initialize SOAR game client:', err);
          setError('Failed to initialize game client');
        });
    } catch (err) {
      console.error('Error initializing SOAR:', err);
      setError('Failed to initialize SOAR');
    }
  }, [connection, publicKey, config]);
  
  // Fetch leaderboard entries
  const fetchLeaderboard = useCallback(async (limit = 40) => {
    if (!soarProgram || !connection) {
      return [];
    }
    
    setIsLoading(true);
    setError(null);

    // Generate random entries, sort by score, then assign ranks
    return Array.from({ length: 100 }, () => ({
      score: Math.floor(Math.random() * 234_553),
      wallet: new Keypair().publicKey.toBase58(),
      timestamp: 1715833200
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    return [
      {
        rank: 1,
        score: 245_399_200,
        wallet: new Keypair().publicKey.toBase58(),
        timestamp: 1715833200
      },
      {
        rank: 2,
        score: 124_399_200,
        wallet: new Keypair().publicKey.toBase58(),
        timestamp: 1715833200
      },
      {
        rank: 3,
        score: 124_399_200,
        wallet: new Keypair().publicKey.toBase58(),
        timestamp: 1715833200
      }
    ];
    
    try {
      // Validate top entries address
      let topEntriesPubkey: PublicKey;
      try {
        topEntriesPubkey = new PublicKey(config.topEntriesAddress);
      } catch (err) {
        console.error('Invalid Top Entries address:', config.topEntriesAddress, err);
        setError('Invalid Top Entries address');
        return [];
      }
      
      // Fetch top entries using the SDK
      try {
        const topEntriesAccount = await soarProgram.fetchLeaderBoardTopEntriesAccount(topEntriesPubkey);
        
        if (topEntriesAccount && topEntriesAccount.topScores) {
          console.log(`Found ${topEntriesAccount.topScores.length} entries`);
          
          // Convert to our LeaderboardEntry format
          const entries: LeaderboardEntry[] = topEntriesAccount.topScores
            .filter((score: TopScoreEntry) => score && score.player)
            .map((score: TopScoreEntry, index: number) => {
              // Format the score - if USDC balance, divide by 1_000_000 for display
              let entryScore = 0;
              let timestamp = 0;
              
              try {
                if (score.entry && score.entry.score) {
                  entryScore = score.entry.score.toNumber() / 1_000_000;
                }
                
                if (score.entry && score.entry.timestamp) {
                  timestamp = score.entry.timestamp.toNumber();
                }
              } catch (err) {
                console.error("Error extracting score data:", err);
              }
              
              return {
                rank: index + 1,
                score: entryScore,
                wallet: score.player.toBase58(),
                timestamp: timestamp,
              };
            })
            .slice(0, limit);
          
          console.log(`Processed entries: ${entries.length}`);
          setLeaderboardEntries(entries);
          return entries;
        }
      } catch (err) {
        console.error('Error fetching top entries:', err);
        setError('Failed to fetch leaderboard entries');
      }
      
      return [];
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to fetch leaderboard');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, connection, config.topEntriesAddress]);
  
  // Get player rank and score
  const getPlayerInfo = useCallback(async () => {
    if (!soarProgram || !publicKey || !connection) {
      return null;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Derive player PDA using the SDK
      const [playerPda] = soarProgram.utils.derivePlayerAddress(publicKey);
      
      // Try to fetch player account
      try {
        const player = await soarProgram.fetchPlayerAccount(playerPda);
        
        if (!player) {
          console.log('Player not registered yet');
          return null;
        }
        
        // Derive player scores PDA using the SDK
        const leaderboardPubkey = new PublicKey(config.leaderboardAddress);
        const [playerScoresPda] = soarProgram.utils.derivePlayerScoresListAddress(playerPda, leaderboardPubkey);
        
        // Try to fetch player scores
        try {
          // Attempt to fetch player scores list
          const playerScoresList = await soarProgram.fetchPlayerScoresListAccount(playerScoresPda);
          
          if (playerScoresList && playerScoresList.scores && playerScoresList.scores.length > 0) {
            const score = playerScoresList.scores[0].score.toNumber();
            setPlayerScore(score);
            
            // Try to get rank from top entries
            try {
              const topEntriesPubkey = new PublicKey(config.topEntriesAddress);
              const topEntries = await soarProgram.fetchLeaderBoardTopEntriesAccount(topEntriesPubkey);
              
              if (topEntries && topEntries.topScores) {
                const playerIndex = topEntries.topScores.findIndex(
                  (entry: TopScoreEntry) => entry.player.toBase58() === publicKey.toBase58()
                );
                
                if (playerIndex !== -1) {
                  const rank = playerIndex + 1;
                  setPlayerRank(rank);
                  return { rank, score };
                }
              }
            } catch {
              console.log('Error fetching player rank from top entries');
            }
          }
        } catch {
          console.log('Error fetching player scores, may not be registered with leaderboard yet');
        }
      } catch {
        console.log('Error fetching player account, may not be initialized yet');
      }
      
      return null;
    } catch (err) {
      console.error('Error getting player info:', err);
      setError('Failed to fetch player information');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, publicKey, connection, config.leaderboardAddress, config.topEntriesAddress]);
  
  // Initialize player in SOAR
  const initializePlayer = useCallback(async () => {
    if (!connection || !publicKey || !signTransaction || !soarProgram) {
      toast.error('Wallet not connected');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate a username from wallet
      const username = `YieldWars_${publicKey.toString().slice(0, 6)}`;
      
      // Use the player's public key as the NFT metadata
      const userNftMeta = publicKey;
      
      // Initialize the player using the SDK's method
      const playerInit = await soarProgram.initializePlayerAccount(
        publicKey,
        username,
        userNftMeta
      );
      
      console.log("Player initialization transaction created, signing...");
      
      // Sign and send the transaction
      const recentBlockhash = await connection.getLatestBlockhash();
      const tx = playerInit.transaction;
      tx.feePayer = publicKey;
      tx.recentBlockhash = recentBlockhash.blockhash;
      
      const signedTx = await signTransaction(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction({
        signature: txid,
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
      });
      
      toast.success('Successfully initialized player');
      return true;
    } catch (err: unknown) {
      // Check if player already exists (to handle this gracefully)
      if (err instanceof Error && err.message && err.message.includes('already in use')) {
        console.log('Player already initialized');
        toast.info('Player already initialized');
        return true;
      }

      if (err instanceof SendTransactionError) {
        const logs = await err.getLogs(connection);
        console.log('Transaction logs:', logs);
      }
      
      console.error('Error initializing player:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to initialize player: ' + errorMessage);
      toast.error('Failed to initialize player');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, publicKey, signTransaction, connection]);
  
  // Register player with leaderboard
  const registerWithLeaderboard = useCallback(async () => {
    if (!connection || !publicKey || !signTransaction || !soarProgram || !gameClient) {
      toast.error('Wallet or SOAR not connected');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure player is initialized first
      const [playerPda] = soarProgram.utils.derivePlayerAddress(publicKey);
      
      let playerExists = false;
      try {
        const player = await soarProgram.fetchPlayerAccount(playerPda);
        playerExists = !!player;
      } catch {
        // Ignore error
        playerExists = false;
      }
      
      if (!playerExists) {
        const initialized = await initializePlayer();
        if (!initialized) return false;
      }
      
      // Register player using the game client's method
      const leaderboardPubkey = new PublicKey(config.leaderboardAddress);
      
      // Register the player for the leaderboard
      const registerPlayerTx = await gameClient.registerPlayer(
        publicKey,
        leaderboardPubkey
      );
      
      console.log("Player registration transaction created, signing...");
      
      // Sign and send the transaction
      const recentBlockhash = await connection.getLatestBlockhash();
      const tx = registerPlayerTx.transaction;
      tx.feePayer = publicKey;
      tx.recentBlockhash = recentBlockhash.blockhash;
      
      const signedTx = await signTransaction(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction({
        signature: txid,
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
      });
      
      toast.success('Successfully registered with leaderboard');
      return true;
    } catch (err: unknown) {
      // Check if player already registered (to handle this gracefully)
      if (err instanceof Error && err.message && (
          err.message.includes('already in use') || 
          err.message.includes('already exists')
      )) {
        console.log('Player already registered with leaderboard');
        toast.info('Already registered with leaderboard');
        return true;
      }
      
      console.error('Error registering with leaderboard:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to register with leaderboard: ' + errorMessage);
      toast.error('Failed to register with leaderboard');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, gameClient, publicKey, signTransaction, connection, initializePlayer, config.leaderboardAddress]);
  
  // Submit score to leaderboard
  const submitScore = useCallback(async (score: number) => {
    if (!connection || !publicKey || !signTransaction || !soarProgram) {
      toast.error('Wallet not connected');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure player is registered with leaderboard
      const [playerPda] = soarProgram.utils.derivePlayerAddress(publicKey);
      
      // Get the leaderboard address
      const leaderboardPubkey = new PublicKey(config.leaderboardAddress);
      
      // Find the player scores PDA
      const [playerScoresPda] = soarProgram.utils.derivePlayerScoresListAddress(playerPda, leaderboardPubkey);
      
      // Check if player is registered with the leaderboard
      let playerScoresExist = false;
      try {
        const playerScores = await soarProgram.fetchPlayerScoresListAccount(playerScoresPda);
        playerScoresExist = !!playerScores;
      } catch {
        // Ignore error
        playerScoresExist = false;
      }
      
      if (!playerScoresExist) {
        const registered = await registerWithLeaderboard();
        if (!registered) return false;
      }
      
      // Convert score to BN as required by the SDK
      // If the leaderboard is for USDC, we need to multiply by 1,000,000 (6 decimals)
      const scoreInMicroUnits = score * 1_000_000;
      const scoreBn = new BN(scoreInMicroUnits);
      
      console.log(`Submitting score: ${score} (${scoreInMicroUnits} micro units)`);
      
      // Submit score using SDK method
      const submitScoreTx = await soarProgram.submitScoreToLeaderBoard(
        publicKey,  // user
        publicKey,  // authority (user is authorized to submit their own score)
        leaderboardPubkey,
        scoreBn
      );
      
      console.log("Score submission transaction created, signing...");
      
      // Sign and send the transaction
      const recentBlockhash = await connection.getLatestBlockhash();
      const tx = submitScoreTx.transaction;
      tx.feePayer = publicKey;
      tx.recentBlockhash = recentBlockhash.blockhash;
      
      const signedTx = await signTransaction(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction({
        signature: txid,
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
      });
      
      // Update player info after submitting score
      await getPlayerInfo();
      
      toast.success('Successfully submitted score to leaderboard');
      return true;
    } catch (err: unknown) {
      console.error('Error submitting score:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Failed to submit score: ' + errorMessage);
      toast.error('Failed to submit score');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, publicKey, signTransaction, connection, registerWithLeaderboard, getPlayerInfo, config.leaderboardAddress]);
  
  // Load player state on mount and when wallet changes
  useEffect(() => {
    if (publicKey && soarProgram && connection) {
      getPlayerInfo();
    }
  }, [publicKey, soarProgram, connection, getPlayerInfo]);
  
  return {
    soarProgram,
    gameClient,
    leaderboardEntries,
    playerRank,
    playerScore,
    isLoading,
    error,
    fetchLeaderboard,
    getPlayerInfo,
    initializePlayer,
    registerWithLeaderboard,
    submitScore
  };
} 