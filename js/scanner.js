// Camera và bộ giải mã QR.
//
// Dùng BarcodeDetector có sẵn của trình duyệt khi có (Chrome Android), nếu
// không thì tải ZXing-C++ bản WebAssembly (Safari iOS không có API này).

// The WASM binary is only fetched on browsers without a native
// BarcodeDetector; Vite emits it as a separate asset either way.
import zxingWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { $, setStatus } from "./dom.js";
import { sleep } from "./util.js";
import { primeAudio } from "./audio.js";

// Ứng dụng đăng ký hàm xử lý khi quét được, tránh phụ thuộc vòng tròn giữa
// scanner và form nhập.
let onDetect = null;
export function setScanHandler(fn) { onDetect = fn; }

export function isScanning() { return running; }

// Khung ngắm thu nhỏ lại khi đang nhập số lượng: camera vẫn chạy và nút
// "Tắt" vẫn trong tầm mắt, không phải cuộn lên tìm.
export function setViewfinderCompact(on) {
  $("reader").classList.toggle("is-compact", !!on);
}

let detector = null;

let detectorKind = "";

let videoStream = null;

let scanLoopId = 0;

let running = false;

let scannerBusy = false;

// Ask for more pixels than we need: a QR filling a small part of the frame
// is the usual reason a scan takes several seconds. focusMode is requested
// both here and via applyConstraints, since browsers differ on which one
// they honour.
const cameraAttempts = [
  { video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 }, height: { ideal: 1080 },
      frameRate: { ideal: 30 },
      advanced: [{ focusMode: "continuous" }]
    } },
  { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
  { video: { facingMode: "environment" } },
  { video: true }
];

// Native BarcodeDetector where it exists (Android Chrome), ZXing-C++ compiled
// to WASM everywhere else (iOS Safari ships no BarcodeDetector). Both speak
// the same detect() interface, so the scan loop below does not care which.
async function getDetector() {
  if (detector) return detector;

  if ("BarcodeDetector" in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes("qr_code")) {
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        detectorKind = "native";
        return detector;
      }
    } catch (_) { /* fall through to the WASM build */ }
  }

  const mod = await import("barcode-detector/ponyfill");
  mod.setZXingModuleOverrides({
    locateFile: (path, prefix) =>
      path.endsWith(".wasm") ? zxingWasmUrl : prefix + path
  });
  detector = new mod.BarcodeDetector({ formats: ["qr_code"] });
  detectorKind = "wasm";
  return detector;
}

// Continuous autofocus is the single biggest factor in how long a scan takes;
// without it the camera can sit on a blurred frame indefinitely.

// Continuous autofocus is the single biggest factor in how long a scan takes;
// without it the camera can sit on a blurred frame indefinitely.
function applyFocus(stream) {
  const track = stream.getVideoTracks()[0];
  if (!track || !track.applyConstraints) return;
  let caps = {};
  try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (_) {}
  const advanced = [];
  if (caps.focusMode && caps.focusMode.includes("continuous")) {
    advanced.push({ focusMode: "continuous" });
  }
  if (advanced.length) {
    track.applyConstraints({ advanced }).catch(() => {});
  }
}

// We own the stream and the <video>, so shutting down is just stopping the
// tracks. Bumping scanLoopId retires any loop still in flight.

// We own the stream and the <video>, so shutting down is just stopping the
// tracks. Bumping scanLoopId retires any loop still in flight.
function releaseCamera() {
  running = false;
  scanLoopId++;
  if (videoStream) {
    videoStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
    videoStream = null;
  }
  const video = $("preview");
  if (video) {
    video.srcObject = null;
    try { video.pause(); } catch (_) {}
    video.hidden = true;
  }
  $("readerHint").hidden = false;
  $("reader").classList.remove("is-live");
}

// One decode per rendered frame via requestVideoFrameCallback, so we never
// decode the same frame twice or work on a frame the camera has replaced.

// One decode per rendered frame via requestVideoFrameCallback, so we never
// decode the same frame twice or work on a frame the camera has replaced.
function startScanLoop(video) {
  const myId = ++scanLoopId;
  const useRvfc = typeof video.requestVideoFrameCallback === "function";

  const schedule = () => {
    if (myId !== scanLoopId) return;
    if (useRvfc) video.requestVideoFrameCallback(tick);
    else setTimeout(tick, 100);
  };

  const tick = async () => {
    if (myId !== scanLoopId) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const codes = await detector.detect(video);
        if (myId === scanLoopId && codes.length) {
          if (onDetect) onDetect(codes[0].rawValue);
        }
      } catch (_) { /* a bad frame is not worth stopping the loop for */ }
    }
    schedule();
  };

  schedule();
}

export function updateMobileGuide() {
  const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  $("mobileGuide").hidden = !isPhone;
}

export async function startCamera() {
  if (scannerBusy || running) return;
  scannerBusy = true;
  primeAudio();
  $("startBtn").disabled = true;
  setStatus("Đang mở camera…");
  updateMobileGuide();

  const video = $("preview");
  let lastErr = null;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Trình duyệt này không hỗ trợ camera.");
    }

    await getDetector();

    for (let i = 0; i < cameraAttempts.length; i++) {
      releaseCamera();
      // Let the hardware settle before re-opening; iOS Safari rejects an
      // immediate re-acquire with NotReadableError.
      if (i > 0) await sleep(300);
      try {
        videoStream = await navigator.mediaDevices.getUserMedia(cameraAttempts[i]);
        break;
      } catch (err) {
        lastErr = err;
        videoStream = null;
      }
    }
    if (!videoStream) throw lastErr || new Error("Không mở được camera.");

    applyFocus(videoStream);
    video.srcObject = videoStream;
    video.hidden = false;
    $("readerHint").hidden = true;
    $("reader").classList.add("is-live");
    await video.play();

    running = true;
    $("stopBtn").disabled = false;
    setStatus("Đưa mã QR vào khung.");
    startScanLoop(video);
  } catch (err) {
    releaseCamera();
    $("startBtn").disabled = false;
    setStatus(cameraError(err), "error");
  } finally {
    scannerBusy = false;
    if (!running) {
      $("stopBtn").disabled = true;
    }
  }
}

export async function stopCamera() {
  if (scannerBusy) return;
  if (!running) return;
  scannerBusy = true;
  try {
    releaseCamera();
  } finally {
    running = false;
    scannerBusy = false;
    $("startBtn").disabled = false;
    $("stopBtn").disabled = true;
  }
}

function cameraError(err) {
  const name = (err && err.name) || "";
  const msg = typeof err === "string" ? err : (err && err.message) || "";
  if (name === "NotAllowedError" || /permission|denied/i.test(msg))
    return "Chưa được cấp quyền camera. Cho phép trong trình duyệt rồi bật lại.";
  if (name === "NotFoundError" || /no camera/i.test(msg))
    return "Không tìm thấy camera trên máy này.";
  if (name === "NotReadableError" || /could not start video source/i.test(msg))
    return "Camera đang bị ứng dụng khác chiếm. Đóng app đang dùng camera rồi bật lại.";
  if (name === "OverconstrainedError")
    return "Camera không hỗ trợ cấu hình này. Thử lại hoặc dùng nhập tay.";
  if (location.protocol !== "https:" && location.hostname !== "localhost")
    return "Camera cần https. Hãy mở trang qua GitHub Pages.";
  return "Không mở được camera. " + msg;
}
