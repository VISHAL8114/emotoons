from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import requests
import json
from transformers import pipeline
from datetime import datetime
from huggingface_hub import login

app = Flask(__name__)
CORS(app)  # Enable CORS

# Check if GPU is available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Login to Hugging Face
login(token="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")  # Replace with your actual token

# Load the emotion detection model on GPU if available, otherwise use CPU
emotion_pipeline = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    device=0 if torch.cuda.is_available() else -1  # Set device=0 to use GPU, -1 to use CPU
)

# Initialize lists to store emotions and timestamps
emotions = []
timestamps = []

# Function to convert emotion to priority level
def emotion_priority(emotion):
    priorities = {
        'joy': 6,
        'surprise': 5,
        'neutral': 4,
        'sadness': 3,
        'disgust': 1,
        'anger': 0,
        'fear': 2
    }
    return priorities.get(emotion, 0)  # Default to 0 for unknown emotions

# Set up the Gemini API key
api_key = "AIzaSyC3dknAhgrOWfn689dsltqrTLPBU6z4z5g"

# Function to interact with the Gemini API
def chat_with_gemini(prompt):
    # Custom responses for specific commands
    if prompt.lower().startswith("play the song"):
        song_name = prompt[len("play the song "):].strip()
        return f"Song playing: {song_name}"
    elif prompt.lower().startswith("add the song"):
        song_name = prompt[len("add the song "):].strip()
        return f"Successfully added the song: {song_name} to queue"

    # Call the Gemini API for other responses
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(data))
    
    if response.status_code == 200:
        # Get the response JSON
        response_json = response.json()
        
        # Access the correct structure in the response and return only the answer
        return response_json['candidates'][0]['content']['parts'][0]['text'].strip()
    else:
        return f"Error: {response.status_code}, {response.text}"

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('input', '')

    # Get response from Gemini API or customized response
    response = chat_with_gemini(user_input)

    # Detect emotion (runs on GPU if available, otherwise on CPU)
    emotion_result = emotion_pipeline(user_input)
    detected_emotion = emotion_result[0]['label'].lower()
    priority = emotion_priority(detected_emotion)

    # Append emotion and timestamp
    emotions.append(priority)
    timestamps.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    # Return the chatbot response and detected emotion
    return jsonify({
        'response': response,
        'detected_emotion': detected_emotion,
        'priority': priority
    })

@app.route('/plot', methods=['GET'])
def plot():
    return jsonify({
        'emotions': emotions,
        'timestamps': timestamps
    })

if __name__ == '__main__':
    app.run(debug=True)