from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from keras.models import load_model
from keras.preprocessing.image import img_to_array
from PIL import Image
import numpy as np
import os
import cv2
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)

songs_dir = r'C:\Users\VISHAL T\Documents\Emotunes\src\Songs'
model_path = r'C:\Users\VISHAL T\Documents\Emotunes\src\emotion_model.keras'
model = load_model(model_path)

emotion_map = {
    'angry': 'Angry',
    'happy': 'Happy',
    'neutral': 'Neutral',
    'sad': 'Sad',
    'surprise': 'Surprise'
}

def preprocess_image(image):
    image = image.convert('L')
    image = image.resize((48, 48))
    image = img_to_array(image)
    image = np.expand_dims(image, axis=0)
    image = image / 255.0
    return image

def detect_face(image):
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    img_np = np.array(image)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
    return faces

@app.route('/api/songs', methods=['GET'])
def get_songs():
    try:
        emotion_songs = []
        for emotion, folder in emotion_map.items():
            emotion_folder = os.path.join(songs_dir, folder)
            if os.path.isdir(emotion_folder):
                for file in os.listdir(emotion_folder):
                    if file.endswith('.mp3'):
                        emotion_songs.append(f"{folder}/{file}")
        logging.info(f"Songs fetched: {emotion_songs}")
        return jsonify(emotion_songs)
    except Exception as e:
        logging.error(f"Error loading songs: {e}")
        return jsonify({'error': 'Unable to read songs directory'}), 500

@app.route('/songs/<path:filename>', methods=['GET'])
def serve_song(filename):
    try:
        logging.info(f"Serving song: {filename}")
        return send_from_directory(songs_dir, filename)
    except Exception as e:
        logging.error(f"Error serving song {filename}: {e}")
        return jsonify({'error': 'Song not found'}), 404

@app.route('/detect-emotion', methods=['POST'])
def detect_emotion():
    if 'file' not in request.files:
        logging.error("No file uploaded")
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file:
        try:
            image = Image.open(file.stream)
            faces = detect_face(image)
            if len(faces) > 0:
                (x, y, w, h) = faces[0]
                image = image.crop((x, y, x + w, y + h))
            
            processed_image = preprocess_image(image)
            prediction = model.predict(processed_image)
            emotion = np.argmax(prediction[0])
            emotion_label = list(emotion_map.keys())[emotion]
            logging.info(f"Emotion detected: {emotion_label}")
            return jsonify({'emotion': emotion_label})
        except Exception as e:
            logging.error(f"Error processing image: {e}")
            return jsonify({'error': 'Failed to process image'}), 500
    
    logging.error("Failed to process image")
    return jsonify({'error': 'Failed to process image'}), 500

if __name__ == '__main__':
    app.run(port=3001)