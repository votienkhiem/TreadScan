// Truy cập DOM và các tiện ích hiển thị dùng chung.

export const $ = id => document.getElementById(id);

export function bringIntoView(el) {
  if (!el || !el.scrollIntoView) return;
  try { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  catch (_) { el.scrollIntoView(); }
}

export function setStatus(text, kind = "") {
  $("status").textContent = text;
  $("status").className = "status" + (kind ? " " + kind : "");
}
