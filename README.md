# Digital Facial Recognition Attendance System v1.0.2

Automated attendance tracking using AI-powered facial recognition with advanced security features to prevent fraud and ensure accurate attendance management.

---

## ✨ Features

### Facial Recognition
Real-time face matching using DeepFace (ArcFace model). Extracts 128-dimensional face embeddings and compares with stored student encodings (0.65 confidence threshold). Dual detection backends (RetinaFace + OpenCV) ensure robustness.

### Liveness Detection
Advanced anti-spoofing technology prevents fraud:
- **Movement Analysis**: Detects video replay attacks
- **Texture Detection**: Rejects printed photos and blurry images
- **Face Size Validation**: Identifies screen display spoofing
- **Brightness Checks**: Ensures natural lighting

### Image Authenticity Validation
Intelligent filtering rejects:
- Multi-face or no-face images
- AI-generated/deepfake images (Laplacian variance < 3)
- Cartoon/animated images (color histogram < 20 colors)
- Invalid face encodings

### Student Registration
Multi-step enrollment: form submission → webcam capture → image validation → face encoding extraction → model training.

### Attendance Marking
One-click recognition: capture face → liveness check → match against model → instant attendance record creation with confidence score.

### Analytics & Reporting
30-day attendance dashboard, daily statistics, per-student records, CSV export for analysis.

### Background Model Training
Non-blocking async training pipeline with progress tracking: scanning → loading → preparing → complete.

---

## 🏗️ Architecture

**Backend**: Flask + SQLite3 | **ML**: DeepFace, OpenCV, NumPy | **Frontend**: HTML/CSS/JavaScript

### Key Files
- **app.py**: Flask routes & API endpoints
- **model.py**: Face encoding, model training, recognition algorithm
- **dataset/**: Student face images (organized by ID)
- **templates/**: Dashboard, registration, marking interfaces
- **static/js/**: Camera capture, real-time recognition, analytics

---

## 🧠 Recognition Algorithm

1. Extract 128D face embedding (ArcFace)
2. Calculate cosine distance vs all stored embeddings
3. Find best match with similarity ≥ 0.65
4. Verify margin between top 2 matches (> 0.08)
5. Return matched student + confidence score

---

## 📊 Database

**Students**: id, name, roll, class, section, reg_no, has_faces, created_at
**Attendance**: id, student_id, name, check_in_time, check_out_time, is_late, confidence

---

## 🔐 Security Features

| Feature | Protection |
|---------|-----------|
| Liveness Detection | Prevents photo/video/screen spoofing |
| Image Quality Checks | Rejects AI-generated & cartoon images |
| Confidence Scoring | Shows match reliability |
| Margin Validation | Ensures unique matches |
| Database Constraints | UNIQUE on name, roll, reg_no |
| Late Tracking | Auto-detection (9:30 AM IST) |

---

## 🚀 Quick Start

```bash
pip install -r requirements.txt
python app.py
# Visit http://localhost:5000
```

**Workflow**: Dashboard → Add Student → Upload Faces → Train Model → Mark Attendance → View Records

---

## 📡 API Endpoints

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/add_student` | Student registration |
| `/upload_face` | Face image upload |
| `/train_model` | Trigger training |
| `/mark_attendance` | Attendance interface |
| `/recognize_face` | Face recognition |
| `/attendance_stats` | 30-day trends |
| `/attendance_record` | View records |
| `/download_csv` | Export data |

---

## ⚙️ Configuration

Confidence Threshold: 0.65 | Margin: 0.08 | Late Time: 9:30 AM IST | Max File: 50 MB | Frames: 5 @ 150ms intervals

---

## 💡 Unique Capabilities

✅ Advanced 5-frame liveness detection | ✅ AI-generated image detection | ✅ Real-time marking with confidence | ✅ Automatic late tracking | ✅ Async model training | ✅ CSV export | ✅ Multi-backend fallback | ✅ Timezone-aware timestamps

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Flask 3.1.2 |
| Database | SQLite3 |
| ML/Vision | DeepFace, OpenCV, RetinaFace |
| Embeddings | ArcFace (128D) |
| Frontend | HTML5, CSS3, JavaScript |

---

## 📍 Use Cases

🏫 Schools & colleges | 🏢 Corporate offices | 🎓 Training programs | 🏛️ Government institutions

---

**Version**: v1.0.2 | [Detailed Analysis](CODEBASE_ANALYSIS.md)
