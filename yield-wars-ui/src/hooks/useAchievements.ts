import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSoar } from './useSoar';
import { ACHIEVEMENTS } from '@/constants/soar';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';
import { Achievement } from './useSoar';

export function useAchievements() {
  const { publicKey } = useWallet();
  const { soarProgram, gameClient, isLoading: soarLoading } = useSoar();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize achievements from the constant list
  useEffect(() => {
    // Start with all achievements locked
    const initialAchievements = ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      unlocked: false
    }));
    
    setAchievements(initialAchievements);
  }, []);

  // Fetch player achievements from SOAR
  const fetchAchievements = useCallback(async () => {
    if (!soarProgram || !gameClient || !publicKey) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all achievements for the game
      const allAchievements = await gameClient.getAllAchievements();
      
      if (!allAchievements || allAchievements.length === 0) {
        console.log('No achievements found for game');
        return;
      }
      
      // Get player achievements
      // This would normally fetch from SOAR, but for demo purposes we'll 
      // simulate with local data
      const playerAchievements = ACHIEVEMENTS.map(achievement => {
        // Here we'd check if player has unlocked this achievement
        // For demo, we'll randomly unlock some
        const unlocked = Math.random() > 0.5;
        const unlockedAt = unlocked ? Date.now() : undefined;
        
        return {
          ...achievement,
          unlocked,
          unlockedAt
        };
      });
      
      setAchievements(playerAchievements);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError('Failed to fetch achievements');
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, gameClient, publicKey]);
  
  // Unlock an achievement
  const unlockAchievement = useCallback(async (achievementId: string) => {
    if (!soarProgram || !gameClient || !publicKey) {
      toast.error('Wallet not connected');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Find the achievement
      const achievement = achievements.find(a => a.id === achievementId);
      
      if (!achievement) {
        throw new Error('Achievement not found');
      }
      
      if (achievement.unlocked) {
        console.log('Achievement already unlocked');
        return true;
      }
      
      // In a real implementation, we would use the SOAR SDK to grant the achievement
      // For now, we'll just update our local state
      console.log(`Unlocking achievement: ${achievement.title}`);
      
      // Update local state
      setAchievements(prevAchievements => 
        prevAchievements.map(a => 
          a.id === achievementId 
            ? { ...a, unlocked: true, unlockedAt: Date.now() } 
            : a
        )
      );
      
      toast.success(`Achievement unlocked: ${achievement.title}`);
      return true;
    } catch (err) {
      console.error('Error unlocking achievement:', err);
      setError('Failed to unlock achievement');
      toast.error('Failed to unlock achievement');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [soarProgram, gameClient, publicKey, achievements]);
  
  // Initialize achievements when component mounts
  useEffect(() => {
    if (publicKey && soarProgram && gameClient && !soarLoading) {
      fetchAchievements();
    }
  }, [publicKey, soarProgram, gameClient, soarLoading, fetchAchievements]);
  
  return {
    achievements,
    isLoading,
    error,
    fetchAchievements,
    unlockAchievement
  };
} 