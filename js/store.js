// Trạng thái phiên làm việc và lưu tạm vào localStorage.

import { setStatus } from "./dom.js";
import { today } from "./util.js";

const STORE_KEY = "thu-san-luong-v1";

// vehicleIndex mặc định nằm ngay sau fieldIndex: chuỗi QR mẫu
// "2205000325394,TR710029B-01,B2301,2026-09-03" có mã sản phẩm ở đoạn 2
// và số xe ở đoạn 3.
export const DEFAULTS = { delimiter: ",", fieldIndex: 2, vehicleIndex: 3 };

// state được giữ nguyên tham chiếu (không gán lại) để các module khác
// import một lần là dùng được suốt.
export const state = { date: today(), items: [], settings: { ...DEFAULTS } };

export function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (_) {
    setStatus("Không lưu tạm được. Hãy xuất Excel sớm.", "error");
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && Array.isArray(saved.items)) {
      Object.assign(state, {
        date: saved.date || today(),
        // Dữ liệu lưu trước khi có số xe thì coi như xe rỗng.
        items: saved.items.map(it => ({ xe: "", ...it })),
        settings: { ...DEFAULTS, ...(saved.settings || {}) }
      });
    }
  } catch (_) { /* dữ liệu hỏng thì bỏ, bắt đầu lại */ }
}

function fieldAt(parts, index) {
  const i = Number(index) - 1;
  if (!(i >= 0) || i >= parts.length) return "";
  return String(parts[i]).trim();
}

// Tách cả mã sản phẩm lẫn số xe từ một chuỗi QR.
export function parseScan(raw) {
  const text = String(raw).trim();
  const { delimiter, fieldIndex, vehicleIndex } = state.settings;
  if (!delimiter) return { code: text || null, xe: "" };
  const parts = text.split(delimiter);
  return { code: fieldAt(parts, fieldIndex) || null, xe: fieldAt(parts, vehicleIndex) };
}

// Một dòng là duy nhất theo cặp (mã sản phẩm + số xe): cùng mã nhưng khác xe
// vẫn được nhận, chỉ gộp lại khi hiển thị.
export function findItem(code, xe) {
  const want = xe || "";
  return state.items.find(it => it.code === code && (it.xe || "") === want) || null;
}

// Gộp theo mã sản phẩm để hiện trên UI và Excel. index giữ vị trí gốc trong
// state.items để sửa/xoá đúng dòng.
export function groupItems() {
  const map = new Map();
  state.items.forEach((it, index) => {
    const g = map.get(it.code) ||
      { code: it.code, qty: 0, at: 0, raw: it.raw || "", vehicles: [] };
    g.qty += it.qty;
    g.at = Math.max(g.at, it.at);
    g.vehicles.push({ xe: it.xe || "", qty: it.qty, at: it.at, index });
    map.set(it.code, g);
  });
  const groups = [...map.values()];
  groups.forEach(g => g.vehicles.sort((a, b) => a.xe.localeCompare(b.xe, "en")));
  return groups;
}

// "B2301" khi một xe, "2 xe: B2301 (10), B2302 (5)" khi nhiều xe.
export function vehicleNote(group) {
  const vs = group.vehicles;
  if (vs.length === 1) return vs[0].xe;
  return `${vs.length} xe: ` + vs.map(v => `${v.xe || "?"} (${v.qty})`).join(", ");
}
