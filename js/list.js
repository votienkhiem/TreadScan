// Danh sách đã thu và các thao tác trên dữ liệu.

import { $, setStatus } from "./dom.js";
import { state, save, groupItems, vehicleNote } from "./store.js";
import { today, viDate, clock } from "./util.js";
import { confirmDialog } from "./modal.js";

// Nút "Sửa" mở form nhập; đăng ký từ ngoài để list không phụ thuộc entry.
let onEdit = null;
export function setEditHandler(fn) { onEdit = fn; }

export function render() {
  $("dayLabel").textContent = "Ngày " + viDate(state.date);
  $("countLabel").textContent = state.items.length;
  $("sumLabel").textContent = state.items.reduce((s, it) => s + it.qty, 0);

  const stale = state.date !== today();
  $("oldBanner").hidden = !stale || state.items.length === 0;
  if (stale && state.items.length) {
    $("oldBannerText").textContent =
      `Đang giữ ${state.items.length} mã của ngày ${viDate(state.date)}.`;
  }

  const list = $("list");
  list.innerHTML = "";
  // Gộp theo mã sản phẩm, mới nhất lên trên.
  // groupItems()
  //   .sort((a, b) => b.at - a.at)
  //   .forEach(g => list.appendChild(groupRow(g)));

  state.items
    .map((it, index) => ({ ...it, _index: index })) // giữ index gốc
    .sort((a, b) => b.at - a.at)
    .forEach(it => list.appendChild(itemRow(it)));

  $("empty").hidden = state.items.length > 0;
  $("exportBtn").disabled = state.items.length === 0;
  $("shareBtn").disabled = state.items.length === 0;
}

function actionButtons(index, label) {
  const acts = document.createElement("div");
  acts.className = "acts";

  const edit = document.createElement("button");
  edit.textContent = "Sửa";
  edit.setAttribute("aria-label", "Sửa " + label);
  edit.onclick = () => { if (onEdit) onEdit(index); };

  const del = document.createElement("button");
  del.textContent = "Xoá";
  del.className = "danger";
  del.setAttribute("aria-label", "Xoá " + label);
  del.onclick = () => removeItem(index, label);

  acts.append(edit, del);
  return acts;
}

function groupRow(g) {
  const li = document.createElement("li");
  const single = g.vehicles.length === 1;

  const row = document.createElement("div");
  row.className = "row";

  const code = document.createElement("span");
  code.className = "code";
  code.textContent = g.code;
  code.title = g.raw || g.code;

  const qty = document.createElement("span");
  qty.className = "qty";
  qty.textContent = g.qty;

  const noteMR = document.createElement("span");
  noteMR.className = "noteMR";
  noteMR.textContent = g.noteMR;
  noteMR.title = g.noteMR;

  const time = document.createElement("time");
  time.textContent = clock(g.at);

  row.append(code, qty, noteMR, time);
  // Một xe thì sửa/xoá ngay trên dòng; nhiều xe thì mỗi xe có nút riêng,
  // nếu không sẽ không rõ đang sửa xe nào.
  if (single) row.append(actionButtons(g.vehicles[0].index, g.code));
  li.append(row);

  // note xuống 1 dòng
  if (g.noteMR) {
    li.append(noteMR);
  }

  const note = vehicleNote(g);
  if (note) {
    const p = document.createElement("p");
    p.className = "veh-note";
    p.textContent = note;
    li.append(p);
  }

  if (!single) {
    const sub = document.createElement("ul");
    sub.className = "veh";
    g.vehicles.forEach(v => {
      const vli = document.createElement("li");

      const xe = document.createElement("span");
      xe.className = "xe";
      xe.textContent = v.xe || "(không có số xe)";

      const vq = document.createElement("span");
      vq.className = "qty";
      vq.textContent = v.qty;

      const vNote = document.createElement("span");
      vNote.className = "noteMR";
      vNote.textContent = v.noteMR;

      const vt = document.createElement("time");
      vt.textContent = clock(v.at);

      vli.append(xe, vq, vt, actionButtons(v.index, `${g.code} xe ${v.xe || "?"}`));
      sub.append(vli);
    });
    li.append(sub);
  }

  return li;
}

function itemRow(it, index) {
  const li = document.createElement("li");

  const row = document.createElement("div");
  row.className = "row";

  const code = document.createElement("span");
  code.className = "code";
  code.textContent = it.code;

  const qty = document.createElement("span");
  qty.className = "qty";
  qty.textContent = it.qty;

  const xe = document.createElement("span");
  xe.className = "xe";
  xe.textContent = it.xe || "";

  // nút sửa / xoá
  const actions = actionButtons(it._index, it.code);

  row.append(code, qty, xe, actions);
  li.append(row);

  // ghi chú
  if (it.noteMR) {
    const note = document.createElement("div");
    note.className = "noteMR";
    note.textContent = it.noteMR;
    li.append(note);
  }

  return li;
}

export async function removeItem(index, code) {
  // Giữ chính dòng cần xoá chứ không giữ vị trí: hộp xác nhận chờ người dùng
  // trả lời, trong lúc đó danh sách có thể đã vẽ lại và số thứ tự lệch đi.
  const item = state.items[index];
  if (!item) return;

  const okToDelete = await confirmDialog({
    title: "Xoá dòng này?",
    message: `${code} · ${item.qty} cái. Xoá rồi không lấy lại được.`,
    confirmText: "Xoá"
  });
  if (!okToDelete) return;

  const at = state.items.indexOf(item);
  if (at < 0) return;   // dòng đã biến mất trong lúc hỏi
  state.items.splice(at, 1);
  save();
  render();
  setStatus(`Đã xoá ${code}.`);
}

export async function clearAll() {
  if (!state.items.length) { startNewDay(); return; }
  const total = state.items.reduce((s, it) => s + it.qty, 0);
  const okToClear = await confirmDialog({
    title: "Xoá toàn bộ dữ liệu?",
    message: `Đang có ${state.items.length} mã · ${total} cái. ` +
      "Xoá rồi không khôi phục được — nhớ xuất Excel trước.",
    confirmText: "Xoá hết"
  });
  if (!okToClear) return;
  startNewDay();
  setStatus("Đã xoá sạch. Bắt đầu ngày mới.");
}

export function startNewDay() {
  state.items = [];
  state.date = today();
  save();
  render();
}
