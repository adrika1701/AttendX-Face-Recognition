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

const startMarkBtn = document.getElementById("startMarkBtn");
const stopMarkBtn = document.getElementById("stopMarkBtn");
const markVideo = document.getElementById("markVideo");
const markStatus = document.getElementById("markStatus");
const recognizedList = document.getElementById("recognizedList");

let markStream = null;
let markInterval = null;
let recognizedIds = new Set();
let frameBuffer = []; // Store recent frames for liveness detection
const FRAME_BUFFER_SIZE = 5;

startMarkBtn.addEventListener("click", async () => {
  startMarkBtn.disabled = true;
  stopMarkBtn.disabled = false;
  recognizedIds.clear();
  frameBuffer = [];
  try {
    markStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    markVideo.srcObject = markStream;
    await markVideo.play();
    markStatus.innerText = "Scanning... Please stay still for 2 seconds";
    
    // Collect frames continuously for liveness detection
    markInterval = setInterval(captureAndRecognize, 2000);
  } catch (err) {
    showNotification("Camera error: " + err.message, "error");
    startMarkBtn.disabled = false;
    stopMarkBtn.disabled = true;
  }
});

stopMarkBtn.addEventListener("click", () => {
  if (markInterval) clearInterval(markInterval);
  if (markStream) markStream.getTracks().forEach(t => t.stop());
  startMarkBtn.disabled = false;
  stopMarkBtn.disabled = true;
  markStatus.innerText = "Stopped";
});

async function captureAndRecognize() {
  const canvas = document.createElement("canvas");
  canvas.width = markVideo.videoWidth || 640;
  canvas.height = markVideo.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  
  // Capture multiple frames for liveness detection
  const frames = [];
  const frameDelay = 150; // 150ms between frames
  
  markStatus.innerText = "Capturing frames for liveness check...";
  
  for (let i = 0; i < 5; i++) {
    ctx.drawImage(markVideo, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
    frames.push(blob);
    
    if (i < 4) {
      // Wait between frames
      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
  }
  
  markStatus.innerText = "Analyzing liveness...";
  
  const fd = new FormData();
  fd.append("image", frames[0], "snap.jpg");
  
  // Add additional frames for liveness detection
  for (let i = 1; i < frames.length; i++) {
    fd.append(`frame${i-1}`, frames[i], `frame${i-1}.jpg`);
  }
  
  try {
    const res = await fetch("/recognize_face", { method: "POST", body: fd });
    const j = await res.json();
    
    if (j.recognized) {
      const livenessInfo = j.liveness ? ` [Liveness: ${j.liveness.is_live ? '✓' : '✗'}]` : '';
      markStatus.innerText = `Recognized: ${j.name} (conf ${Math.round(j.confidence*100)}%)${livenessInfo}`;
      
      if (j.status === "check_in" && !recognizedIds.has(j.student_id)) {
        recognizedIds.add(j.student_id);
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-success";
        const lateTag = j.is_late ? ' <span class="badge bg-warning">Late</span>' : '';
        li.innerHTML = `<strong>${j.name}</strong> — ${new Date().toLocaleTimeString()}${lateTag}`;
        recognizedList.prepend(li);
        showNotification(`✓ Attendance marked for ${j.name}`, "success");
      } else if (j.status === "check_out") {
        showNotification(`✓ Check-out recorded for ${j.name}`, "success");
      } else if (j.status === "already_marked") {
        showNotification(`ℹ ${j.name} already marked attendance today`, "info");
      }
    } else {
      if (j.liveness && !j.liveness.is_live) {
        markStatus.innerText = `⚠ Liveness check failed: ${j.liveness.reason}`;
        showNotification("Please be physically present. Photos/videos are not allowed.", "error");
      } else if (j.error) {
        markStatus.innerText = `Not recognized: ${j.error}`;
        if (j.error.includes("physically present")) {
          showNotification("Anti-spoofing: " + j.error, "error");
        }
      } else {
        markStatus.innerText = `Not recognized`;
      }
    }
  } catch (err) {
    console.error(err);
    markStatus.innerText = "Error processing request";
    showNotification("Network error", "error");
  }
}
