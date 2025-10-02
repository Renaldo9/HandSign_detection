from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
import pickle
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from React

# Load the same model and encoder as in detection.py
MODEL_PATH = 'Backend/artifacts/best_gesture_model.h5'
LABEL_ENCODER_PATH = 'Backend/artifacts/label_encoder.pkl'

model = tf.keras.models.load_model(MODEL_PATH)
with open(LABEL_ENCODER_PATH, 'rb') as f:
    le = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        features = np.array(data['features'])  # Expected shape: (30, 126)
        if features.shape != (30, 126):
            return jsonify({'error': 'Invalid feature shape'}), 400
        input_data = np.expand_dims(features, axis=0)  # Shape: (1, 30, 126)
        preds = model.predict(input_data)[0]
        idx = np.argmax(preds)
        label = le.inverse_transform([idx])[0]
        confidence = preds[idx] * 100
        return jsonify({'label': label, 'confidence': float(confidence)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)