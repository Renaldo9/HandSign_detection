import { useEffect, useState } from 'react';
import { useUserStats } from '@/hooks/useUserStats';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, Target, Clock } from 'lucide-react';

export function LearningTracker() {
  const { updateLearningSession } = useUserStats();
  const { toast } = useToast();
  const [isLearning, setIsLearning] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [signsLearned, setSignsLearned] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  const startLearningSession = () => {
    setIsLearning(true);
    setSessionStart(new Date());
    setSignsLearned(0);
    setAccuracy(0);
    
    toast({
      title: "Learning session started!",
      description: "Practice some signs to track your progress.",
    });
  };

  const endLearningSession = async () => {
    if (!sessionStart) return;
    
    const timeSpent = Math.round((new Date().getTime() - sessionStart.getTime()) / (1000 * 60));
    
    await updateLearningSession(signsLearned, timeSpent, accuracy);
    
    setIsLearning(false);
    setSessionStart(null);
    
    toast({
      title: "Session completed!",
      description: `You learned ${signsLearned} signs in ${timeSpent} minutes with ${accuracy}% accuracy.`,
    });
  };

  const addSignLearned = () => {
    setSignsLearned(prev => prev + 1);
    // Simulate accuracy improvement
    setAccuracy(prev => Math.min(100, prev + Math.random() * 10));
  };

  return (
    <Card className="border-none shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="text-primary" size={24} />
          Learning Session
        </CardTitle>
        <CardDescription>
          {isLearning ? "Session in progress" : "Start a new learning session"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isLearning ? (
          <Button onClick={startLearningSession} className="w-full" size="lg">
            <PlayCircle className="mr-2" size={20} />
            Start Learning Session
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{signsLearned}</div>
                <div className="text-sm text-muted-foreground">Signs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{Math.round(accuracy)}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {sessionStart ? Math.round((new Date().getTime() - sessionStart.getTime()) / (1000 * 60)) : 0}
                </div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addSignLearned} variant="outline" className="flex-1">
                <CheckCircle className="mr-2" size={16} />
                Mark Sign Learned
              </Button>
              <Button onClick={endLearningSession} className="flex-1">
                <Clock className="mr-2" size={16} />
                End Session
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}