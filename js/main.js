// Điểm khởi động: gắn sự kiện và nạp dữ liệu đã lưu.

import { $, setStatus } from "./dom.js";
import { load, state } from "./store.js";
import {
  startCamera, stopCamera, isScanning, updateMobileGuide, setScanHandler
} from "./scanner.js";
import {
  onScan, openExisting, openManual, closeEntry, commit, focusQty,
  isEntryOpen, pendingCode
} from "./entry.js";
import { render, clearAll, startNewDay, setEditHandler } from "./list.js";
import { exportFile, shareFile } from "./excel.js";
import { syncSettingsUI, readSettings, updatePreview } from "./settings.js";
import { confirmDialog } from "./modal.js";
import { viDate } from "./util.js";

setScanHandler(onScan);
setEditHandler(openExisting);

// Còn một mã đang nhập dở mà bật camera thì sẽ mất: hỏi lưu trước.
function guardUnsaved() {
  if (!isEntryOpen()) return true;
  const code = pendingCode() || "đang nhập";
  const saveIt = confirm(
    `Còn mã ${code} chưa lưu.\n\n` +
    "OK: lưu rồi bật camera.\n" +
    "Cancel: quay lại nhập tiếp."
  );
  if (!saveIt) { focusQty(); return false; }
  return commit("set");
}

$("startBtn").onclick = () => { if (guardUnsaved()) startCamera(); };
$("stopBtn").onclick = () => { stopCamera(); setStatus("Camera đã tắt."); };
$("manualBtn").onclick = openManual;
$("saveBtn").onclick = () => commit("set");
$("addBtn").onclick = () => commit("add");
$("cancelBtn").onclick = closeEntry;
$("newDayBtn").onclick = async () => {
  const ok = await confirmDialog({
    title: "Bắt đầu ngày mới?",
    message: `Sẽ xoá ${state.items.length} mã của ngày ${viDate(state.date)}. ` +
      "Nhớ xuất Excel trước nếu chưa xuất.",
    confirmText: "Xoá và bắt đầu"
  });
  if (!ok) return;
  startNewDay();
  setStatus("Đã bắt đầu ngày mới.");
};
$("clearBtn").onclick = clearAll;
$("exportBtn").onclick = exportFile;
$("shareBtn").onclick = shareFile;

$("qtyInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); commit("set"); }
});
$("manualCode").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); focusQty(); }
});

$("delimInput").addEventListener("input", readSettings);
$("fieldInput").addEventListener("input", readSettings);
$("testInput").addEventListener("input", updatePreview);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && isScanning()) { stopCamera(); setStatus("Camera tạm dừng."); }
});
window.addEventListener("pagehide", () => { if (isScanning()) stopCamera(); });

// Nút gửi đi chỉ hiện trên máy hỗ trợ chia sẻ file.
if (navigator.canShare) $("shareBtn").hidden = false;

updateMobileGuide();
load();
syncSettingsUI();
render();
