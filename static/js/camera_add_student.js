const saveInfoBtn = document.getElementById("saveInfoBtn");
const startCaptureBtn = document.getElementById("startCaptureBtn");
const addStudentBtn = document.getElementById("addStudentBtn");
const video = document.getElementById("video");
const captureStatus = document.getElementById("captureStatus");
const progressBar = document.getElementById("progressBar");

function showNotification(message, type = "info") {
    const div = document.createElement("div");
    div.className = `notification ${type}`;
    div.innerText = message;
    document.body.appendChild(div);
    setTimeout(() => {
        div.classList.add("removing");
        setTimeout(() => div.remove(), 300);
    }, 4000);
}

let student_id = null;
let captured = 0;
const maxImages = 50;
let images = [];
let stream = null;

document.getElementById("studentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await fetch("/add_student", { method: "POST", body: fd });
  if (!res.ok) {
    showNotification("Failed to save student info", "error");
    return;
  }
  const j = await res.json();
  student_id = j.student_id;
  showNotification("Student info saved. Click Start Capture to open the camera.", "success");
  startCaptureBtn.disabled = false;
});

startCaptureBtn.addEventListener("click", async () => {
  startCaptureBtn.disabled = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    video.srcObject = stream;
    await video.play();
    captureImagesLoop();
  } catch (err) {
    showNotification("Camera access error: " + err.message, "error");
    startCaptureBtn.disabled = false;
  }
});

async function captureImagesLoop() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");

  while (captured < maxImages) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.9));
    images.push(blob);
    captured++;
    captureStatus.innerText = `Captured ${captured} / ${maxImages}`;
    progressBar.style.width = `${(captured / maxImages) * 100}%`;
    await new Promise(r => setTimeout(r, 300));
  }

  const form = new FormData();
  form.append("student_id", student_id);
  images.forEach((b, i) => form.append("images[]", b, `img_${i}.jpg`));
  const resp = await fetch("/upload_face", { method: "POST", body: form });
  if (resp.ok) {
    showNotification("Captured images uploaded", "success");
    addStudentBtn.disabled = false;
  } else {
    showNotification("Upload failed", "error");
  }

  // stop camera
  if (stream) stream.getTracks().forEach(t => t.stop());
}

addStudentBtn.addEventListener("click", () => {
  showNotification("Student record complete. Returning to dashboard.", "success");
  window.location.href = "/";
});
