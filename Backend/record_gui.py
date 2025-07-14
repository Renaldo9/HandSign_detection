import tkinter as tk
from tkinter import messagebox
import cv2
import numpy as np
import mediapipe as mp
import threading
import os
from datetime import datetime
from PIL import Image, ImageTk
import time
import tensorflow as tf
import pickle

FEATURE_SIZE = 126
DEFAULT_SEQUENCE_LENGTH = 30
MODEL_PATH = "Backend/artifacts/best_gesture_model.h5"
ENCODER_PATH = "Backend/artifacts/label_encoder.pkl"

model = tf.keras.models.load_model(MODEL_PATH)
with open(ENCODER_PATH, 'rb') as f:
    label_encoder = pickle.load(f)

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

class RecorderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Hand Gesture Recorder")

        tk.Label(root, text="Gesture Name:").grid(row=0, column=0, padx=5, pady=5, sticky="e")
        self.entry = tk.Entry(root, width=20)
        self.entry.grid(row=0, column=1, padx=5, pady=5, sticky="w")
        self.start_btn = tk.Button(root, text="Start Recording", command=self.start_recording)
        self.start_btn.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(root, text="Sign Length:").grid(row=1, column=0, padx=5, pady=5, sticky="e")
        self.length_var = tk.IntVar(value=DEFAULT_SEQUENCE_LENGTH)
        self.length_slider = tk.Scale(root, from_=10, to=90, resolution=5, orient="horizontal", variable=self.length_var)
        self.length_slider.grid(row=1, column=1, columnspan=2, pady=5, sticky="w")

        self.video_label = tk.Label(root)
        self.video_label.grid(row=2, column=0, columnspan=3, padx=5, pady=5)

        self.status_label = tk.Label(root, text="Status: Idle", fg="blue")
        self.status_label.grid(row=3, column=0, columnspan=3, pady=2)

        self.counter_label = tk.Label(root, text="Samples Recorded: 0", fg="black")
        self.counter_label.grid(row=4, column=0, columnspan=3, pady=2)

        self.prediction_label = tk.Label(root, text="Prediction: None", fg="green", font=("Arial", 12, "bold"))
        self.prediction_label.grid(row=5, column=0, columnspan=3, pady=5)

        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            print("[ERROR] Failed to open webcam.")
            messagebox.showerror("Camera Error", "Webcam not accessible.")
            root.destroy()
            return

        self.sequence = []
        self.sequence_length = DEFAULT_SEQUENCE_LENGTH
        self.collecting = False
        self.gesture_name = ""
        self.hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)
        self.update_video()

    def start_recording(self):
        gesture_name = self.entry.get().strip().lower()
        if not gesture_name:
            messagebox.showerror("Input Error", "Please enter a gesture name.")
            return

        self.gesture_name = gesture_name
        os.makedirs(os.path.join("dataset", self.gesture_name), exist_ok=True)
        self.sequence_length = self.length_var.get()
        self.update_sample_counter()

        self.status_label.config(text="Get Ready...", fg="orange")
        self.root.update()
        threading.Thread(target=self.countdown_and_record).start()

    def countdown_and_record(self):
        for i in range(3, 0, -1):
            self.status_label.config(text=f"Recording in {i}...", fg="orange")
            time.sleep(1)
        self.status_label.config(text="Recording!", fg="green")
        self.sequence = []
        self.collecting = True

    def update_video(self):
        ret, frame = self.cap.read()
        if not ret:
            print("[ERROR] Failed to read frame from webcam.")
            self.status_label.config(text="Camera Error!", fg="red")
            self.root.after(1000, self.update_video)
            return

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)
        image = frame.copy()

        frame_features = []
        if results.multi_hand_landmarks:
            sorted_hands = sorted(results.multi_hand_landmarks, key=lambda hl: hl.landmark[0].x)
            for hl in sorted_hands[:2]:
                mp_drawing.draw_landmarks(image, hl, mp_hands.HAND_CONNECTIONS)
                for lm in hl.landmark:
                    frame_features.extend([lm.x, lm.y, lm.z])
        while len(frame_features) < FEATURE_SIZE:
            frame_features.extend([0.0, 0.0, 0.0])
        frame_features = frame_features[:FEATURE_SIZE]

        if self.collecting:
            self.sequence.append(frame_features)
            cv2.putText(image, f"Recording ({len(self.sequence)}/{self.sequence_length})", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            if len(self.sequence) == self.sequence_length:
                self.save_sequence()
                self.collecting = False

        img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        imgtk = ImageTk.PhotoImage(image=img)
        self.video_label.imgtk = imgtk
        self.video_label.config(image=imgtk)

        self.root.after(15, self.update_video)

    def update_sample_counter(self):
        gesture = self.entry.get().strip().lower()
        if not gesture:
            self.counter_label.config(text="Samples Recorded: 0")
            return
        folder = os.path.join("Backend","dataset", gesture)
        count = len([f for f in os.listdir(folder) if f.endswith(".npy")]) if os.path.exists(folder) else 0
        self.counter_label.config(text=f"Samples Recorded: {count}")

    def save_sequence(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.gesture_name}_{timestamp}.npy"
        filepath = os.path.join("Backend","dataset", self.gesture_name, filename)
        np.save(filepath, np.array(self.sequence))
        print(f"[SAVED] {filepath}")
        self.update_sample_counter()

        input_data = np.expand_dims(np.array(self.sequence), axis=0)
        preds = model.predict(input_data)[0]
        idx = np.argmax(preds)
        label = label_encoder.inverse_transform([idx])[0]
        confidence = preds[idx] * 100

        self.status_label.config(text="Recording Complete!", fg="blue")
        self.prediction_label.config(text=f"Prediction: {label} ({confidence:.1f}%)", fg="purple")

    def on_close(self):
        print("[INFO] Closing app...")
        self.cap.release()
        self.root.destroy()

if __name__ == "__main__":
    print("[INFO] Starting GUI...")
    root = tk.Tk()
    app = RecorderApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()
