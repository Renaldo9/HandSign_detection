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

# -----------------------
# Parameters
# -----------------------
DATA_DIR = "dataset"       # Root folder containing gesture subfolders
SEQUENCE_LENGTH = 30        # Number of frames per sequence
FEATURE_DIM = 126           # 2 hands * 21 landmarks * 3 coords
TEST_SIZE = 0.15            # Fraction for test
VAL_SIZE = 0.15             # Fraction for validation (of remaining)
RANDOM_STATE = 42
BATCH_SIZE = 16
EPOCHS = 50

# -----------------------
# 1. Load Dataset
# -----------------------
labels = []
sequences = []

for gesture in os.listdir(DATA_DIR):
    gesture_dir = os.path.join(DATA_DIR, gesture)
    if not os.path.isdir(gesture_dir):
        continue
    for fname in os.listdir(gesture_dir):
        if not fname.endswith('.npy'):
            continue
        path = os.path.join(gesture_dir, fname)
        seq = np.load(path)
        # Ensure fixed length
        if seq.shape[0] != SEQUENCE_LENGTH:
            # Pad or truncate
            if seq.shape[0] > SEQUENCE_LENGTH:
                seq = seq[:SEQUENCE_LENGTH]
            else:
                pad_width = SEQUENCE_LENGTH - seq.shape[0]
                seq = np.vstack([seq, np.zeros((pad_width, FEATURE_DIM))])
        sequences.append(seq)
        labels.append(gesture)

X = np.array(sequences)
y = np.array(labels)
print(f"Loaded {len(X)} samples from {len(np.unique(y))} classes.")

# -----------------------
# 2. Encode Labels
# -----------------------
le = LabelEncoder()
y_encoded = le.fit_transform(y)
y_cat = to_categorical(y_encoded)

# -----------------------
# 3. Split Data
# -----------------------
X_train_val, X_test, y_train_val, y_test = train_test_split(
    X, y_cat, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_cat)

X_train, X_val, y_train, y_val = train_test_split(
    X_train_val, y_train_val,
    test_size=VAL_SIZE/(1 - TEST_SIZE),
    random_state=RANDOM_STATE,
    stratify=y_train_val
)

print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

# -----------------------
# 4. Build Model
# -----------------------
model = Sequential([
    Bidirectional(LSTM(64, return_sequences=True), input_shape=(SEQUENCE_LENGTH, FEATURE_DIM)),
    Dropout(0.5),
    Bidirectional(LSTM(64)),
    Dropout(0.5),
    Dense(64, activation='relu'),
    Dropout(0.5),
    Dense(y_cat.shape[1], activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
model.summary()

# -----------------------
# 5. Callbacks
# -----------------------
checkpoint_path = 'artifacts/best_gesture_model.h5'
early_stop = EarlyStopping(
    monitor='val_loss', patience=8, restore_best_weights=True)
checkpoint = ModelCheckpoint(
    filepath=checkpoint_path, monitor='val_loss', save_best_only=True)

# -----------------------
# 6. Train
# -----------------------
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=[early_stop, checkpoint]
)

# -----------------------
# 7. Evaluate
# -----------------------
print("\nEvaluating on test set:")
test_loss, test_acc = model.evaluate(X_test, y_test)
print(f"Test Accuracy: {test_acc:.4f}")

# Predict and classification report
y_pred = model.predict(X_test)
y_pred_labels = le.inverse_transform(np.argmax(y_pred, axis=1))
y_true_labels = le.inverse_transform(np.argmax(y_test, axis=1))

print("\nClassification Report:")
print(classification_report(y_true_labels, y_pred_labels))

# Confusion matrix
cm = confusion_matrix(y_true_labels, y_pred_labels)
print("Confusion Matrix:")
print(cm)

# Save label encoder
import pickle
with open('artifacts/label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

print("Model, weights, and label encoder saved.")
