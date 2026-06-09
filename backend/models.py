from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Float
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

class Class(Base):
    __tablename__ = 'classes'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    students = relationship('Student', back_populates='kelas')

class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, index=True)
    nisn = Column(String, unique=True, nullable=False)
    nama = Column(String, nullable=False)
    kelas_id = Column(Integer, ForeignKey('classes.id'), nullable=True)
    alamat = Column(String)
    tanggal_lahir = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    embeddings = relationship('FaceEmbedding', back_populates='student')
    attendances = relationship('Attendance', back_populates='student')
    kelas = relationship('Class', back_populates='students')

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
    notes = Column(String)
    student = relationship('Student', back_populates='attendances')
