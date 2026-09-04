# TreadScan

Ứng dụng web đếm sản lượng bằng cách quét mã QR trên điện thoại, rồi xuất ra
Excel. Dữ liệu nằm hoàn toàn trong trình duyệt của máy, không gửi đi đâu.

**Trang chạy:** https://votienkhiem.github.io/TreadScan/

## Dùng thế nào

1. Mở link trên bằng Chrome (Android) hoặc Safari (iPhone), cho phép dùng camera.
2. Bấm **Bật camera**, đưa mã QR vào khung.
3. Nhập số lượng rồi bấm **Lưu**. Trùng mã và trùng xe thì có thể **Cộng dồn**.
4. Cuối ngày bấm **Xuất Excel** (hoặc **Gửi đi** để chia sẻ thẳng file).

> Camera chỉ chạy trên `https`, nên phải mở qua link GitHub Pages ở trên,
> không mở bằng cách nháy đúp vào file `index.html`.

Vào mục **Cài đặt tách mã** để chỉnh dấu phân cách và vị trí đoạn chứa mã sản
phẩm / số xe, nếu chuỗi QR có định dạng khác.

## Chạy trên máy

```bash
npm install
npm run dev       # mở http://localhost:4173
npm run build     # dựng vào thư mục dist/
npm run preview   # xem thử bản đã dựng
```

`npm run dev` mở cổng trên `0.0.0.0`, nên có thể mở bằng điện thoại cùng mạng
wifi qua địa chỉ IP của máy tính. Nhưng camera cần `https`, nên muốn thử camera
trên điện thoại thì dùng luôn bản trên GitHub Pages.

## Đưa lên mạng

Đẩy lên nhánh `main` là xong — [workflow](.github/workflows/deploy.yml) sẽ tự
dựng và đăng lên GitHub Pages. Xem tiến trình ở tab **Actions** của repo.

Lần đầu cần bật một lần: **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

## Cấu trúc

| Thư mục / tệp | Nội dung |
| --- | --- |
| `index.html` | Toàn bộ khung giao diện |
| `js/scanner.js` | Camera và giải mã QR (BarcodeDetector, hoặc ZXing WASM trên iOS) |
| `js/store.js` | Dữ liệu phiên làm việc, lưu tạm vào localStorage |
| `js/entry.js` | Ô nhập số lượng cho mã vừa quét |
| `js/list.js` | Danh sách đã thu, sửa và xoá |
| `js/modal.js` | Hộp xác nhận trước khi xoá |
| `js/excel.js` | Xuất và chia sẻ file `.xlsx` |
| `js/settings.js` | Cài đặt tách chuỗi QR |
| `css/styles.css` | Toàn bộ giao diện |
