const video = document.getElementById('video');
const btnStart = document.getElementById('btnStart');
const btnCapture = document.getElementById('btnCapture');
const btnSubmit = document.getElementById('btnSubmit');
const photoPreview = document.getElementById('photoPreview');
const captureCanvas = document.getElementById('captureCanvas');
const namaInput = document.getElementById('nama');
const tanggalLabel = document.getElementById('tanggal');
const jamLabel = document.getElementById('jam');
const toast = document.getElementById('toast');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
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
    btnStart.textContent = 'Kamera Aktif';
    btnStart.classList.add('active');
    showToast('Kamera berhasil diaktifkan');
  } catch (error) {
    console.error(error);
    showToast('Gagal mengaktifkan kamera. Izinkan akses kamera.');
  }
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
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok && result.status === 'success') {
      showToast('Absensi berhasil');
      btnSubmit.disabled = true;
      namaInput.value = '';
      capturedPhoto = '';
      photoPreview.src = '';
    } else {
      throw new Error(result.message || 'Gagal menyimpan data');
    }
  } catch (error) {
    console.error(error);
    showToast('Gagal mengirim data. Cek URL Google Apps Script.');
  }
}

btnStart.addEventListener('click', startCamera);
btnCapture.addEventListener('click', capturePhoto);
btnSubmit.addEventListener('click', submitAttendance);

updateDateTime();
setInterval(updateDateTime, 1000);
