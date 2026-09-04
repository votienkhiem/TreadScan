// Ngày giờ và các tiện ích nhỏ.

export function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function viDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function clock(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Native BarcodeDetector where it exists (Android Chrome), ZXing-C++ compiled
// to WASM everywhere else (iOS Safari ships no BarcodeDetector). Both speak
// the same detect() interface, so the scan loop below does not care which.
