
  // ---------- CONFIG ----------
  const SEQ_LEN = 30;                 // must match Python seq len
  const SEND_THROTTLE_MS = 900;       // minimum ms between POSTs
  const BACKEND_URL = "http://127.0.0.1:5000/predict"; // Flask endpoint

  // ---------- DOM ----------
  const canvasEl = document.getElementById("canvas");
  const statusEl = document.getElementById("status");
  const predictionEl = document.getElementById("prediction");
  const ctx = canvasEl.getContext("2d");

  // Hidden video element (needed for MediaPipe camera feed)
  const videoEl = document.createElement("video");
  videoEl.style.display = "none";
  document.body.appendChild(videoEl);

  // Sequence buffer (stores features for last SEQ_LEN frames)
  let seqBuffer = [];
  let lastSent = 0;
  let sending = false;

  // Keep track of the last spoken label (to avoid repeats)
  let lastSpoken = null;

  // ---------- Create MediaPipe Hands ----------
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onResults);

  // ---------- Webcam via MediaPipe Camera helper ----------
  const camera = new Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 640,
    height: 480
  });

  camera.start().then(() => statusEl.textContent = "Status: camera started");

  // ---------- Helper: build features from results ----------
  function buildFeaturesFromResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return null;
    }

    // Sort hands by flipped-x (to match cv2.flip from Python backend)
    const handsArr = results.multiHandLandmarks.map(h => h.slice());
    handsArr.sort((a, b) => {
      const ax = 1 - a[0].x;
      const bx = 1 - b[0].x;
      return ax - bx;
    });

    let features = [];
    for (let i = 0; i < Math.min(2, handsArr.length); i++) {
      const hand = handsArr[i];
      for (const lm of hand) {
        const x = 1 - lm.x; // mirror x to match Python preprocessing
        const y = lm.y;
        const z = lm.z;
        features.push(x, y, z);
      }
    }

    // Pad if only one hand detected
    if (handsArr.length === 1) {
      for (let i = 0; i < 21 * 3; i++) features.push(0.0);
    }

    return features.slice(0, 126); // ensure correct length
  }

  // ---------- onResults ----------
  function onResults(results) {
    // Resize canvas to match webcam
    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;

    // --- Draw mirrored video feed (mirror view like a webcam) ---
    ctx.save();
    ctx.translate(canvasEl.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
    ctx.restore();

    // --- Draw landmarks (also mirrored to align with flipped video) ---
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

    // --- Feature extraction ---
    const frameFeatures = buildFeaturesFromResults(results);
    if (!frameFeatures) {
      seqBuffer = [];
      statusEl.textContent = "Status: waiting for hands...";
      return;
    }

    statusEl.textContent = `Status: recording frames (${seqBuffer.length + 1}/${SEQ_LEN})`;
    seqBuffer.push(frameFeatures);
    if (seqBuffer.length > SEQ_LEN) seqBuffer.shift();

    // Once we have SEQ_LEN frames, send them to backend
    if (seqBuffer.length === SEQ_LEN) {
      maybeSendSequence(seqBuffer);
    }
  }

  // ---------- Web Speech API for TTS ----------
  function speakText(text) {
    if (!("speechSynthesis" in window)) {
      console.warn("TTS not supported in this browser");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";   // change language if needed
    utterance.rate = 1.0;       // speed (1 = normal)
    utterance.pitch = 1.0;      // pitch
    speechSynthesis.speak(utterance);
  }

  // ---------- Send sequence to backend ----------
  async function maybeSendSequence(sequence) {
    const now = Date.now();
    if (sending) return;
    if (now - lastSent < SEND_THROTTLE_MS) return;

    sending = true;
    try {
      const resp = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: sequence })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Server error:", resp.status, txt);
        predictionEl.innerHTML = `Prediction: <strong>Server error</strong>`;
        return;
      }

      const data = await resp.json();
      const label = data.label;
      const conf = data.confidence;

      // Update prediction text
      predictionEl.innerHTML = `Prediction: <strong>${label}</strong> (${conf.toFixed(1)}%)`;

      // Speak label if it's new (avoid repeating the same word endlessly)
      if (label && label !== lastSpoken) {
        speakText(label);
        lastSpoken = label;
      }

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      lastSent = Date.now();
      sending = false;
    }
  }