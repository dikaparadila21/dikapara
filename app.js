const video = document.getElementById('video');
const snapshot = document.getElementById('snapshot');
const startCameraButton = document.getElementById('start-camera');
const captureButton = document.getElementById('capture-photo');
const submitButton = document.getElementById('submit-attendance');
const notification = document.getElementById('notification');
const statusPill = document.getElementById('status-pill');
const photoFrame = document.getElementById('photo-frame');
const nameInput = document.getElementById('name');

let currentPhoto = '';
let cameraStream = null;

const GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

function updateStatus(message, success = true) {
  notification.textContent = message;
  notification.style.color = success ? 'var(--text)' : 'var(--danger)';
  statusPill.textContent = success ? 'Ready' : 'Error';
  if (!success) {
    statusPill.style.color = 'var(--danger)';
  } else {
    statusPill.style.color = 'var(--accent)';
  }
}

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = cameraStream;
    captureButton.disabled = false;
    updateStatus('Kamera aktif. Siap untuk mengambil foto.');
  } catch (error) {
    updateStatus('Tidak dapat mengakses kamera. Periksa izin dan coba lagi.', false);
    console.error('Error startCamera:', error);
  }
}

function capturePhoto() {
  const context = snapshot.getContext('2d');
  snapshot.width = video.videoWidth;
  snapshot.height = video.videoHeight;
  context.drawImage(video, 0, 0, snapshot.width, snapshot.height);

  const dataUrl = snapshot.toDataURL('image/jpeg', 0.92);
  currentPhoto = dataUrl;

  snapshot.style.display = 'block';
  video.style.display = 'none';
  photoFrame.innerHTML = `<img src="${dataUrl}" alt="Foto Wajah" />`;
  submitButton.disabled = false;
  updateStatus('Foto berhasil diambil. Silakan klik Absen Masuk.');
}

function getFormattedDateTime() {
  const now = new Date();
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const date = now.toLocaleDateString('id-ID', options);
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { date, time };
}

async function submitAttendance() {
  const nama = nameInput.value.trim();

  if (!nama) {
    updateStatus('Isi nama mahasiswa terlebih dahulu.', false);
    return;
  }

  if (!currentPhoto) {
    updateStatus('Ambil foto wajah terlebih dahulu.', false);
    return;
  }

  const { date, time } = getFormattedDateTime();
  const payload = {
    nama,
    tanggal: date,
    jam: time,
    foto: currentPhoto
  };

  try {
    updateStatus('Mengirim data absensi...', true);
    submitButton.disabled = true;

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server error ${response.status}`);
    }

    const result = await response.json();
    if (result.success === false) {
      throw new Error(result.message || 'Gagal menyimpan data');
    }

    updateStatus('Absensi berhasil. Terima kasih!', true);
    submitButton.disabled = true;
    captureButton.disabled = false;
  } catch (error) {
    console.error('submitAttendance error:', error);
    updateStatus('Gagal mengirim data. Coba lagi.', false);
    submitButton.disabled = false;
  }
}

startCameraButton.addEventListener('click', startCamera);
captureButton.addEventListener('click', capturePhoto);
submitButton.addEventListener('click', submitAttendance);

nameInput.addEventListener('input', () => {
  if (nameInput.value.trim() && currentPhoto) {
    submitButton.disabled = false;
  }
});
