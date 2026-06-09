# Absensi Wajah SMA Negeri 1 Sukoharjo

## 1. Arsitektur Sistem

1. Frontend
   - Web App: React.js menggunakan kamera browser untuk capture wajah.
   - Mobile/Tablet: Bisa menggunakan web app yang responsif atau nanti Flutter jika ingin native.

2. Backend
   - API: Python FastAPI untuk endpoint registrasi, absensi, dan laporan.
   - Face AI: `face_recognition` + `OpenCV` untuk deteksi wajah dan ekstraksi embedding.
   - Database: PostgreSQL (dengan opsi `pgvector` untuk penyimpanan embedding lebih efisien).

3. Database & Storage
   - Simpan embedding wajah dalam tabel terpisah.
   - Simpan metadata siswa, absensi, status, kelas, dan orang tua.

4. Flow utama
   - Registrasi: Petugas mengunggah foto siswa → backend ekstrak face embedding → simpan ke DB.
   - Scan: Kamera livestream atau foto dikirim ke backend → deteksi wajah → hitung embedding → cocokkan.
   - Rekap: Dashboard memanggil API laporan harian/bulanan → ditampilkan untuk admin/guru.
   - Notifikasi (opsional): Kirim ringkasan ke WhatsApp/Email orang tua menggunakan service eksternal.

## 2. Teknologi yang Direkomendasikan

- Backend: Python FastAPI
- Frontend: React.js
- Database: PostgreSQL
- Face Recognition: `face_recognition` (didasarkan pada dlib) + `opencv-python`
- Opsional: `pgvector` untuk search vector lebih cepat, `redis` untuk caching, `celery` untuk notifikasi.

## 3. Struktur Database Efisien

Gunakan PostgreSQL dengan tabel utama:

1. `users`
2. `students`
3. `face_embeddings`
4. `attendance`
5. `classes`
6. `parents`
7. `notifications`

