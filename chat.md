# TASK: REFACTOR RACE SCHEDULE – APEX F1

Trước khi thực hiện, đọc và tuân thủ `AGENT_WORKFLOW.md`.

Bước 1. Sửa hàm getDriverName()
Mở js/championship.js, nhấn Ctrl + F, tìm:
function getDriverName(driver) {


Thay toàn bộ hàm cũ bằng:

function getDriverName(driver) {
  const first = driver?.first_name || "";
  const last = driver?.last_name || "";

  return (
    driver?.full_name ||
    `${first} ${last}`.trim() ||
    driver?.name_acronym ||
    ""
  ).trim();
}



Tại sao sửa?

Code cũ tự tạo tên "Driver" ngay cả khi không có thông tin tay đua. Code mới trả về chuỗi rỗng nếu không có danh tính.
Bước 2. Sửa hàm normalizeDriverStandings()
Nhấn Ctrl + F, tìm:
function normalizeDriverStandings(records, drivers) {


Chọn toàn bộ hàm từ dòng khai báo đến dấu } cuối cùng, rồi thay bằng đoạn sau:

function normalizeDriverStandings(records, drivers) {
  if (!Array.isArray(records)) {
    throw new Error("Invalid driver championship response.");
  }

  const driverLookup = buildDriverLookup(drivers);

  return records
    .map((record) => {
      const number = Number(record.driver_number);
      const driver = driverLookup.get(number) || {};

      // Ưu tiên thông tin từ Drivers API.
      const driverName = getDriverName(driver);

      // Nếu không tìm thấy, lấy thông tin từ Championship API.
      const recordName = [
        record.full_name,
        record.driver_name,
        record.name_acronym
      ]
        .map((value) => String(value || "").trim())
        .find((value) =>
          value &&
          !["driver", "unknown driver", "unknown"].includes(
            value.toLowerCase()
          )
        ) || "";

      const name = driverName || recordName;

      const points = Number(
        record.points_current ??
        record.points ??
        record.points_total
      );

      const rawPosition =
        record.position_current ?? record.position;

      const position =
        rawPosition === undefined || rawPosition === null
          ? NaN
          : Number(rawPosition);

      return {
        position,
        number,
        name,
        team:
          record.team_name ||
          record.team ||
          driver.team_name ||
          "Unknown team",
        points,
        acronym:
          driver.name_acronym ||
          record.name_acronym ||
          ""
      };
    })
    // Không hiển thị record không có tên tay đua hợp lệ.
    .filter((item) =>
      item.name &&
      Number.isFinite(item.points)
    )
    .sort((a, b) => {
      const positionDiff = a.position - b.position;

      if (Number.isFinite(positionDiff) && positionDiff !== 0) {
        return positionDiff;
      }

      return b.points - a.points;
    });
}