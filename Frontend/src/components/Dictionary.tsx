import { useState, useRef, useEffect } from "react";
import { Search, Play, Camera, CameraOff, X, Square, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import signA from "@/assets/sign-a.jpg";

export const Dictionary = () => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedSign, setSelectedSign] = useState<any>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const signs = [
    { id: 1, word: "Hello", category: "Greetings", image: signA, difficulty: "Beginner" },
    { id: 2, word: "Thank You", category: "Greetings", image: signA, difficulty: "Beginner" },
    { id: 3, word: "Please", category: "Greetings", image: signA, difficulty: "Beginner" },
    { id: 4, word: "Family", category: "People", image: signA, difficulty: "Intermediate" },
    { id: 5, word: "Friend", category: "People", image: signA, difficulty: "Beginner" },
    { id: 6, word: "Water", category: "Food & Drink", image: signA, difficulty: "Beginner" },
    { id: 7, word: "Happy", category: "Emotions", image: signA, difficulty: "Beginner" },
    { id: 8, word: "Beautiful", category: "Descriptions", image: signA, difficulty: "Advanced" },
  ];

  const filteredSigns = signs.filter(sign =>
    sign.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sign.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(signs.map(sign => sign.category))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-success text-success-foreground";
      case "Intermediate": return "bg-warning text-warning-foreground";
      case "Advanced": return "bg-error text-error-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Camera functionality
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        const playPromise = videoRef.current.play?.();
        if (playPromise) playPromise.catch(() => {});
      } catch (_) {
        // no-op
      }
    }
  }, [cameraActive, practiceMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setPracticeMode(false);
    setIsProcessing(false);
  };

  const handleWatch = (sign: any) => {
    setSelectedSign(sign);
    setShowVideoModal(true);
  };

  const handlePractice = async (sign: any) => {
    setSelectedSign(sign);
    setPracticeMode(true);
    await startCamera();
  };

  const captureGesture = async () => {
    if (!videoRef.current || !selectedSign) return;
    
    setIsProcessing(true);

    // Create a canvas to capture the current frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Simulate gesture detection
      const isCorrect = await simulateGestureDetection(imageData, selectedSign.word);
      
      if (isCorrect) {
        toast({
          title: "Correct!",
          description: `Great job signing "${selectedSign.word}"!`,
        });
      } else {
        toast({
          title: "Try Again",
          description: `The gesture for "${selectedSign.word}" wasn't detected correctly.`,
          variant: "destructive"
        });
      }
    }
    
    setIsProcessing(false);
  };

  // Simulate gesture detection
  const simulateGestureDetection = async (imageData: string, targetWord: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.4; // 60% success rate for demo
  };

  return (
    <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gradient mb-2">
          Sign Dictionary
        </h1>
        <p className="text-muted-foreground">
          Explore and learn sign language gestures
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Search signs or categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-2xl h-12 border-2 focus:border-primary"
        />
      </div>

      {/* Categories Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={searchTerm === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setSearchTerm("")}
          className="rounded-full whitespace-nowrap"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={searchTerm === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchTerm(category)}
            className="rounded-full whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredSigns.length} signs found
      </div>

      {/* Signs Grid */}
      <div className="space-y-4">
        {filteredSigns.map((sign) => (
          <Card key={sign.id} className="p-4 border-none shadow-soft hover:shadow-medium transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={sign.image} 
                  alt={`Sign for ${sign.word}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg truncate">{sign.word}</h3>
                    <p className="text-sm text-muted-foreground">{sign.category}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(sign.difficulty)}`}>
                    {sign.difficulty}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-full flex items-center gap-1"
                    onClick={() => handleWatch(sign)}
                  >
                    <Play size={14} />
                    Watch
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="rounded-full text-primary"
                    onClick={() => handlePractice(sign)}
                  >
                    <Camera size={14} />
                    Practice
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSigns.length === 0 && (
        <Card className="p-8 text-center border-none shadow-soft">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-muted-foreground" size={32} />
          </div>
          <h3 className="text-lg font-semibold mb-2">No signs found</h3>
          <p className="text-muted-foreground text-sm">
            Try searching for a different word or browse categories
          </p>
        </Card>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedSign && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedSign.word}</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowVideoModal(false)}
                  className="rounded-full"
                >
                  <X size={20} />
                </Button>
              </div>
              
              <div className="aspect-video bg-black rounded-xl mb-4 flex items-center justify-center">
                <div className="text-white text-center">
                  <Play size={48} className="mx-auto mb-2" />
                  <p>Video demonstration would play here</p>
                  <p className="text-sm text-gray-400 mt-2">Demo placeholder - actual video content coming soon</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowVideoModal(false);
                    handlePractice(selectedSign);
                  }}
                >
                  <Camera className="mr-2" size={16} />
                  Practice This Sign
                </Button>
                <Button variant="outline" onClick={() => setShowVideoModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Practice Mode */}
      {practiceMode && selectedSign && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="relative h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Top Header Overlay */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-lg px-3 py-1 bg-white/90 text-black">
                    Practice Mode
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={stopCamera} className="text-white hover:bg-white/20">
                    <X size={16} className="mr-1" />
                    Exit
                  </Button>
                </div>
              </div>
            </div>

            {/* Corner Word Display */}
            <div className="absolute top-20 left-4 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm text-white p-6 rounded-xl text-left max-w-sm">
                <h2 className="text-3xl font-bold mb-2 text-gradient bg-gradient-to-r from-white to-gray-300 bg-clip-text">
                  {selectedSign.word}
                </h2>
                <p className="text-gray-300 text-sm mb-2">
                  {selectedSign.category}
                </p>
                <div className={`inline-block px-2 py-1 rounded-full text-xs ${getDifficultyColor(selectedSign.difficulty)}`}>
                  {selectedSign.difficulty}
                </div>
              </div>
            </div>

            {/* Bottom Capture Button */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <Button
                onClick={captureGesture}
                disabled={isProcessing}
                size="lg"
                className="w-full bg-white/90 text-black hover:bg-white font-semibold py-4 text-lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                    Analyzing Gesture...
                  </>
                ) : (
                  <>
                    <Square className="mr-2" size={20} />
                    Capture Gesture
                  </>
                )}
              </Button>
            </div>

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
                  <p className="text-xl">Analyzing your gesture...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};