# Frontend Absensi Wajah

Frontend ini direkomendasikan menggunakan React dan `react-webcam` untuk menangkap kamera.

## Contoh capture dan kirim scan

```jsx
import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

function ScanPage() {
  const webcamRef = useRef(null);

  const capture = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    const blob = await fetch(imageSrc).then((r) => r.blob());
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

export default ScanPage;
```

## Endpoint yang dibutuhkan

- `POST /api/students/register`: registrasi wajah siswa
- `POST /api/attendance/scan`: scan absensi dari foto kamera
- `GET /api/reports/daily`: laporan harian
- `GET /api/reports/monthly`: laporan bulanan

## Tips

- Pastikan aplikasi berjalan di HTTPS.
- Gunakan role-based menu: admin/guru/petugas.
- Gunakan pagination untuk laporan.
