# WebGazer Face Landmarks Export System to Python

This project allows you to retrieve all 468 face points detected by WebGazer and analyze them with AI models in Python.

## Project Structure

```
FaceLandmarks_Export/
├── webgazer_export_with_pupil_example.js   # JavaScript script to export from WebGazer
├── webgazer_export.js                      # Former JavaScript script to export from WebGazer
├── python_server_with_pupil.py             # Flask server to receive data
├── requirements.txt                        # Python dependencies
├── STRUCTURE_DONNEES.md                    # Explanation file for the data structure
└── README.md                               # This file
```

## Installation

### 1. Install Python Dependencies

```bash
cd FaceLandmarks_Export
pip install -r requirements.txt
```

## How to use

### Step 1: Start the Python Server

First, navigate to the working directory `FaceLandmarks_Export`.

```bash
py python_server_with_pupil.py
```

The server will be available at `http://localhost:5000`

### Step 2: Start WebGazer

First, navigate to the working directory `WebGazer-master\WebGazer-master\www`.

```bash
npm run serve
```

### Step 3: Use the Export Interface

1. Open your WebGazer page (calibration.html or collision.html)
2. An export interface will appear at the top right
3. Click "Start" to begin recording
4. Perform your eye movements by looking at the red dot and pressing Enter
5. Click "Stop" to finish recording
6. Click "Save" to save the data

The "Send" option is used to send data to the server. This is done by default, but if you encounter a problem, try "Send" before any capture.
The "Clear" option is used to reset all captures to 0.
The "Capture" option can be either "On" or "Off" and allows you to save camera images in addition to all FaceMesh points if desired.

### Step 4: Analyze the Data

```python
from face_landmarks_ai import FaceLandmarksAnalyzer

# Create the analyzer
analyzer = FaceLandmarksAnalyzer()

# Load the data
analyzer.load_landmarks_data('received_landmarks_YYYYMMDD_HHMMSS.json')

# Process the data
analyzer.process_landmarks()

# Train a prediction model
analyzer.train_gaze_prediction_model()

# Visualize the points
analyzer.visualize_landmarks()

# Export to CSV
analyzer.export_to_csv()
```

## Available Data

### Face Points (468 MediaPipe Points)

- **Left eye** : 22 points (contour + iris)
- **Right eye** : 22 points (contour + iris)  
- **Face contour** : 17 points
- **Eyebrows** : 12 points (6 per eyebrow)
- **Nose** : 9 points
- **Mouth** : 20 points

### Automatically Extracted Features

- Eye centers
- Inter-ocular distance
- Eye opening (height/width)
- Opening ratios
- Nose and mouth centers
- Mouth dimensions

## Analysis Examples

```python
# Analyze eye tracking accuracy
analyzer.visualize_landmarks(sample_index=0)

# Train a custom model
analyzer.train_gaze_prediction_model()

# Export for external analysis
analyzer.export_to_csv('my_data.csv')
```

## 🔧 Configuration

### Modify Export Rate

In `webgazer_export.js`, change the value:

```javascript
this.exportRate = 100; // ms between each capture (100ms = 10 FPS)
```

### Add Custom Features

In `face_landmarks_ai.py`, modify the `extract_features()` method:

```python
def extract_features(self, landmarks):
    # Your custom features here
    features = {}
    # ... existing code ...
    
    # New feature
    features['custom_feature'] = your_calculation(landmarks)
    
    return features
```

## Server API

- `POST /receive_landmarks` : Receive data from WebGazer
- `POST /analyze` : Analyze received data
- `GET /stats` : Data statistics
- `GET /health` : Server status


## Troubleshooting

### Issue: "No data captured"
- Verify that WebGazer is properly initialized
- Make sure the webcam is working
- Check the console for JavaScript errors

### Issue: "Server not accessible"
- Verify that the Python server is started
- Test the URL: `http://localhost:5000/health`
- Check server logs

### Issue: "Missing dependencies"
```bash
pip install --upgrade -r requirements.txt
```

## Data Format

### Exported JSON Structure

```json
{
  "timestamp": "2025-01-07T14:30:00.000Z",
  "landmarks": [[x1, y1, z1], [x2, y2, z2], ...], // 468 points
  "gaze_prediction": [x, y], // Gaze prediction
  "metadata": {
    "user_agent": "...",
    "screen_resolution": [1920, 1080],
    "window_size": [1200, 800]
  }
}
```
