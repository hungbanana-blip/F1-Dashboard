# TASK: Implement Race Summary – APEX F1 Dashboard

Workspace: `H:\AI\F1 Dashboard`

## 1. Mục tiêu

Bổ sung khu vực RACE SUMMARY vào trang Race Results.

Vị trí mong muốn:
- Sau khu vực thông tin Winner / Total Laps / Classified.
- Trước bảng FINAL CLASSIFICATION.
- Giữ nguyên giao diện và phong cách hiện tại của dự án.

## 2. Đọc code trước khi sửa

Đọc các file:
- `js/race-results.js`
- `css/race-results.css`
- `index.html`
- `js/api.js`

Xác minh:
- `renderResults()` hiện tại.
- Cấu trúc DOM của Race Results.
- Vị trí chính xác của `#raceResults`.
- CSS hiện có và các biến màu đang sử dụng.

Không tự giả định vị trí của `#raceResults` trong HTML.

## 3. Code cần tích hợp

Sử dụng đúng ba đoạn code được cung cấp trong yêu cầu:
1. Hàm `renderRaceSummary()`.
2. Phần tích hợp hàm này vào `renderResults()`.
3. CSS cho `.race-summary`.

Được phép điều chỉnh vị trí tích hợp để phù hợp với DOM thực tế, nhưng không được thay đổi logic tính toán nếu không có lý do kỹ thuật rõ ràng.

## 4. Quy tắc dữ liệu

Chỉ sử dụng dữ liệu thực tế từ API.

Không tự tạo:
- Fastest Lap.
- Safety Car / Virtual Safety Car.
- Pit stop.
- Starting position.
- Position gain.

Không có dữ liệu thì không hiển thị.

Không tạo API request mới nếu không cần thiết.

## 5. Phạm vi được phép sửa

Chỉ:
- `js/race-results.js`
- `css/race-results.css`

Không sửa:
- `index.html`
- `js/api.js`
- Các module khác.
- Dữ liệu API hoặc cấu hình dự án.

## 6. Kiểm tra sau khi sửa

1. Kiểm tra syntax JavaScript.
2. Kiểm tra CSS không gây ảnh hưởng đến bảng classification.
3. Kiểm tra Race Summary hiển thị khi có kết quả.
4. Kiểm tra podium khi thiếu thông tin driver.
5. Kiểm tra session không có kết quả.
6. Kiểm tra responsive ở màn hình nhỏ.
7. Kiểm tra dữ liệu null hoặc thiếu gap.
8. Xác nhận không có file ngoài phạm vi bị sửa.

## 7. Báo cáo

Báo cáo:
- File đã sửa.
- Các hàm đã thêm/thay đổi.
- Dòng code liên quan.
- Kết quả kiểm tra.
- Những dữ liệu không có trong API.

Không commit Git.
Không tự ý sửa thêm các lỗi khác.