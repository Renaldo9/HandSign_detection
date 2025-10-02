import { useState, useEffect } from "react";
import { Settings, Trophy, Calendar, Target, Award, BookOpen, Moon, Sun, ChevronRight, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { supabase } from "@/integrations/supabase/client";

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

export const Profile = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme } = useTheme();
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

  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map(name => name.charAt(0)).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const displayStats = [
    { label: "Current Streak", value: `${stats?.current_streak || 0} days`, icon: Calendar },
    { label: "Total Days", value: `${stats?.total_days || 0}`, icon: Trophy },
    { label: "Total Sessions", value: `${stats?.total_days || 0}`, icon: BookOpen },
    { label: "Signs Learned", value: `${stats?.total_signs_learned || 0}`, icon: Target },
  ];

  return (
    <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="p-6 text-center border-none shadow-soft">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-medium">
          <span className="text-3xl text-white font-bold">{userInitials}</span>
        </div>
        <h2 className="text-2xl font-bold mb-1">{userName}</h2>
        <p className="text-muted-foreground mb-4">@{profile?.username || 'learner'}</p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Next Milestone</span>
            <span>{stats?.total_signs_learned || 0} / 50 Signs</span>
          </div>
          <Progress value={((stats?.total_signs_learned || 0) / 50) * 100} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {50 - (stats?.total_signs_learned || 0)} signs to unlock new achievement
          </p>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-4 text-center border-none shadow-soft">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Icon className="text-primary" size={20} />
              </div>
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Achievements Section */}
      <Card className="p-6 border-none shadow-soft">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="text-accent" size={20} />
          Achievements
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {achievements.length > 0 ? achievements.slice(0, 6).map((achievement) => (
            <div
              key={achievement.id}
              className="text-center p-3 rounded-xl transition-all duration-300 bg-gradient-to-br from-accent/20 to-warning/20 shadow-soft"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-xl bg-gradient-to-br from-accent to-warning shadow-soft">
                {achievement.icon}
              </div>
              <div className="text-xs font-medium truncate">{achievement.name}</div>
            </div>
          )) : (
            <div className="col-span-3 text-center py-4 text-muted-foreground">
              <Trophy size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No achievements yet. Start learning!</p>
            </div>
          )}
        </div>
        
        <Button variant="outline" className="w-full mt-4 rounded-2xl">
          View All Achievements
        </Button>
      </Card>

      {/* Learning Insights */}
      <Card className="p-6 border-none shadow-soft">
        <h3 className="text-lg font-semibold mb-4">Learning Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Best Accuracy</span>
            <span className="text-sm font-semibold text-success">{stats?.best_accuracy || 0}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Achievements</span>
            <span className="text-sm font-semibold">{stats?.total_achievements || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Learning Days</span>
            <span className="text-sm font-semibold">{stats?.total_days || 0} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Current Streak</span>
            <span className="text-sm font-semibold">{stats?.current_streak || 0} days</span>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card className="border-none shadow-soft">
        <Button 
          variant="ghost" 
          className="w-full justify-between rounded-2xl p-4 h-auto"
          onClick={() => setShowSettings(!showSettings)}
        >
          <div className="flex items-center">
            <Settings size={20} className="mr-3" />
            Settings & Preferences
          </div>
          {showSettings ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </Button>
        
        {showSettings && (
          <div className="px-4 pb-4 space-y-4">
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                  <span className="font-medium">Theme</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="rounded-full"
                  >
                    <Sun size={16} className="mr-1" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="rounded-full"
                  >
                    <Moon size={16} className="mr-1" />
                    Dark
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};