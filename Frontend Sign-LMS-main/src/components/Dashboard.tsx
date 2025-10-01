import { Trophy, Flame, Target, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import heroBanner from "@/assets/hero-banner.jpg";
import achievementBadge from "@/assets/achievement-badge.jpg";

export const Dashboard = () => {
  return (
    <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
      {/* Hero Section */}
      <div className="learning-card relative overflow-hidden">
        <img 
          src={heroBanner} 
          alt="Sign Language Learning" 
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-gradient mb-2">
            Welcome Back!
          </h1>
          <p className="text-muted-foreground mb-4">
            Continue your sign language journey
          </p>
          <Button className="btn-primary rounded-2xl px-8 py-3 font-semibold">
            Continue Learning
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center border-none shadow-soft">
          <div className="streak-flame w-12 h-12 mx-auto mb-2 flex items-center justify-center">
            <Flame className="text-white" size={24} />
          </div>
          <div className="text-2xl font-bold text-foreground">7</div>
          <div className="text-xs text-muted-foreground">Day Streak</div>
        </Card>

        <Card className="p-4 text-center border-none shadow-soft">
          <div className="bg-gradient-to-br from-secondary to-blue-400 w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center shadow-soft">
            <Target className="text-white" size={24} />
          </div>
          <div className="text-2xl font-bold text-foreground">1,250</div>
          <div className="text-xs text-muted-foreground">Total Score</div>
        </Card>
      </div>

      {/* Progress Section */}
      <Card className="p-6 border-none shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Daily Goal</h3>
          <span className="text-sm text-muted-foreground">75% Complete</span>
        </div>
        <div className="space-y-2 mb-4">
          <Progress value={75} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>15/20 lessons</span>
            <span>5 lessons to go!</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
          <p className="text-sm text-center text-muted-foreground">
            🎯 Complete 5 more lessons to reach your daily goal!
          </p>
        </div>
      </Card>

      {/* Recent Achievements */}
      <Card className="p-6 border-none shadow-soft">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="text-accent" size={20} />
          Recent Achievements
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-success/10 to-primary/10 rounded-xl">
            <img 
              src={achievementBadge} 
              alt="Achievement" 
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="font-medium text-sm">First Week Complete!</div>
              <div className="text-xs text-muted-foreground">Completed 7 days of learning</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-accent/10 to-warning/10 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-warning rounded-full flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <div className="font-medium text-sm">Speed Learner</div>
              <div className="text-xs text-muted-foreground">Completed 5 lessons in a row</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};