### Contoh skema SQL

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'petugas')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE parents (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  nisn TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  kelas_id INT REFERENCES classes(id),
  alamat TEXT,
  tanggal_lahir DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE face_embeddings (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  embedding REAL[] NOT NULL,
  source TEXT NOT NULL DEFAULT 'registration',
  registered_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id),
  record_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status_in TEXT NOT NULL CHECK (status_in IN ('Hadir','Terlambat','Alpha')),
  status_out TEXT CHECK (status_out IN ('Hadir','Terlambat','Alpha')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  attendance_id INT REFERENCES attendance(id),
  parent_id INT REFERENCES parents(id),
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed')),
  message TEXT
);
```

> Catatan: Untuk `pgvector`, ganti `REAL[]` dengan `VECTOR(128)` jika menggunakan extension tersebut.

## 4. Langkah-langkah Setup Environment

### A. Siapkan Python Backend

1. Buat virtual environment dan aktifkan:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependency:
   ```bash
   pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary python-multipart pillow face_recognition opencv-python-headless numpy passlib[bcrypt] python-dotenv
   ```
3. Siapkan file `.env` dengan variabel:
   ```env
   DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/absensi
   SECRET_KEY=isi_rahasia_jwt
   ```

### B. Siapkan Database PostgreSQL

1. Install PostgreSQL.
2. Buat database dan user:
   ```sql
   CREATE DATABASE absensi;
   CREATE USER absensi_user WITH PASSWORD 'sandi_strong';
   GRANT ALL PRIVILEGES ON DATABASE absensi TO absensi_user;
   ```
3. Jika ingin lebih cepat di production, install extension `pgvector`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### C. Siapkan Frontend

1. Buat proyek React:
   ```bash
   npx create-react-app absensi-face --template cra-template-pwa
   cd absensi-face
   npm install axios react-webcam
   ```
2. Buat halaman:
   - `Registrasi Siswa`
   - `Scan Absensi`
   - `Dashboard Laporan`
   - `Manajemen Pengguna`

### D. Jalankan backend Python (opsional)

```bash
uvicorn backend.app:app --reload
```

### E. Jalankan backend Node.js untuk database lokal SQLite

1. Install dependency:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   npm start
   ```
3. Buka browser ke:
   ```bash
   http://localhost:3000
   ```

> Server akan membuat file database `attendance.db` otomatis dan menyimpan data absensi ke SQLite.

## 5. Logic Face Matching yang Akurat

1. Deteksi wajah dari gambar/video.
2. Ekstrak face embedding ukuran 128d.
3. Hitung jarak cosine atau Euclidean dengan embedding yang sudah terdaftar.
4. Tentukan threshold, misal:
   - `distance <= 0.45` → cocok
   - `0.45 < distance <= 0.55` → review manual
   - `distance > 0.55` → tidak cocok

### Contoh fungsi matching

```python
import numpy as np

def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
    return np.linalg.norm(a - b)


def is_match(known_embedding, candidate_embedding, threshold=0.45):
    return euclidean_distance(np.array(known_embedding), np.array(candidate_embedding)) <= threshold
```

> Gunakan threshold konservatif agar tidak terjadi false positive. Untuk akurasi lebih tinggi, selalu gunakan foto wajah dengan posisi natural dan pencahayaan baik.

## 6. Contoh Kode Dasar Backend

Buat `backend/app.py` dan tambahkan endpoint registrasi serta absensi.

### File: `backend/database.py`

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://user:password@localhost:5432/absensi')

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### File: `backend/models.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import ARRAY

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, index=True)
    nisn = Column(String, unique=True, nullable=False)
    nama = Column(String, nullable=False)
    kelas_id = Column(Integer, ForeignKey('classes.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    embeddings = relationship('FaceEmbedding', back_populates='student')
    attendances = relationship('Attendance', back_populates='student')

class FaceEmbedding(Base):
    __tablename__ = 'face_embeddings'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'))
    embedding = Column(ARRAY(Float), nullable=False)
    source = Column(String, default='registration')
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    student = relationship('Student', back_populates='embeddings')

class Attendance(Base):
    __tablename__ = 'attendance'
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'))
    record_date = Column(DateTime(timezone=True), server_default=func.now())
    clock_in = Column(DateTime(timezone=True), nullable=True)
    clock_out = Column(DateTime(timezone=True), nullable=True)
    status_in = Column(String, nullable=False)
    status_out = Column(String, nullable=True)
    student = relationship('Student', back_populates='attendances')
```

### File: `backend/app.py`

```python
import io
import numpy as np
import face_recognition
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.models import Base, Student, FaceEmbedding, Attendance

Base.metadata.create_all(bind=engine)
app = FastAPI(title='Absensi Wajah SMA 1 Sukoharjo')


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def extract_face_encoding(image_bytes: bytes):
    image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        raise ValueError('Wajah tidak terdeteksi. Pastikan foto jelas dan wajah terlihat penuh.')
    return encodings[0]


def find_best_match(db: Session, candidate_encoding: np.ndarray, threshold: float = 0.45):
    embeddings = db.query(FaceEmbedding).all()
    best = None
    best_distance = float('inf')

    for item in embeddings:
        distance = np.linalg.norm(np.array(item.embedding) - candidate_encoding)
        if distance < best_distance:
            best_distance = distance
            best = item

    if best and best_distance <= threshold:
        return best.student_id, float(best_distance)
    return None, best_distance

## 7. Website Absensi Wajah (HTML/CSS/JS)

Berkas frontend statis telah dibuat di root:
- `index.html`
- `styles.css`
- `app.js`
- `google-apps-script.gs`

### Cara deploy Google Apps Script
1. Buat Google Spreadsheet baru.
2. Salin `SPREADSHEET_ID` dari URL spreadsheet.
3. Buka Google Apps Script (`Extensions > Apps Script`).
4. Tempelkan isi `google-apps-script.gs`.
5. Ganti `SPREADSHEET_ID` dengan ID spreadsheet Anda.
6. Deploy sebagai web app dengan akses: "Anyone, even anonymous".
7. Salin URL web app dan tempelkan di `const SCRIPT_URL` di `app.js`.

> Jika browser menolak permintaan karena CORS, `app.js` sudah menggunakan `mode: 'no-cors'` untuk memastikan data tetap dikirim.

### Data yang terkirim ke Spreadsheet
- `Nama`
- `Tanggal`
- `Jam`
- `Foto Base64`

> Pastikan browser memberikan izin kamera dan web app telah ditempatkan di URL yang valid.


@app.post('/students/register')
async def register_student(
    nisn: str,
    nama: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    try:
        encoding = extract_face_encoding(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    student = Student(nisn=nisn, nama=nama)
    db.add(student)
    db.commit()
    db.refresh(student)

    face_embedding = FaceEmbedding(student_id=student.id, embedding=encoding.tolist())
    db.add(face_embedding)
    db.commit()
    return {'student_id': student.id, 'message': 'Registrasi wajah berhasil'}

@app.post('/attendance/scan')
async def scan_attendance(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    try:
        encoding = extract_face_encoding(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    student_id, distance = find_best_match(db, encoding)
    if not student_id:
        raise HTTPException(status_code=404, detail='Wajah tidak cocok dengan database')

    student = db.query(Student).get(student_id)
    today = np.datetime64('today').astype('datetime64[D]')
    record_date = np.datetime64(today).astype('datetime64[s]').astype(object)

    attendance = Attendance(
        student_id=student.id,
        status_in='Hadir' if distance <= 0.45 else 'Terlambat'
    )
    db.add(attendance)
    db.commit()
    return {
        'student_id': student.id,
        'nama': student.nama,
        'distance': distance,
        'status': attendance.status_in
    }
```

> Perhatikan: contoh di atas masih sederhana. Untuk production, gunakan normalisasi jarak, cache embeddings, dan endpoint terpisah untuk laporan.

## 7. Frontend Contoh Integrasi Kamera

Di React, gunakan `react-webcam` untuk ambil foto lalu kirim ke backend.

```jsx
import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

function ScanPage() {
  const webcamRef = useRef(null);

  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const blob = await fetch(imageSrc).then(r => r.blob());
    const formData = new FormData();
    formData.append('file', blob, 'scan.jpg');

    const response = await axios.post('/api/attendance/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert(`Siswa: ${response.data.nama} | Status: ${response.data.status}`);
  };

  return (
    <div>
      <Webcam screenshotFormat="image/jpeg" />
      <button onClick={capture}>Scan Absensi</button>
    </div>
  );
}
```

## 8. Keamanan & Privasi

- Gunakan HTTPS di semua koneksi.
- Simpan password dengan hashing bcrypt.
- Gunakan JWT untuk otentikasi role-based.
- Batasi akses endpoint hanya admin/guru/petugas.
- Simpan hanya `face embeddings`, jangan simpan foto wajah mentah selain saat registrasi.
- Gunakan audit log untuk aktivitas registrasi dan scan.
- Jika menggunakan notifikasi WhatsApp, pakai gateway resmi seperti Twilio API atau layanan lokal yang aman.

## 9. Rencana Evolusi

1. Produksi: pakai ANN engine (Faiss, Milvus, atau `pgvector`) untuk performa matching di >1000 siswa.
2. Edge: jalankan inference di device sekolah (Raspberry Pi/PC lokal) untuk latensi rendah.
3. Mobile native: Flutter jika ingin aplikasi Android/iOS.
4. Notification: integrasi WhatsApp Business API dan SMTP/email.

---

Jika kamu ingin, saya bisa lanjutkan dengan membuat kerangka proyek lengkap pada `backend/` dan `frontend/` untuk memulai langsung.