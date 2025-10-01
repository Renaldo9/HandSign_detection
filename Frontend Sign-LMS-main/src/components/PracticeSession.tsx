import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, CameraOff, Play, Square, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUserStats } from '@/hooks/useUserStats';

// MediaPipe + helpers
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera as MpCamera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils/drawing_utils.js';

const practiceWords = [
  { word: "Hello", instruction: "Wave your hand in greeting" },
  { word: "Thank You", instruction: "Touch your chin and move hand forward" },
  { word: "Please", instruction: "Place hand on chest and move in circular motion" },
  { word: "Sorry", instruction: "Make a fist and rub it on your chest in circular motion" },
  { word: "Water", instruction: "Make 'W' with three fingers and tap your chin" },
  { word: "Help", instruction: "Place one hand on the other and lift both up" },
  { word: "Yes", instruction: "Make a fist and nod it up and down" },
  { word: "No", instruction: "Extend index and middle finger and close them" }
];

const SEQ_LEN = 30;
const SEND_THROTTLE_MS = 900;
const BACKEND_URL = "http://127.0.0.1:5000/predict";

export const PracticeSession = () => {
  const { toast } = useToast();
  const { updateLearningSession } = useUserStats();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const predictionRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentWord = practiceWords[currentWordIndex];
  const totalWords = practiceWords.length;
  const progress = ((currentWordIndex) / totalWords) * 100;

  // Buffer + send control
  let seqBuffer: number[][] = [];
  let lastSent = 0;
  let sending = false;
  let lastSpoken: string | null = null;

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sessionStarted && timeLeft > 0 && !isProcessing) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && sessionStarted) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, sessionStarted, isProcessing]);

  // Initialize MediaPipe once
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    const camera = new MpCamera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current as HTMLVideoElement });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    function buildFeatures(results: any) {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return null;
      const handsArr = results.multiHandLandmarks.map((h: any) => h.slice());
      handsArr.sort((a: any, b: any) => (1 - a[0].x) - (1 - b[0].x));
      let features: number[] = [];
      for (let i = 0; i < Math.min(2, handsArr.length); i++) {
        for (const lm of handsArr[i]) {
          features.push(1 - lm.x, lm.y, lm.z);
        }
      }
      if (handsArr.length === 1) {
        for (let i = 0; i < 21 * 3; i++) features.push(0.0);
      }
      return features.slice(0, 126);
    }

    function onResults(results: any) {
      const canvasEl = canvasRef.current!;
      const ctx = canvasEl.getContext("2d")!;
      canvasEl.width = videoRef.current!.videoWidth;
      canvasEl.height = videoRef.current!.videoHeight;

      // Draw mirrored video
      ctx.save();
      ctx.translate(canvasEl.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
      ctx.restore();

      // Landmarks
      if (results.multiHandLandmarks) {
        ctx.save();
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { lineWidth: 2, color: '#00FF00' });
          drawLandmarks(ctx, landmarks, { lineWidth: 1, color: '#FF0000' });
        }
        ctx.restore();
      }

      const frameFeatures = buildFeatures(results);
      if (!frameFeatures) {
        seqBuffer = [];
        if (statusRef.current) statusRef.current.textContent = "Status: waiting for hands...";
        return;
      }

      seqBuffer.push(frameFeatures);
      if (seqBuffer.length > SEQ_LEN) seqBuffer.shift();
      if (statusRef.current) statusRef.current.textContent = `Status: ${seqBuffer.length}/${SEQ_LEN} frames`;

      if (seqBuffer.length === SEQ_LEN) {
        maybeSendSequence(seqBuffer);
      }
    }

    async function maybeSendSequence(sequence: number[][]) {
      const now = Date.now();
      if (sending || now - lastSent < SEND_THROTTLE_MS) return;
      sending = true;
      try {
        const resp = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ features: sequence }),
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const label = data.label;
        const conf = data.confidence;

        if (predictionRef.current) {
          predictionRef.current.innerHTML = `Prediction: <strong>${label}</strong> (${conf.toFixed(1)}%)`;
        }

        // Mark correct if matches current word
        if (label === currentWord.word && conf > 50) {
          setScore((prev) => prev + 1);
          toast({
            title: "Correct!",
            description: `Great job signing "${currentWord.word}"!`,
          });
          if (currentWordIndex < totalWords - 1) {
            setCurrentWordIndex((prev) => prev + 1);
            setTimeLeft(10);
          } else {
            endSession();
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        lastSent = Date.now();
        sending = false;
      }
    }

  }, [cameraActive, sessionStarted]); // re-init when session starts

  const startCamera = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraActive(true);
      toast({ title: "Camera Activated", description: "You should see your camera feed now." });
    } catch (error) {
      toast({ title: "Camera Error", description: "Unable to access camera.", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    setSessionStarted(false);
    setIsRecording(false);
  };

  const startSession = () => {
    if (!cameraActive) {
      toast({ title: "Camera Required", description: "Please activate your camera first", variant: "destructive" });
      return;
    }
    setSessionStarted(true);
    setTimeLeft(10);
    setCurrentWordIndex(0);
    setScore(0);
  };

  const handleTimeUp = () => {
    toast({ title: "Time's Up!", description: "Moving to the next word.", variant: "destructive" });
    if (currentWordIndex < totalWords - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setTimeLeft(10);
    } else {
      endSession();
    }
  };

  const endSession = async () => {
    setSessionStarted(false);
    const accuracy = Math.round((score / totalWords) * 100);
    await updateLearningSession(score, 15, accuracy);
    toast({ title: "Session Complete!", description: `Final Score: ${score}/${totalWords} (${accuracy}% accuracy)` });
  };

  const resetSession = () => {
    setCurrentWordIndex(0);
    setScore(0);
    setTimeLeft(10);
    setSessionStarted(false);
    setIsProcessing(false);
  };

  // ============ UI RENDER ============

  if (!cameraActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
              Practice Session
            </h1>
            <p className="text-muted-foreground text-lg">Test your sign language skills with live gesture detection</p>
          </div>
          <Card className="p-8 text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
              <Camera size={48} className="text-primary" />
            </div>
            <Button onClick={startCamera} size="lg" className="w-full">
              <Camera className="mr-2" size={20} /> Activate Camera
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (cameraActive && !sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-4xl mx-auto pt-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Camera Ready
            </h1>
          </div>
          <Card className="p-6">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            </div>
            <div ref={statusRef} className="text-sm text-gray-400 mb-2">Status: idle</div>
            <div ref={predictionRef} className="text-sm text-gray-200">Prediction: ...</div>
            <Button onClick={startSession} size="lg" className="px-8">
              <Play className="mr-2" size={20} /> Start Practice Session
            </Button>
            <Button variant="outline" onClick={stopCamera} size="lg">
              <CameraOff className="mr-2" size={20} /> Stop Camera
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="relative h-full">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        {/* overlays unchanged ... */}
      </div>
    </div>
  );
};
