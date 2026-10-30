Mở js/api.js, tìm hàm getRaceControl() và thêm đoạn sau vào cuối file hoặc ngay sau hàm đó:


/**
 * Lấy kết quả chính thức của một phiên đua.
 */
export function getSessionResult(sessionKey, options = {}) {
  validateSessionKey(sessionKey);
  validateOptions(options);

  return apiGet("/session_result", {
    ...options,
    session_key: Number(sessionKey)
  });
}

