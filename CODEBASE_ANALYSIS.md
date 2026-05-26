# Codebase Analysis: Digital Facial Recognition Attendance System

## Project Overview
This is a **Digital Facial Recognition Attendance System** built with Flask, OpenCV, and deep learning. It automates attendance marking using AI-powered facial recognition, replacing traditional manual registers or RFID systems.

---

## 🏗️ Architecture

### Tech Stack
- **Backend**: Python Flask (web framework)
- **Database**: SQLite3
- **Frontend**: HTML, CSS, JavaScript
- **ML/Computer Vision**: 
  - DeepFace (ArcFace embeddings for face encoding)
  - OpenCV (face detection via Haar Cascade & RetinaFace)
  - NumPy, SciPy (numerical computations)
- **Additional**: PIL (image processing), Pandas (data analysis)

### Project Structure
```
attendance_CNN-1.0.2/
├── app.py                 # Flask backend application
├── model.py              # ML model training & face recognition logic
├── requirements.txt      # Python dependencies
├── train_status.json     # Background training status tracking
├── attendance.db         # SQLite database (auto-created)
├── dataset/              # Face image storage organized by student ID
│   ├── 1/                # Student 1's face images
│   ├── 2/                # Student 2's face images
│   └── [student_id]/     # ... more students
├── static/
│   ├── css/
│   │   └── style.css     # UI styling
│   ├── js/
│   │   ├── camera_add_student.js    # Face capture for registration
│   │   ├── camera_mark.js           # Face capture for attendance marking
│   │   └── dashboard.js             # Dashboard analytics
│   └── images/           # Static images
└── templates/            # HTML templates
    ├── index.html        # Dashboard home page
    ├── add_student.html  # Student registration page
    ├── mark_attendance.html # Attendance marking interface
    └── attendance_record.html # View attendance records
```

---

## 📊 Database Schema

### Tables

