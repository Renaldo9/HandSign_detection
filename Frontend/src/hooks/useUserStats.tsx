import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStats {
  current_streak: number;
  total_days: number;
  total_signs_learned: number;
  best_accuracy: number;
  total_achievements: number;
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_stats', {
        target_user_id: user.id
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLearningSession = async (signsLearned: number, timeSpent: number, accuracy: number) => {
    if (!user) return;

    try {
      // Get today's date in user's timezone
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('learning_sessions')
        .upsert({
          user_id: user.id,
          session_date: today,
          signs_learned: signsLearned,
          time_spent_minutes: timeSpent,
          accuracy_percentage: accuracy,
        }, {
          onConflict: 'user_id,session_date'
        });

      if (error) throw error;
      
      // Refresh stats after updating session to get updated streak
      await fetchStats();
      await checkForNewAchievements();
    } catch (error) {
      console.error('Error updating learning session:', error);
    }
  };

  const checkForNewAchievements = async () => {
    if (!user || !stats) return;

    try {
      // Get all achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*');

      if (achievementsError) throw achievementsError;

      // Get user's current achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      const earnedAchievementIds = userAchievements.map(ua => ua.achievement_id);
      
      // Check each achievement
      for (const achievement of achievements) {
        if (earnedAchievementIds.includes(achievement.id)) continue;

        let earned = false;
        
        switch (achievement.requirement_type) {
          case 'streak':
            earned = stats.current_streak >= achievement.requirement_value;
            break;
          case 'total_days':
            earned = stats.total_days >= achievement.requirement_value;
            break;
          case 'signs_learned':
            earned = stats.total_signs_learned >= achievement.requirement_value;
            break;
          case 'accuracy':
            earned = stats.best_accuracy >= achievement.requirement_value;
            break;
        }

        if (earned) {
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id,
            });
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  return {
    stats,
    loading,
    updateLearningSession,
    refreshStats: fetchStats,
  };
}