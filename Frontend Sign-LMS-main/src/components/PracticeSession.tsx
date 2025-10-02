import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// MediaPipe + helpers
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera as MpCamera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils/drawing_utils.js';

const SEQ_LEN = 30;
const SEND_THROTTLE_MS = 900;
const BACKEND_URL = "http://127.0.0.1:5000/predict";
const CONFIDENCE_THRESHOLD = 50; // Hardcoded threshold (matching detection.py default)

export const DetectionSession = () => {
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const predictionRef = useRef<HTMLDivElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [lastSpokenLabel, setLastSpokenLabel] = useState<string | null>(null);

  // Buffer + send control
  let seqBuffer: number[][] = [];
  let lastSent = 0;
  let sending = false;

  // TTS function using Web Speech API
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to prioritize new predictions
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // Set language to English (adjust if needed)
      utterance.volume = 1; // Full volume
      utterance.rate = 0.8; // Slightly slower for clarity
      utterance.pitch = 1; // Default pitch
      speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-Speech not supported in this browser.');
      toast({ title: "TTS Warning", description: "Your browser does not support text-to-speech.", variant: "destructive" });
    }
  };

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

        // Only display and speak if confidence meets threshold
        if (conf >= CONFIDENCE_THRESHOLD) {
          if (predictionRef.current) {
            predictionRef.current.innerHTML = `Prediction: <strong>${label}</strong> (${conf.toFixed(1)}%)`;
          }
          // Speak only if it's a new label (to avoid repetition)
          if (label !== lastSpokenLabel) {
            speak(label);
            setLastSpokenLabel(label);
          }
        } else {
          // Optionally clear or show low confidence
          if (predictionRef.current) {
            predictionRef.current.innerHTML = `Low Confidence: ${conf.toFixed(1)}% (threshold: ${CONFIDENCE_THRESHOLD}%)`;
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        lastSent = Date.now();
        sending = false;
      }
    }

  }, [cameraActive, lastSpokenLabel]); // Re-run effect if lastSpokenLabel changes (though unlikely needed)

  const startCamera = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraActive(true);
      setLastSpokenLabel(null); // Reset spoken label on start
      toast({ title: "Camera Activated", description: "You should see your camera feed now. Perform a sign to hear it spoken." });
    } catch (error) {
      toast({ title: "Camera Error", description: "Unable to access camera.", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    setLastSpokenLabel(null);
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  if (!cameraActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
              Hand Sign Detection
            </h1>
            <p className="text-muted-foreground text-lg">Detect sign language gestures in real-time with spoken feedback</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto pt-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Detection Active
          </h1>
          <p className="text-muted-foreground">Perform a sign language gesture to see and hear the prediction.</p>
        </div>
        <Card className="p-6">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
          </div>
          <div ref={statusRef} className="text-sm text-gray-400 mb-2">Status: idle</div>
          <div ref={predictionRef} className="text-sm text-gray-200 mb-4 font-semibold">Prediction: ...</div>
          <Button variant="outline" onClick={stopCamera} size="lg">
            <CameraOff className="mr-2" size={20} /> Stop Camera
          </Button>
        </Card>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Threshold: {CONFIDENCE_THRESHOLD}% | Last Spoken: {lastSpokenLabel || 'None'}</p>
        </div>
      </div>
    </div>
  );
};