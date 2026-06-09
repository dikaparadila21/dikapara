import io
import numpy as np
import face_recognition
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend.models import Base, Student, FaceEmbedding, Attendance

Base.metadata.create_all(bind=engine)
app = FastAPI(title='Absensi Wajah SMA Negeri 1 Sukoharjo')


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

@app.get('/health')
def health_check():
    return {'status': 'ok'}

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

    return {
        'student_id': student.id,
        'nisn': student.nisn,
        'nama': student.nama,
        'message': 'Registrasi wajah berhasil'
    }

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

    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail='Siswa tidak ditemukan')

    attendance = Attendance(student_id=student.id, status_in='Hadir' if distance <= 0.45 else 'Terlambat')
    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        'student_id': student.id,
        'nama': student.nama,
        'distance': distance,
        'status': attendance.status_in
    }
