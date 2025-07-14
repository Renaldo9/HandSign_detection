import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
import pickle
import threading
import tkinter as tk
from tkinter import ttk
from collections import deque
from PIL import Image, ImageTk
import pyttsx3

# -----------------------
# Load Model and Encoder
# -----------------------
MODEL_PATH = 'Backend/artifacts/best_gesture_model.h5'
LABEL_ENCODER_PATH = 'Backend/artifacts/label_encoder.pkl'

model = tf.keras.models.load_model(MODEL_PATH)
with open(LABEL_ENCODER_PATH, 'rb') as f:
    le = pickle.load(f)

# -----------------------
# Initialize MediaPipe
# -----------------------
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# -----------------------
# Application Class
# -----------------------
class HandSignApp:
    def __init__(self, root):
        self.root = root
        self.root.title('Hand Sign Detector')

        # Video frame display
        self.video_label = ttk.Label(root)
        self.video_label.grid(row=0, column=0, columnspan=3)

        # Sequence length control
        ttk.Label(root, text='Sequence Length').grid(row=1, column=0)
        self.seq_len_var = tk.IntVar(value=30)
        self.seq_slider = ttk.Scale(root, from_=10, to=60, orient='horizontal', variable=self.seq_len_var)
        self.seq_slider.grid(row=1, column=1)

        # Confidence threshold control
        ttk.Label(root, text='Confidence %').grid(row=2, column=0)
        self.thresh_var = tk.IntVar(value=50)
        self.thresh_slider = ttk.Scale(root, from_=0, to=100, orient='horizontal', variable=self.thresh_var)
        self.thresh_slider.grid(row=2, column=1)

        # Control buttons
        self.start_btn = ttk.Button(root, text='Start', command=self.start)
        self.start_btn.grid(row=3, column=0)
        self.pause_btn = ttk.Button(root, text='Pause', command=self.pause)
        self.pause_btn.grid(row=3, column=1)
        self.quit_btn = ttk.Button(root, text='Quit', command=self.quit)
        self.quit_btn.grid(row=3, column=2)

        # TTS engine
        self.tts_engine = pyttsx3.init()

        # State
        self.cap = cv2.VideoCapture(0)
        self.running = False
        self.seq_buffer = deque(maxlen=self.seq_len_var.get())
        self.update_job = None
        self.current_label = None
        self.display_text = ''

    def start(self):
        if not self.running:
            self.running = True
            self.seq_buffer = deque(maxlen=self.seq_len_var.get())
            self.current_label = None
            self.display_text = ''
            self.update_frame()

    def pause(self):
        self.running = False
        if self.update_job:
            self.root.after_cancel(self.update_job)

    def quit(self):
        self.pause()
        self.cap.release()
        self.root.destroy()

    def speak_label(self, label):
        def _speak():
            self.tts_engine.say(label)
            self.tts_engine.runAndWait()
        threading.Thread(target=_speak, daemon=True).start()

    def update_frame(self):
        ret, frame = self.cap.read()
        if ret and self.running:
            frame = cv2.flip(frame, 1)
            annotated = frame.copy()
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(image_rgb)

            # Reset buffer on no hands
            if not results.multi_hand_landmarks:
                self.seq_buffer.clear()
            else:
                features = []
                sorted_hands = sorted(
                    results.multi_hand_landmarks,
                    key=lambda hl: hl.landmark[0].x
                )
                for hl in sorted_hands:
                    mp_drawing.draw_landmarks(annotated, hl, mp_hands.HAND_CONNECTIONS)
                    for lm in hl.landmark:
                        features.extend([lm.x, lm.y, lm.z])
                if len(sorted_hands) == 1:
                    features.extend([0.0] * (21 * 3))

                self.seq_buffer.append(features)

                # Predict when buffer is full
                if len(self.seq_buffer) == self.seq_len_var.get():
                    input_data = np.expand_dims(np.array(self.seq_buffer), axis=0)
                    preds = model.predict(input_data)[0]
                    idx = np.argmax(preds)
                    label = le.inverse_transform([idx])[0]
                    conf = preds[idx] * 100
                    if conf >= self.thresh_var.get():
                        if label != self.current_label:
                            self.current_label = label
                            self.display_text = f"{label}: {conf:.1f}%"
                            self.speak_label(label)

            # Overlay persistent text if available
            if self.display_text:
                cv2.rectangle(annotated, (0, 0), (300, 40), (0, 0, 0), -1)
                cv2.putText(annotated, self.display_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                            1, (255, 255, 255), 2, cv2.LINE_AA)

            # Display
            img = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(img)
            imgtk = ImageTk.PhotoImage(image=img)
            self.video_label.imgtk = imgtk
            self.video_label.config(image=imgtk)

        if self.running:
            self.update_job = self.root.after(15, self.update_frame)

# -----------------------
# Run App
# -----------------------
if __name__ == '__main__':
    root = tk.Tk()
    app = HandSignApp(root)
    root.mainloop()