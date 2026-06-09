const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const dbFile = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbFile);

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname)));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      jam TEXT NOT NULL,
      foto_base64 TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
});

app.post('/attendance', (req, res) => {
  const { nama, tanggal, jam, foto } = req.body;
  if (!nama || !tanggal || !jam || !foto) {
    return res.status(400).json({ status: 'error', message: 'Semua field wajib diisi.' });
  }

  const createdAt = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO attendance (nama, tanggal, jam, foto_base64, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run(nama, tanggal, jam, foto, createdAt, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Gagal menyimpan ke database.' });
    }
    res.json({ status: 'success', id: this.lastID });
  });
  stmt.finalize();
});

app.get('/attendance', (req, res) => {
  db.all('SELECT id, nama, tanggal, jam, foto_base64 as foto, created_at FROM attendance ORDER BY id DESC LIMIT 50', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Gagal membaca data.' });
    }
    res.json({ status: 'success', data: rows });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
