import cv2
import numpy as np
import mediapipe as mp
import os
import sys
from datetime import datetime

# If gesture name was passed via arguments, use it. Otherwise, prompt the user.
if len(sys.argv) > 1:
    GESTURE_NAME = sys.argv[1].strip().lower()
else:
    GESTURE_NAME = input("Enter the gesture name: ").strip().lower()

SEQUENCE_LENGTH = 30
SAVE_DIR = os.path.join("dataset", GESTURE_NAME)
os.makedirs(SAVE_DIR, exist_ok=True)

# Initialize MediaPipe for hand tracking
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Start video capture from default camera
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("[ERROR] Failed to open camera.")
    sys.exit(1)

sequence = []
collecting = False

print(f"[INFO] Recording gesture: {GESTURE_NAME}")
print("[INFO] Press 's' to start recording a sequence.")
print("[INFO] Press 'q' to quit.")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Failed to grab frame")
        break

    # Flip and convert color for MediaPipe
    frame = cv2.flip(frame, 1)
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    frame_features = []

    if results.multi_hand_landmarks:
        # Sort hands by x-coordinate of wrist to get consistant left-right order
        sorted_hands = sorted(
            results.multi_hand_landmarks,
            key=lambda hl: hl.landmark[0].x
        )

        # Extract up to 2 hands
        for hl in sorted_hands[:2]:
            mp_drawing.draw_landmarks(image, hl, mp_hands.HAND_CONNECTIONS)
            for lm in hl.landmark:
                frame_features.extend([lm.x, lm.y, lm.z])

    # Pad to ensure fixed size of 126 values (2 hands x 21 landmarks x 3 coords)
    while len(frame_features) < 126:
        frame_features.extend([0.0, 0.0, 0.0])

    # Id somehow we have extra (e.g., more than 2 hands), trim to 126
    frame_features = frame_features[:126]

    # Recording
    if collecting:
        sequence.append(frame_features)
        cv2.putText(image, f"Recording ({len(sequence)}/{SEQUENCE_LENGTH})", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        if len(sequence) == SEQUENCE_LENGTH:
            # Check for consistency
            if any(len(f) != 126 for f in sequence):
                print("[ERROR] Inconsistent frame feature lengths")
                sequence = []
                collecting = False
                continue
            
            # Save sequence
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{GESTURE_NAME}_{timestamp}.npy"
            filepath = os.path.join(SAVE_DIR, filename)
            np.save(filepath, np.array(sequence))
            print(f"[SAVED] {filepath}")
            sequence = []
            collecting = False

    # Display
    cv2.imshow("Gesture Recorder", image)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('s') and not collecting:
        print("[INFO] Starting recording...")
        collecting = True
        sequence = []
    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