#### `students` Table
Stores student information:
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT UNIQUE)           -- Full name (e.g., "John Doe")
- roll (TEXT)                  -- Roll number
- class (TEXT)                 -- Class/year
- section (TEXT)               -- Section
- reg_no (TEXT)                -- Registration number
- has_faces (INTEGER)          -- Flag: 1 if facial images uploaded
- created_at (TEXT)            -- Timestamp
```

#### `attendance` Table
Tracks check-in/out records:
```sql
- id (INTEGER PRIMARY KEY)
- student_roll_number (INTEGER FOREIGN KEY) -- References students.id
- name (TEXT)                  -- Student name (denormalized)
- check_in_time (TEXT)         -- ISO8601 timestamp
- check_out_time (TEXT)        -- Optional check-out time
- is_late (INTEGER)            -- 0 or 1 (late if after 9:30 AM)
- duration_minutes (INTEGER)   -- Time spent
- confidence (REAL)            -- Recognition confidence (0.0-1.0)
```

Indexes:
- `idx_attendance_date`: On `check_in_time` for fast date queries
- `idx_attendance_student`: On `student_roll_number` for student queries

---

## 🔄 Core Workflows

### 1. **Student Registration Workflow**
**File**: [app.py](app.py#L122) → `/add_student`

1. User submits form with: name, roll, class, section, registration number
2. Validation:
   - Full name required (at least 2 words, e.g., "John Doe")
   - All fields mandatory
   - Uniqueness checks: name, roll number, registration number
3. Returns temporary student ID and redirects to camera capture
4. **JavaScript**: [camera_add_student.js](static/js/camera_add_student.js)
   - Captures multiple face images via webcam
   - Sends images to `/upload_face`

### 2. **Face Image Upload & Processing**
**File**: [app.py](app.py#L182) → `/upload_face`

**Image Validation**:
- Face detection using Haar Cascade classifier
- Rejects: no face, multiple faces detected
- Authenticity checks:
  - Laplacian filter: detects AI-generated/animated images (threshold: variance < 3)
  - Color histogram: counts unique colors to reject cartoon images (< 20 colors)
  - Invalid encodings (NaN/Inf values)

**Face Encoding**:
- Extracts 128-dimensional embeddings using **DeepFace (ArcFace model)**
- Brightness normalization (handles low/high lighting)
- Dual backend: RetinaFace (primary) → OpenCV (fallback)
- Validates consistency: cosine distance between embeddings < 0.15 (same person)

**Storage**:
- Images saved to `dataset/[student_id]/`
- Creates database record: `students.has_faces = 1`

### 3. **Model Training**
**File**: [model.py](model.py#L351) → `train_model_background()`

**Execution**: Background thread via [app.py](app.py#L456) → `/train_model`

**Process**:
1. Scans `dataset/` folder for student directories
2. For each student:
   - Reads all image files (.jpg, .jpeg, .png)
   - Extracts face encoding for each image
   - Stores encoding + student_id label
3. Creates model pickle file: `model.pkl`
   - Structure: `{'encodings': [...], 'labels': [...]}`

**Error Handling**:
- Logs failed images (tracks total processed vs failed)
- Requires ≥1 valid encoding per student
- Progress tracked in [train_status.json](train_status.json)

**Status Callback**:
- Stages: scanning → loading → preparing → complete
- Progress: 0-100%

### 4. **Attendance Marking (Recognition)**
**File**: [app.py](app.py#L489) → `/recognize_face` (POST)

**Frontend**: [camera_mark.js](static/js/camera_mark.js)

**Steps**:
1. Capture 5 frames at 150ms intervals from webcam
2. Send frames to server for liveness detection + recognition

**Liveness Detection** ([model.py](model.py#L12)):
- **Position Variance**: Detects excessive movement (video replay fraud)
  - Threshold: position_variance > 20000 → reject
- **Texture Analysis**: Laplacian variance per frame
  - Low variance (< 3) → printed photo/screen display
- **Size Consistency**: Face size variations across frames
  - Coefficient of variation > 0.6 → rejected
- **Brightness**: Checks lighting consistency

**Face Recognition** ([model.py](model.py#L318)):
1. Extract encoding from current frame using ArcFace
2. Compare against all stored encodings (cosine distance)
3. **Similarity threshold**: 0.65 (cosine similarity)
4. **Margin check**: Ensures top 2 matches have > 0.08 margin
   - Prevents ambiguous matches
5. Returns: student name + confidence score

**Late Marking**:
- Late threshold: 9:30 AM (India Standard Time)
- Timezone: Asia/Kolkata (IST)

**Response**:
```json
{
  "recognized": true,
  "name": "John Doe",
  "student_id": 1,
  "confidence": 0.92,
  "is_late": false,
  "status": "check_in",
  "liveness": {
    "is_live": true,
    "confidence": 0.85,
    "reason": "Liveness verified"
  }
}
```

---

## 📡 API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Dashboard homepage |
| `/add_student` | GET/POST | Student registration form & validation |
| `/upload_face` | POST | Upload face images for student |
| `/train_model` | GET | Trigger background model training |
| `/train_status` | GET | Get current training progress (JSON) |
| `/mark_attendance` | GET | Attendance marking interface |
| `/recognize_face` | POST | Recognize face & mark attendance |
| `/attendance_stats` | GET | Last 30 days attendance stats (JSON) |
| `/attendance_record` | GET | View attendance records (paginated) |
| `/download_csv` | GET | Export attendance as CSV |
| `/students` | GET | List all students (JSON) |
| `/students/<id>` | DELETE | Remove student record |

---

## 🎨 Frontend Components

### JavaScript Files

#### [camera_mark.js](static/js/camera_mark.js)
- Manages attendance marking interface
- Captures video frames from webcam
- Sends frames to `/recognize_face` for recognition
- Displays recognized student names in real-time list
- Handles liveness check feedback

#### [camera_add_student.js](static/js/camera_add_student.js)
- Student registration face capture
- Uploads images to `/upload_face`
- Shows upload progress and validation feedback

#### [dashboard.js](static/js/dashboard.js)
- Renders attendance charts (last 30 days)
- Fetches data from `/attendance_stats`

### HTML Templates

- **index.html**: Dashboard with charts, quick actions
- **add_student.html**: Registration form + camera capture
- **mark_attendance.html**: Attendance marking interface
- **attendance_record.html**: View/search attendance records

---

## 🧠 ML Model Details

### Face Encoding Model
- **Model**: DeepFace with **ArcFace** backend
- **Output**: 128-dimensional embedding vector
- **Distance Metric**: Cosine distance (similarity = 1 - cosine_distance)

### Matching Algorithm
1. Compare face encoding against all stored encodings
2. Find best match using cosine similarity
3. Apply confidence threshold: **0.65**
4. Verify margin between top-2 matches: **> 0.08**
5. Return matched student if thresholds met

### Fallback Strategy
- **Primary**: RetinaFace detector (more accurate)
- **Secondary**: OpenCV Haar Cascade (if RetinaFace fails)

---

## 🔐 Security & Validation Features

### Image Authenticity
- **Laplacian Variance**: Rejects AI-generated/low-quality images
- **Color Histogram**: Rejects cartoon/animated images
- **Face Detection**: Ensures real human face present

### Duplicate Prevention
- One check-in per student per session
- Tracks `recognizedIds` set in camera_mark.js

### Data Validation
- Database constraints: UNIQUE on name, roll, reg_no
- Foreign key: attendance → students
- Confidence scoring for recognition reliability

### Timezone Handling
- All timestamps: ISO8601 format
- Configured for Asia/Kolkata (IST)
- Late threshold: 9:30 AM daily

---

## ⚙️ Configuration

### Flask Config (app.py)
```python
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB file limit
JSON_SORT_KEYS = False
SEND_FILE_MAX_AGE_DEFAULT = 0  # No cache for dynamic content
```

### Model Config (model.py)
- **Tolerance/Threshold**: 0.65 cosine similarity
- **Margin**: 0.08 between top matches
- **Brightness Range**: 100-200 (adjusted if outside)

---

## 🚀 Execution Flow

### Startup
1. Initialize Flask app with static & template folders
2. Create database connection pool
3. Auto-initialize tables (students, attendance, indexes)
4. Load existing model if available

### Adding a Student
1. User → POST /add_student (validates data)
2. User captures images → POST /upload_face
3. Server processes images, stores in dataset/[id]/
4. User triggers /train_model
5. Background thread trains new model (saves to model.pkl)

### Marking Attendance
1. User → GET /mark_attendance (loads camera interface)
2. Camera captures frames → POST /recognize_face
3. Server: extracts encoding, checks liveness, compares with model
4. If matched → INSERT into attendance table
5. Response sent to frontend with student info + confidence

---

## 📈 Attendance Analytics

### Stats Endpoint (`/attendance_stats`)
- Queries last 30 days of attendance
- Groups by date
- Returns dates + daily check-in counts
- Used by dashboard charts

### CSV Export (`/download_csv`)
- Downloads attendance records as CSV
- Includes: name, roll, check-in time, is_late, etc.

---

## 🐛 Error Handling

- **DB Timeout**: 10 seconds per connection
- **Image Upload**: 50 MB max file size
- **Missing Files**: Graceful fallback (e.g., Haar Cascade path)
- **Model Loading**: Returns None if model.pkl corrupted/missing
- **Face Detection**: Try RetinaFace first, then OpenCV
- **Logging**: Flask logger captures all errors with context

---

## 📝 Key Data Flows

### Data Flow Diagram
```
Student Registration:
User Form → DB (students) → Upload Images → Dataset Folder → Train Model

Attendance Marking:
Camera → Frame Capture → Face Encoding → Model Comparison → DB (attendance)

Analytics:
DB Query → Pandas Processing → JSON Response → Frontend Charts
```

---

## 🎯 Unique Features

1. **Liveness Detection**: Prevents spoofing with printed photos/videos
2. **Multi-stage Validation**: Image authenticity + face encoding + margin check
3. **Confidence Scoring**: Shows recognition accuracy (0-100%)
4. **Late Tracking**: Automatic late-flag based on time threshold
5. **Background Training**: Async model updates without blocking UI
6. **CSV Export**: Easy data sharing for administrative purposes
7. **Real-time Recognition**: Marks attendance instantly upon face match
8. **Dual Detection**: RetinaFace + OpenCV for robustness

---

## 💡 Quality Indicators

- **Code Organization**: Well-modularized (app.py for routes, model.py for ML)
- **Database Design**: Normalized schema with proper indexes
- **Error Handling**: Try-catch blocks with logging throughout
- **Frontend**: Responsive JS with real-time feedback
- **Scalability**: Supports adding/removing students dynamically
- **Performance**: Lazy model loading, frame buffering for liveness

---

**Project Version**: 1.0.2  
**Last Analysis**: May 26, 2026
