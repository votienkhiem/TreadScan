// Form nhập số lượng cho mã vừa quét (hoặc nhập tay).

import { $, bringIntoView, setStatus } from "./dom.js";
import { state, save, parseScan, findItem } from "./store.js";
import { today, clock } from "./util.js";
import { buzz, primeAudio } from "./audio.js";
import { isScanning, setViewfinderCompact } from "./scanner.js";
import { render } from "./list.js";
import { isConfirmOpen } from "./modal.js";

let editIndex = -1;      // >= 0 khi đang sửa một dòng có sẵn
let manualMode = false;
let lastReject = { text: "", at: 0 };

// Camera chạy suốt, nên một mã nằm yên trong khung sẽ được giải mã lại 30
// lần mỗi giây. Khoá mã vừa nhận cho tới khi nó rời khỏi khung: mỗi lần còn
// thấy lại thì gia hạn khoá, ngưng thấy đủ lâu mới cho quét lại.
const RESCAN_MS = 1500;
let blocked = { text: "", at: 0 };

// Số xe thường giữ nguyên suốt một chuyến, nên nhớ lại để điền sẵn khi
// chuỗi QR không có đoạn số xe.
let lastVehicle = "";

export function isEntryOpen() { return !$("entry").hidden; }

export function pendingCode() {
  if (!isEntryOpen()) return "";
  return manualMode ? $("manualCode").value.trim() : $("entryCode").textContent;
}

export function onScan(text) {
  // Đang hỏi xác nhận thì để yên: mở form nhập nấp sau hộp xác nhận sẽ khiến
  // người dùng trả lời nhầm câu hỏi. Không khoá mã, nên đóng hộp là quét lại
  // được ngay.
  if (isConfirmOpen()) return;

  const now = Date.now();

  // Mã vừa nhận vẫn còn trong khung.
  if (blocked.text === text) {
    if (now - blocked.at < RESCAN_MS) { blocked.at = now; return; }
    blocked = { text: "", at: 0 };
  }

  // Đang nhập dở thì bỏ qua, nhưng không khoá mã khác: đóng form xong là
  // quét được ngay.
  if (isEntryOpen()) return;

  const { code, xe } = parseScan(text);
  if (!code) {
    // The loop decodes every frame, so an unreadable code would otherwise
    // re-buzz 30 times a second while it sits in view.
    const now = Date.now();
    if (lastReject.text === text && now - lastReject.at < 2000) return;
    lastReject = { text, at: now };
    setStatus("Không tách được mã từ chuỗi vừa quét. Kiểm tra phần cài đặt.", "error");
    buzz(false);
    return;
  }
  lastReject = { text: "", at: 0 };
  blocked = { text, at: now };

  buzz(true);
  openScanned(code, xe, text);
}

function fillEntry({ title, code, xe, raw, index, existing }) {
  editIndex = index;
  $("entryTitle").textContent = title;
  $("entryCode").dataset.raw = raw || "";
  $("xeInput").value = xe || "";
  $("noteInput").value = "";

  if (existing) {
    $("entryDupe").hidden = false;
    $("entryDupe").textContent = existing.xe
      ? `Mã này với xe ${existing.xe} đã nhập ${existing.qty} lúc ${clock(existing.at)}.`
      : `Mã này đã nhập ${existing.qty} lúc ${clock(existing.at)}.`;
    $("qtyInput").value = existing.qty;
    $("noteInput").value = existing.noteMR || "";
    $("addBtn").hidden = index >= 0;   // sửa thì không cần cộng dồn
  } else {
    $("entryDupe").hidden = true;
    $("qtyInput").value = "";
    $("addBtn").hidden = true;
  }

  $("entry").hidden = false;
  setViewfinderCompact(true);
  setStatus("");
  focusQty();
}

