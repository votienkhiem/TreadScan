// Hộp xác nhận trong trang, thay cho confirm() của trình duyệt.
//
// confirm() đặt nút OK ngay dưới ngón cái và không phân biệt được việc xoá
// với việc thường, nên rất dễ lỡ tay. Hộp này để "Không" làm nút mặc định
// (được focus sẵn, Esc hoặc chạm ra ngoài cũng là không), còn nút xoá tô đỏ
// và phải chạm đúng vào mới chạy.

import { $ } from "./dom.js";

let close = null;   // hàm đóng hộp đang mở, null khi không có hộp nào

export function isConfirmOpen() { return close !== null; }

export function confirmDialog({
  title = "Xác nhận",
  message = "",
  confirmText = "Xoá",
  cancelText = "Không"
} = {}) {
  // Một hộp tại một thời điểm: mở chồng lên nhau thì không rõ đang trả lời
  // câu nào, nên câu hỏi mới bị bỏ qua.
  if (close) return Promise.resolve(false);

  const backdrop = $("confirmBackdrop");
  const ok = $("confirmOk");
  const cancel = $("confirmCancel");
  const wasFocused = document.activeElement;

  $("confirmTitle").textContent = title;
  $("confirmText").textContent = message;
  ok.textContent = confirmText;
  cancel.textContent = cancelText;
  backdrop.hidden = false;
  document.body.style.overflow = "hidden";

  return new Promise(resolve => {
    const finish = answer => {
      backdrop.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey, true);
      ok.onclick = cancel.onclick = backdrop.onclick = null;
      close = null;
      // Trả con trỏ về chỗ cũ để người dùng bàn phím không bị mất vị trí.
      if (wasFocused && wasFocused.focus) {
        try { wasFocused.focus(); } catch (_) {}
      }
      resolve(answer);
    };

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); finish(false); return; }
      if (e.key !== "Tab") return;
      // Giữ tiêu điểm trong hộp: chỉ có hai nút nên đảo qua lại là đủ.
      e.preventDefault();
      (document.activeElement === cancel ? ok : cancel).focus();
    }

    ok.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
    // Chạm ra ngoài hộp là huỷ; chạm trong hộp thì không tính.
    backdrop.onclick = e => { if (e.target === backdrop) finish(false); };
    document.addEventListener("keydown", onKey, true);

    close = () => finish(false);
    cancel.focus();
  });
}
