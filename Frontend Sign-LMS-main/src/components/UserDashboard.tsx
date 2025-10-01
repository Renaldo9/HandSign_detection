import { useEffect, useState } from 'react';
import { Calendar, Trophy, BookOpen, Target, Award, TrendingUp, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  earned_at?: string;
}

interface UserProfile {
  full_name: string;
  username: string;
}

export function UserDashboard() {
  const { user } = useAuth();
  const { stats, loading } = useUserStats();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAchievements();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAchievements = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select(`
          *,
          user_achievements!inner(earned_at)
        `)
        .eq('user_achievements.user_id', user.id);
      
      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const statCards = [
    {
      title: "Current Streak",
      value: `${stats?.current_streak || 0} days`,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/20"
    },
    {
      title: "Total Learning Days",
      value: `${stats?.total_days || 0} days`,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      title: "Signs Learned",
      value: `${stats?.total_signs_learned || 0}`,
      icon: Target,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/20"
    },
    {
      title: "Best Accuracy",
      value: `${stats?.best_accuracy || 0}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-none shadow-soft bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-medium">
            <span className="text-3xl text-white font-bold">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <CardTitle className="text-2xl">{profile?.full_name || 'Welcome!'}</CardTitle>
          <CardDescription className="text-lg">@{profile?.username || 'learner'}</CardDescription>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Next Milestone</span>
              <span>{stats?.total_signs_learned || 0} / 50 Signs</span>
            </div>
            <Progress value={((stats?.total_signs_learned || 0) / 50) * 100} className="h-3" />
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-none shadow-soft">
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.title}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Achievements */}
      <Card className="border-none shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="text-accent" size={24} />
            Recent Achievements
            <Badge variant="secondary" className="ml-auto">
              {stats?.total_achievements || 0} earned
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.slice(0, 6).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-accent/20 to-warning/20 shadow-soft"
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div>
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-sm text-muted-foreground">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy size={48} className="mx-auto mb-4 opacity-50" />
              <p>No achievements yet. Start learning to unlock your first achievement!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Insights */}
      <Card className="border-none shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="text-primary" size={24} />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{stats?.current_streak || 0}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">{stats?.best_accuracy || 0}%</div>
              <div className="text-sm text-muted-foreground">Best Accuracy</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}