import { useState } from "react";
import { Check, X, RotateCcw, Volume2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import signA from "@/assets/sign-a.jpg";
import signThankYou from "@/assets/sign-thank-you.jpg";
import signPlease from "@/assets/sign-please.jpg";
import signSorry from "@/assets/sign-sorry.jpg";

export const LearningScreen = () => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [signsLearned, setSignsLearned] = useState(0);

  const questions = [
    {
      word: "Hello",
      correctAnswer: "A",
      options: [
        { id: "A", label: "Hello", image: signA },
        { id: "B", label: "Thank You", image: signThankYou },
        { id: "C", label: "Please", image: signPlease },
        { id: "D", label: "Sorry", image: signSorry },
      ]
    },
    {
      word: "Thank You",
      correctAnswer: "B",
      options: [
        { id: "A", label: "Hello", image: signA },
        { id: "B", label: "Thank You", image: signThankYou },
        { id: "C", label: "Please", image: signPlease },
        { id: "D", label: "Sorry", image: signSorry },
      ]
    },
    {
      word: "Please",
      correctAnswer: "C",
      options: [
        { id: "A", label: "Hello", image: signA },
        { id: "B", label: "Thank You", image: signThankYou },
        { id: "C", label: "Please", image: signPlease },
        { id: "D", label: "Sorry", image: signSorry },
      ]
    },
    {
      word: "Sorry",
      correctAnswer: "D",
      options: [
        { id: "A", label: "Hello", image: signA },
        { id: "B", label: "Thank You", image: signThankYou },
        { id: "C", label: "Please", image: signPlease },
        { id: "D", label: "Sorry", image: signSorry },
      ]
    }
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const shuffleOptions = (options: any[]) => {
    return [...options].sort(() => Math.random() - 0.5);
  };

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswer(answerId);
    const correct = answerId === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) {
      setScore(score + 10);
    }
    setSignsLearned(signsLearned + 1);
  };

  const handleContinue = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      // Shuffle options for next question
      questions[currentQuestionIndex + 1].options = shuffleOptions(questions[currentQuestionIndex + 1].options);
    } else {
      // Lesson complete - could navigate back or show completion screen
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizStarted(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSignsLearned(0);
    // Shuffle options for first question
    questions.forEach(question => {
      question.options = shuffleOptions(question.options);
    });
  };

  if (!quizStarted) {
    return (
      <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
        
        <Card className="p-8 text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
            <Volume2 size={48} className="text-primary" />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Ready to Learn?</h3>
            <p className="text-muted-foreground">
              Test your knowledge of sign language gestures. 
              Each correct answer helps you learn new signs!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="font-semibold text-primary">Total Questions</div>
              <div className="text-2xl font-bold">{questions.length}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="font-semibold text-primary">Signs to Learn</div>
              <div className="text-2xl font-bold">{questions.length}</div>
            </div>
          </div>

          <Button onClick={startQuiz} size="lg" className="w-full">
            <Play size={20} className="mr-2" />
            Start Quiz
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
      
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setQuizStarted(false)}>
            <X size={20} />
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="bg-accent/20 px-3 py-1 rounded-full">
              <span className="text-sm font-bold text-accent-foreground">Signs: {signsLearned}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setQuizStarted(false)}>
            <RotateCcw size={20} />
          </Button>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Question Section */}
      <Card className="p-8 text-center border-none shadow-soft">
        <div className="mb-6">
          <h2 className="text-sm text-muted-foreground mb-2">Show the sign for:</h2>
          <h1 className="text-4xl font-bold text-gradient mb-4">{currentQuestion.word}</h1>
          <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary/80">
            <Volume2 size={20} className="mr-2" />
            Listen
          </Button>
        </div>
        
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6">
          <p className="text-muted-foreground text-sm">
            Choose the correct sign gesture below
          </p>
        </div>
      </Card>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-4">
        {currentQuestion.options.map((option) => (
          <Card
            key={option.id}
            className={`
              p-4 cursor-pointer transition-all duration-300 border-2
              ${selectedAnswer === option.id 
                ? showResult 
                  ? isCorrect 
                    ? "border-success bg-success/10 shadow-medium" 
                    : "border-error bg-error/10 shadow-medium"
                  : "border-primary bg-primary/10 shadow-medium scale-105"
                : "border-border hover:border-primary/50 hover:shadow-soft"
              }
            `}
            onClick={() => !showResult && handleAnswerSelect(option.id)}
          >
            <div className="aspect-square mb-3 rounded-xl overflow-hidden bg-muted">
              <img 
                src={option.image} 
                alt={option.label}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-center font-medium text-sm">{option.label}</p>
            
            {selectedAnswer === option.id && showResult && (
              <div className="flex justify-center mt-2">
                {isCorrect ? (
                  <div className="bg-success rounded-full p-1">
                    <Check className="text-success-foreground" size={16} />
                  </div>
                ) : (
                  <div className="bg-error rounded-full p-1">
                    <X className="text-error-foreground" size={16} />
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Result Feedback */}
      {showResult && (
        <Card className={`
          p-6 text-center border-none shadow-medium
          ${isCorrect ? "bg-gradient-to-br from-success/10 to-primary/10" : "bg-gradient-to-br from-error/10 to-warning/10"}
        `}>
          <div className="mb-4">
            {isCorrect ? (
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-success-foreground" size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-error rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="text-error-foreground" size={32} />
              </div>
            )}
            <h3 className="text-xl font-bold mb-2">
              {isCorrect ? "Excellent!" : "Not quite right"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isCorrect 
                ? "You're getting the hang of this!" 
                : "The correct answer was Sign A. Keep practicing!"
              }
            </p>
          </div>
          
          <Button 
            onClick={handleContinue}
            className={`
              w-full rounded-2xl py-3 font-semibold
              ${isCorrect ? "btn-primary" : "btn-secondary"}
            `}
          >
            Continue
          </Button>
        </Card>
      )}
    </div>
  );
};