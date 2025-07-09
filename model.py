import os
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
import pickle

# Parameters
DATA_DIR = "dataset"
SEQUENCE_LENGTH = 30
FEATURE_DIM = 126
EXPECTED_SHAPE = (SEQUENCE_LENGTH, FEATURE_DIM)
TEST_SIZE = 0.15
VAL_SIZE = 0.15
BATCH_SIZE = 16
EPOCHS = 50
RANDOM_STATE = 42

# Load Dataset
labels = []
sequences = []

for gesture in os.listdir(DATA_DIR):
    gesture_dir = os.path.join(DATA_DIR, gesture)
    if not os.path.isdir(gesture_dir):
        continue

    file_list = [f for f in os.listdir(gesture_dir) if f.endswith('.npy')]
    if len(file_list) < 2:
        print(f"[WARNING] Skipping '{gesture}' (only {len(file_list)} sample)")
        continue

    for fname in file_list:
        path = os.path.join(gesture_dir, fname)
        try:
            seq = np.load(path)

            # Skip invalid shapes
            if seq.shape[1] != FEATURE_DIM:
                print(f"[SKIP] {path} shape invalid: {seq.shape}")
                continue

            # Pad or trim to SEQUENCE_LENGTH
            if seq.shape[0] > SEQUENCE_LENGTH:
                seq = seq[:SEQUENCE_LENGTH]
            elif seq.shape[0] < SEQUENCE_LENGTH:
                pad_width = SEQUENCE_LENGTH - seq.shape[0]
                seq = np.vstack([seq, np.zeros((pad_width, FEATURE_DIM))])

            sequences.append(seq)
            labels.append(gesture)

        except Exception as e:
            print(f"[ERROR] Failed to load {path}: {e}")
            continue

# Convert to Arrays
X = np.array(sequences)
y = np.array(labels)

if len(X) < 4 or len(np.unique(y)) < 2:
    raise ValueError("❌ Not enough valid data. Please record at least 2 samples for at least 2 gestures.")

print(f"[INFO] Loaded {len(X)} samples from {len(np.unique(y))} gesture classes.")

# Encode Labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)
y_cat = to_categorical(y_encoded)

# Safe Train/Test Split
stratify_opt = y_encoded if len(X) >= 10 and len(np.unique(y)) >= 3 else None

if stratify_opt is None:
    print("[INFO] Small dataset — using random (non-stratified) split.")

X_train_val, X_test, y_train_val, y_test = train_test_split(
    X, y_cat, test_size=TEST_SIZE, stratify=stratify_opt, random_state=RANDOM_STATE
)

X_train, X_val, y_train, y_val = train_test_split(
    X_train_val, y_train_val,
    test_size=VAL_SIZE / (1 - TEST_SIZE),
    stratify=y_train_val if stratify_opt is not None else None,
    random_state=RANDOM_STATE
)

print(f"[INFO] Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

# Build Model
model = Sequential([
    Bidirectional(LSTM(64, return_sequences=True), input_shape=(SEQUENCE_LENGTH, FEATURE_DIM)),
    Dropout(0.5),
    Bidirectional(LSTM(64)),
    Dropout(0.5),
    Dense(64, activation='relu'),
    Dropout(0.5),
    Dense(y_cat.shape[1], activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
model.summary()

# Callbacks and Save Paths
os.makedirs("artifacts", exist_ok=True)
checkpoint_path = 'artifacts/best_gesture_model.h5'
early_stop = EarlyStopping(monitor='val_loss', patience=8, restore_best_weights=True)
checkpoint = ModelCheckpoint(filepath=checkpoint_path, monitor='val_loss', save_best_only=True)

# Train
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[early_stop, checkpoint],
    verbose=1
)

# Evaluate
print("\n[INFO] Evaluating on test set:")
test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
print(f"✅ Test Accuracy: {test_acc:.4f}")

y_pred = model.predict(X_test)
y_pred_labels = le.inverse_transform(np.argmax(y_pred, axis=1))
y_true_labels = le.inverse_transform(np.argmax(y_test, axis=1))

print("\n📊 Classification Report:")
print(classification_report(y_true_labels, y_pred_labels))
print("🧾 Confusion Matrix:")
print(confusion_matrix(y_true_labels, y_pred_labels))

# Save Model and Encoder
with open('artifacts/label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

model.save('artifacts/best_gesture_model.h5')
print("✅ Model and label encoder saved to /artifacts")
