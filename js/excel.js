// Xuất Excel và chia sẻ file.

import * as XLSX from "xlsx";
import { $, setStatus } from "./dom.js";
import { state, groupItems, vehicleNote } from "./store.js";
import { viDate, clock } from "./util.js";

export function buildWorkbook() {
  // Mỗi mã sản phẩm một dòng; số xe gộp vào cột ghi chú.
  // chỉ hiện thị 1 ghi chú
  // const rows = groupItems()
  //   .sort((a, b) => a.code.localeCompare(b.code, "en"))
  //   .map(g => ({
  //     "Mã bán thành phẩm": g.code,
  //     "Số lượng": g.qty,
  //     "Số xe": vehicleNote(g),
  //     "Ghi chú": g.noteMR || "" ,
  //     "Giờ quét": clock(g.at)
  //   }));

  // Mỗi mã sản phẩm 1 dòng, 1 ghi chú riêng
  const rows = state.items
  .sort((a, b) => a.code.localeCompare(b.code, "en"))
  .map(it => ({
    "Mã bán thành phẩm": it.code,
    "Số lượng": it.qty,
    "Số xe": it.xe || "",
    "Ghi chú": it.noteMR || "",
    "Giờ quét": clock(it.at)
  }));

  // const header = ["Mã sản phẩm", "Số lượng", "Số xe", "Giờ quét"];
  const header = ["Mã bán thành phẩm", "Số lượng", "Số xe", "Ghi chú", "Giờ quét"];
  const ws = XLSX.utils.json_to_sheet(rows, { header });
  // độ rộng mỗi côt
  ws["!cols"] = [{ wch: 20 }, { wch: 8 }, {wch: 8}, { wch: 40 }, { wch: 10 }];
  // in đậm tiêu header
  header.forEach((_, colIndex) => {
  const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
  if (!ws[cellAddress]) return;

  ws[cellAddress].s = {
    font: { bold: true }
  };
});

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, viDate(state.date).replace(/\//g, "-"));
  return wb;
}

export function fileName() {
  return `treadscan-${state.date}.xlsx`;
}

export function exportFile() {
  try {
    XLSX.writeFile(buildWorkbook(), fileName());
    setStatus(`Đã tạo ${fileName()}.`, "ok");
  } catch (err) {
    setStatus("Không tạo được file: " + err.message, "error");
  }
}

export async function shareFile() {
  try {
    const out = XLSX.write(buildWorkbook(), { bookType: "xlsx", type: "array" });
    const file = new File([out], fileName(), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName() });
      setStatus("Đã gửi file.", "ok");
    } else {
      exportFile();
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;   // người dùng tự huỷ
    exportFile();
  }
}