export function openScanned(code, xe, raw) {
  manualMode = false;
  $("manualCode").hidden = true;
  $("entryCode").hidden = false;
  $("entryCode").textContent = code;
  // lấy mã máy TD1 TD2 từ QR gán lên textbox
  // const vehicle = xe || lastVehicle; 
  // để số xe rỗng và nhập số xe
  const vehicle = ""; 
  fillEntry({
    title: "Mã vừa quét", code, xe: vehicle, raw, index: -1,
    existing: findItem(code, vehicle)
  });
}

// Nút "Sửa" trên danh sách: mở đúng dòng đang có trong state.items.
export function openExisting(index) {
  const it = state.items[index];
  if (!it) return;
  manualMode = false;
  $("manualCode").hidden = true;
  $("entryCode").hidden = false;
  $("entryCode").textContent = it.code;
  fillEntry({
    title: "Sửa dòng đã nhập", code: it.code, xe: it.xe || "",
    raw: it.raw, index, existing: it
  });
}

export function openManual() {
  primeAudio();
  editIndex = -1;
  manualMode = true;

  $("entryTitle").textContent = "Nhập tay";
  $("entryCode").hidden = true;
  $("entryDupe").hidden = true;
  $("addBtn").hidden = true;
  $("manualCode").hidden = false;
  $("manualCode").value = "";
  $("xeInput").value = "";
  $("qtyInput").value = "";
  $("noteInput").value = "";
  $("entry").hidden = false;
  setViewfinderCompact(true);
  bringIntoView($("entry"));
  setTimeout(() => $("manualCode").focus(), 140);
}

export function focusQty() {
  const input = $("qtyInput");
  bringIntoView($("entry"));
  // Chờ một nhịp để bàn phím số bật đúng trên iOS, và để cuộn xong trước
  // khi bàn phím đẩy layout lên.
  setTimeout(() => { input.focus(); input.select(); }, 140);
}

export function closeEntry() {
  $("entry").hidden = true;
  editIndex = -1;
  manualMode = false;
  $("qtyInput").value = "";
  setViewfinderCompact(false);
  if (isScanning()) {
    setStatus("Đưa mã QR vào khung.");
  } else {
    setStatus("Bấm bật camera để quét tiếp.");
    // Đưa nút bật camera trở lại tầm mắt, khỏi phải cuộn lên.
    bringIntoView($("camControls"));
  }
}

// Trả về true khi đã ghi xong, để nơi gọi biết có nên đi tiếp hay không.
export function commit(mode) {
  const qty = parseInt($("qtyInput").value, 10);
  const noteMR = $("noteInput").value.trim() ; 
  if (!Number.isFinite(qty) || qty < 0) {
    setStatus("Số lượng chưa hợp lệ.", "error");
    focusQty();
    return false;
  }

  const code = manualMode
    ? $("manualCode").value.trim().toUpperCase()
    : $("entryCode").textContent;

  if (!code) {
    setStatus("Chưa có mã sản phẩm.", "error");
    $("manualCode").focus();
    return false;
  }

  const xe = $("xeInput").value.trim().toUpperCase();
  lastVehicle = xe;

  if (editIndex >= 0) {
    const it = state.items[editIndex];
    it.code = code;
    it.xe = xe;
    it.qty = qty;
    it.noteMR = noteMR;
    it.at = Date.now();
  } else {
    // Trùng mã nhưng khác xe là một dòng mới; chỉ cộng dồn khi trùng cả cặp.
    const existing = findItem(code, xe);
    if (existing) {
      existing.qty = mode === "add" ? existing.qty + qty : qty;
      existing.at = Date.now();
      existing.noteMR = noteMR;
      if ($("entryCode").dataset.raw) existing.raw = $("entryCode").dataset.raw;
    } else {
      state.items.push({
        code,
        xe,
        qty,
        noteMR,
        at: Date.now(),
        raw: $("entryCode").dataset.raw || ""
      });
    }
  }

  // Phiên đang mở thuộc về ngày hôm nay kể từ lần ghi đầu tiên.
  if (state.items.length === 1) state.date = today();

  save();
  render();
  closeEntry();
  setStatus(`Đã lưu ${code}${xe ? " · xe " + xe : ""} = ${qty}.`, "ok");
  return true;
}
