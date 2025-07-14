import os
import numpy as np
import shutil
import matplotlib.pyplot as plt
from collections import defaultdict

# Configuration
DATASET_DIR = "dataset"
EXPECTED_FRAMES = 30
EXPECTED_FEATURES = 126
MOVE_CORRUPT_TO = os.path.join(DATASET_DIR, "_corrupted")
os.makedirs(MOVE_CORRUPT_TO, exist_ok=True)

# Helper Functions
def is_valid_sequence(arr):
    return arr.shape == (EXPECTED_FRAMES, EXPECTED_FEATURES)

def scan_dataset():
    stats = defaultdict(int)
    corrupt_files = []

    for gesture in os.listdir(DATASET_DIR):
        gesture_path = os.path.join(DATASET_DIR, gesture)
        if not os.path.isdir(gesture_path) or gesture == "_corrupted":
            continue

        for file in os.listdir(gesture_path):
            if not file.endswith(".npy"):
                continue

            full_path = os.path.join(gesture_path, file)
            try:
                data = np.load(full_path)
                if not is_valid_sequence(data):
                    print(f"[INVALID SHAPE] {file} → {data.shape}")
                    corrupt_files.append(full_path)
                else:
                    stats[gesture] += 1
            except Exception as e:
                print(f"[LOAD ERROR] {file} → {e}")
                corrupt_files.append(full_path)

    return stats, corrupt_files

def move_corrupt_files(file_list):
    for path in file_list:
        filename = os.path.basename(path)
        dest = os.path.join(MOVE_CORRUPT_TO, filename)
        shutil.move(path, dest)
    print(f"[INFO] Moved {len(file_list)} corrupt files to {MOVE_CORRUPT_TO}")

def plot_distribution(stats):
    gestures = list(stats.keys())
    counts = [stats[g] for g in gestures]

    plt.figure(figsize=(10, 5))
    plt.bar(gestures, counts, color="teal")
    plt.title("Samples Per Gesture")
    plt.xlabel("Gesture Name")
    plt.ylabel("Number of Samples")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()

# Main
if __name__ == "__main__":
    print("[INFO] Scanning dataset directory...")

    stats, corrupt = scan_dataset()

    print(f"\n[SUMMARY]")
    for gesture, count in stats.items():
        print(f" - {gesture}: {count} samples")

    print(f"\n[INFO] Found {len(corrupt)} corrupt or invalid files.")

    if corrupt:
        move_input = input("Move corrupt files to '_corrupted'? (y/n): ").strip().lower()
        if move_input == "y":
            move_corrupt_files(corrupt)

    plot_input = input("Plot class distribution? (y/n): ").strip().lower()
    if plot_input == "y":
        plot_distribution(stats)
