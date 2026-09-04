// Cài đặt tách mã từ chuỗi QR.

import { $ } from "./dom.js";
import { state, save, parseScan } from "./store.js";

export function syncSettingsUI() {
  $("delimInput").value = state.settings.delimiter;
  $("fieldInput").value = state.settings.fieldIndex;
  $("xeFieldInput").value = state.settings.vehicleIndex;
  updatePreview();
}

export function readSettings() {
  state.settings.delimiter = $("delimInput").value;
  const n = parseInt($("fieldInput").value, 10);
  state.settings.fieldIndex = Number.isFinite(n) && n > 0 ? n : 1;
  // Để trống ô số xe nghĩa là chuỗi QR không có đoạn này.
  const v = parseInt($("xeFieldInput").value, 10);
  state.settings.vehicleIndex = Number.isFinite(v) && v > 0 ? v : 0;
  save();
  updatePreview();
}

export function updatePreview() {
  const sample = $("testInput").value.trim();
  const box = $("preview");
  if (!sample) {
    box.className = "preview";
    box.textContent = "Dán một chuỗi QR vào ô trên để xem mã được tách ra.";
    return;
  }
  const { code, xe } = parseScan(sample);
  if (code) {
    box.className = "preview";
    box.innerHTML = 'Mã sản phẩm: <b class="a"></b><br />Số xe: <b class="b"></b>';
    box.querySelector("b.a").textContent = code;
    box.querySelector("b.b").textContent = xe || "(không tách được)";
  } else {
    box.className = "preview bad";
    box.textContent = "Không tách được. Kiểm tra lại dấu phân cách và vị trí đoạn.";
  }
}
