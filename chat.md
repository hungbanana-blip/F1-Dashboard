# TASK: REFACTOR RACE SCHEDULE – APEX F1

Trước khi thực hiện, đọc và tuân thủ `AGENT_WORKFLOW.md`.

Chỉ được chỉnh sửa:
- `js/schedule.js`
- `css/schedule.css` nếu thực sự cần thiết.

Không sửa API, Championship, Race Results hoặc module khác.

## PHASE 1 – INSPECT

1. Đọc toàn bộ `js/schedule.js` đúng một lần.
2. Đọc toàn bộ `css/schedule.css` đúng một lần.
3. Xác định các hàm liên quan:
   - Lấy dữ liệu race sessions.
   - Phân loại meeting: completed, live, upcoming.
   - Lọc meeting.
   - Sắp xếp meeting.
   - Render schedule card.
4. Xác định chính xác đoạn code đang đưa Last Race lên đầu.
5. Kiểm tra cách xác định ngày giờ và timezone hiện tại.

Không sửa code trong giai đoạn này.

## PHASE 2 – PLAN

Trước khi sửa, xác định cụ thể:

1. Hàm nào cần thay đổi.
2. Có cần tạo hoặc xóa hàm không.
3. CSS selector nào cần thay đổi.
4. Những logic nào phải giữ nguyên.

Không viết lại toàn bộ module nếu chỉ cần sửa một số hàm.

## PHASE 3 – IMPLEMENT

Thực hiện theo thứ tự:

**A. Loại bỏ Last Race**
- Không render meeting có trạng thái completed.
- Xóa phần hiển thị Last Race khỏi danh sách.
- Không ảnh hưởng dữ liệu API.

**B. Xác định Next Race**
- Lấy meeting gần nhất chưa kết thúc.
- Nếu có race đang diễn ra, giữ meeting đó ở đầu danh sách.
- Nếu không có race đang diễn ra, chọn upcoming meeting có thời gian bắt đầu gần nhất.
- Chỉ meeting đầu tiên được gắn badge NEXT RACE.

**C. Sắp xếp**
- Sắp xếp các meeting còn lại theo thời gian tăng dần.
- Không đảo thứ tự session bên trong từng meeting.
- Không hiển thị meeting đã kết thúc.

**D. Giữ nguyên nội dung**
Mỗi meeting phải giữ đầy đủ các session có trong dữ liệu:
- Practice 1
- Practice 2
- Practice 3
- Qualifying
- Race

Không tự tạo session nếu API không trả về dữ liệu.

**E. CSS**
- Giữ nguyên thiết kế card hiện tại.
- Chỉ đổi badge LAST RACE thành NEXT RACE nếu cần.
- Không thiết kế lại toàn bộ Schedule.

## PHASE 4 – VALIDATE

Sau khi sửa, kiểm tra lần lượt:

1. Không còn card LAST RACE.
2. Race gần nhất chưa kết thúc đứng đầu.
3. Nếu có race đang diễn ra, race đó được ưu tiên.
4. Meeting tiếp theo đứng thứ hai.
5. Các meeting được sắp xếp theo thời gian tăng dần.
6. Không có meeting đã kết thúc.
7. Các session của từng meeting không bị mất.
8. Ngày giờ và timezone giống logic trước khi sửa.
9. Không có lỗi JavaScript syntax.
10. Không có lỗi CSS hoặc selector bị trùng do thay đổi.

Nếu không thể xác minh một điều kiện bằng dữ liệu hiện có, phải ghi rõ, không được tự kết luận PASS.

## PHASE 5 – FINAL REPORT

Chỉ báo cáo sau khi hoàn thành:

| Hạng mục | Kết quả |
|---|---|
| Last Race removed | PASS/FAIL |
| Nearest Race first | PASS/FAIL |
| Live Race priority | PASS/FAIL |
| Upcoming sorted | PASS/FAIL |
| Completed races hidden | PASS/FAIL |
| Sessions preserved | PASS/FAIL |
| Timezone preserved | PASS/FAIL |
| JavaScript syntax | PASS/FAIL |

Báo cáo thêm:
- File đã sửa.
- Hàm đã thay đổi.
- CSS selector đã thay đổi.
- Lỗi còn tồn tại (nếu có).

## STRICT EXECUTION RULES

- Mỗi file chỉ đọc một lần trước khi sửa.
- Không gọi lại cùng một tool với cùng tham số.
- Không sửa cùng một đoạn code nhiều lần nếu chưa phát hiện lỗi.
- Tối đa 2 lần thử lại cho mỗi thao tác thất bại.
- Không tự mở rộng phạm vi.
- Không tuyên bố hoàn thành nếu chưa kiểm tra.
- Nếu gặp blocker, dừng và báo nguyên nhân thay vì tiếp tục lặp.

Thực hiện tuần tự cả 5 giai đoạn trong cùng nhiệm vụ. Không dừng sau khi lập kế hoạch, trừ khi phát hiện blocker cần người dùng quyết định.