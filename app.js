const video = document.getElementById('video');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnCapture = document.getElementById('btnCapture');
const btnSubmit = document.getElementById('btnSubmit');
const photoPreview = document.getElementById('photoPreview');
const captureCanvas = document.getElementById('captureCanvas');
const namaInput = document.getElementById('nama');
const tanggalLabel = document.getElementById('tanggal');
const jamLabel = document.getElementById('jam');
const attendanceRows = document.getElementById('attendanceRows');
const toast = document.getElementById('toast');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
const STORAGE_KEY = 'absensi-wajah-log';
let stream = null;
let capturedPhoto = '';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function updateDateTime() {
  const now = new Date();
  tanggalLabel.textContent = now.toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  jamLabel.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    btnCapture.disabled = false;
    btnStop.disabled = false;
    btnStart.textContent = 'Kamera Aktif';
    btnStart.classList.add('active');
    showToast('Kamera berhasil diaktifkan');
  } catch (error) {
    console.error(error);
    showToast('Gagal mengaktifkan kamera. Izinkan akses kamera.');
  }
}

function stopCamera() {
  if (!stream) {
    showToast('Kamera belum aktif.');
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  btnCapture.disabled = true;
  btnStop.disabled = true;
  btnSubmit.disabled = true;
  btnStart.textContent = 'Aktifkan Kamera';
  btnStart.classList.remove('active');
  showToast('Kamera dimatikan');
}

function capturePhoto() {
  if (!stream) {
    showToast('Aktifkan kamera terlebih dahulu.');
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(video, 0, 0, width, height);

  capturedPhoto = captureCanvas.toDataURL('image/jpeg', 0.85);
  photoPreview.src = capturedPhoto;
  btnSubmit.disabled = false;
  showToast('Foto berhasil diambil');
}

function saveAttendanceRecord(record) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  stored.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.slice(0, 20)));
  renderAttendanceLog();
}

function renderAttendanceLog() {
  const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  attendanceRows.innerHTML = '';

  if (!records.length) {
    attendanceRows.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada data absensi</td></tr>';
    return;
  }

  records.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.nama}</td>
      <td>${item.tanggal}</td>
      <td>${item.jam}</td>
      <td><img src="${item.foto}" alt="Foto ${item.nama}" /></td>
    `;
    attendanceRows.appendChild(row);
  });
}

async function submitAttendance() {
  const nama = namaInput.value.trim();
  if (!nama) {
    showToast('Masukkan nama terlebih dahulu');
    return;
  }
  if (!capturedPhoto) {
    showToast('Ambil foto wajah terlebih dahulu');
    return;
  }

  const now = new Date();
  const tanggal = now.toLocaleDateString('id-ID');
  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const payload = {
    nama,
    tanggal,
    jam,
    foto: capturedPhoto
  };

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });

    const record = { nama, tanggal, jam, foto: capturedPhoto };
    saveAttendanceRecord(record);

    showToast('Absensi berhasil');
    btnSubmit.disabled = true;
    namaInput.value = '';
    capturedPhoto = '';
    photoPreview.src = '';
  } catch (error) {
    console.error(error);
    showToast('Gagal mengirim data. Cek URL Google Apps Script.');
  }
}

btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
btnCapture.addEventListener('click', capturePhoto);
btnSubmit.addEventListener('click', submitAttendance);

updateDateTime();
setInterval(updateDateTime, 1000);
renderAttendanceLog();
