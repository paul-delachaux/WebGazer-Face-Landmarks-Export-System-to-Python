# 📊 Face Landmarks Data Structure

This document explains in detail the structure of facial landmarks data captured by WebGazer.

## 🎯 Overview

Data is stored in a **JSON** file containing a **list of samples**. Each sample represents a snapshot of the face at a given moment (during a mouse click).

## 📦 Sample Structure

Each sample in the JSON file has the following structure:

```json
{
  "timestamp": "2025-01-15T14:30:25.123Z",
  "landmarks": [[x1, y1, z1], [x2, y2, z2], ..., [x468, y468, z468]],
  "gaze_prediction": [clickX, clickY],
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "screen_resolution": [1920, 1080],
    "window_size": [1200, 800]
  }
}
```

## 🔍 Field Details

### 1. `timestamp` (string)
- **Type**: ISO 8601 string
- **Format**: `"YYYY-MM-DDTHH:MM:SS.sssZ"`
- **Example**: `"2025-01-15T14:30:25.123Z"`
- **Description**: Exact date and time of capture

### 2. `landmarks` (array)
- **Type**: Array of 468 elements
- **Structure**: Each element is an array `[x, y, z]`
- **Format**: `[[x1, y1, z1], [x2, y2, z2], ..., [x468, y468, z468]]`

#### Point coordinates:
```json
[x, y, z]
```
- **x** (float): Horizontal coordinate (0.0 to 1.0, normalized)
- **y** (float): Vertical coordinate (0.0 to 1.0, normalized)
- **z** (float): Relative depth (may be 0 if unavailable)

#### Concrete example:
```json
"landmarks": [
  [0.345, 0.512, 0.001],  // Point 0
  [0.350, 0.518, 0.002],  // Point 1
  [0.355, 0.520, 0.001],  // Point 2
  // ... 465 other points ...
  [0.678, 0.523, 0.003]   // Point 467
]
```

### 3. `gaze_prediction` (array)
- **Type**: Array of 2 elements
- **Format**: `[x, y]`
- **Description**: Cursor position at the time of click (in pixels)
- **Example**: `[450, 320]`
  - `x`: Horizontal cursor position in pixels
  - `y`: Vertical cursor position in pixels

### 4. `metadata` (object)
- **Type**: JavaScript/Python object
- **Content**:
  - `user_agent` (string): Browser used
  - `screen_resolution` (array): `[width, height]` in pixels
  - `window_size` (array): `[width, height]` of the window in pixels

## 📐 The 468 MediaPipe Points

The 468 points follow the **MediaPipe FaceMesh** model and are organized as follows:

### Face zones:

| Zone | Indices | Number of points |
|------|---------|-----------------|
| **Face contour** | 0-16, 17-21, 22-26, 27-30, 31-35 | ~36 points |
| **Left eye** | 33-41, 133-143 | ~22 points |
| **Right eye** | 362-372, 263-273 | ~22 points |
| **Left eyebrow** | 70-75 | 6 points |
| **Right eyebrow** | 300-305 | 6 points |
| **Nose** | 1-9, 19-24, 27-35 | ~24 points |
| **Mouth** | 61-67, 84-95, 267-270, 291-295 | ~20 points |
| **Other zones** | Rest | ~332 points |

### Important points for eye tracking:

```python
# In face_landmarks_ai.py, these indices are defined:
eye_points = {
    "left_eye": list(range(33, 42)) + list(range(133, 144)),   # ~22 points
    "right_eye": list(range(362, 373)) + list(range(263, 274)) # ~22 points
}
```

## 📄 Complete JSON File Example

```json
[
  {
    "timestamp": "2025-01-15T14:30:25.123Z",
    "landmarks": [
      [0.345, 0.512, 0.001],
      [0.350, 0.518, 0.002],
      [0.355, 0.520, 0.001],
      // ... 465 other points ...
      [0.678, 0.523, 0.003]
    ],
    "gaze_prediction": [450, 320],
    "metadata": {
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "screen_resolution": [1920, 1080],
      "window_size": [1200, 800]
    }
  },
  {
    "timestamp": "2025-01-15T14:30:26.456Z",
    "landmarks": [
      [0.346, 0.513, 0.001],
      [0.351, 0.519, 0.002],
      // ... 466 other points ...
    ],
    "gaze_prediction": [455, 325],
    "metadata": {
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "screen_resolution": [1920, 1080],
      "window_size": [1200, 800]
    }
  }
]
```

## 🔄 How Data is Processed

### 1. Loading (Python)
```python
# In face_landmarks_ai.py
with open('face_landmarks_dataset.json', 'r') as f:
    landmarks_data = json.load(f)
# landmarks_data is now a list of samples
```

### 2. Conversion to NumPy
```python
# Each sample becomes a NumPy array
landmarks = np.array(sample['landmarks'])
# Shape: (468, 3) - 468 points with 3 coordinates (x, y, z)
```

### 3. Feature Extraction
```python
# Features are automatically extracted:
features = {
    'left_eye_center': [x, y, z],      # Left eye center
    'right_eye_center': [x, y, z],     # Right eye center
    'inter_eye_distance': 0.123,       # Distance between eyes
    'left_eye_height': 0.045,          # Left eye height
    'right_eye_height': 0.044,         # Right eye height
    # ... etc
}
```

## 📊 Data Visualization

### Hierarchical structure:
```
JSON File
└── List of samples []
    └── Sample {}
        ├── timestamp: "2025-01-15T14:30:25.123Z"
        ├── landmarks: [[x,y,z], [x,y,z], ...]  (468 elements)
        ├── gaze_prediction: [x, y]
        └── metadata: {}
            ├── user_agent: "..."
            ├── screen_resolution: [1920, 1080]
            └── window_size: [1200, 800]
```

### Data dimensions:
- **Number of samples**: Variable (depends on number of clicks)
- **Points per sample**: 468 (fixed)
- **Coordinates per point**: 3 (x, y, z)
- **Total size**: `number_of_samples × 468 × 3` numerical values

## 💡 Important Points

1. **Normalized coordinates**: Landmarks are normalized between 0.0 and 1.0
2. **Depth (z)**: May be 0 if unavailable
3. **gaze_prediction**: Corresponds to cursor position at click, not an actual gaze prediction
4. **Point order**: Always the same (0 to 467) according to MediaPipe FaceMesh

## 🔧 Practical Usage

### Access a specific point:
```python
# Point 0 (first contour point)
point_0 = sample['landmarks'][0]  # [x, y, z]

# All left eye points (according to defined indices)
left_eye_indices = list(range(33, 42)) + list(range(133, 144))
left_eye_points = [sample['landmarks'][i] for i in left_eye_indices]
```

### Convert to pixel coordinates:
```python
# If you know the image size
image_width = 640
image_height = 480

x_normalized = sample['landmarks'][0][0]  # 0.345
y_normalized = sample['landmarks'][0][1]  # 0.512

x_pixel = x_normalized * image_width   # 0.345 * 640 = 220.8
y_pixel = y_normalized * image_height  # 0.512 * 480 = 245.76
```

## 📚 References

- [MediaPipe FaceMesh Documentation](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [WebGazer Documentation](https://webgazer.cs.brown.edu/)

