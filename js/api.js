
/* ============================================
   APEX F1 — API SERVICE
   File: js/api.js
   ============================================ */

import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  MIN_SEASON,
  MAX_SEASON
} from "./config.js";

// Gộp các request giống nhau đang chạy.
const pendingRequests = new Map();

// Cache chỉ lưu response thành công.
const responseCache = new Map();

const CACHE_TTL_MS = {
  sessions: 10 * 60 * 1000,
  drivers: 10 * 60 * 1000,
  championship_drivers: 2 * 60 * 1000,
  championship_teams: 2 * 60 * 1000
};

const MAX_CACHE_ENTRIES = 100;
const JSON_ACCEPT_HEADER = "application/json";

// --------------------------------------------
// Main API request
// --------------------------------------------

export function apiGet(endpoint, params = {}) {
  validateEndpoint(endpoint);
  validateOptions(params);

  const url = buildRequestUrl(endpoint, params);
  const requestUrl = url.toString();
  const now = Date.now();

  const cached = responseCache.get(requestUrl);

  if (cached && cached.expiresAt > now) {
    // Đưa entry vừa dùng lên cuối Map.
    responseCache.delete(requestUrl);
    responseCache.set(requestUrl, cached);

    return Promise.resolve(cloneData(cached.data));
  }

  if (cached) {
    responseCache.delete(requestUrl);
  }

  const existingRequest = pendingRequests.get(requestUrl);

  if (existingRequest) {
    return existingRequest.then(cloneData);
  }

  const requestPromise = performRequest(requestUrl)
    .then((data) => {
      const ttl = getCacheTtl(requestUrl);

      if (ttl > 0) {
        storeCacheEntry(requestUrl, data, ttl);
      }

      return data;
    })
    .finally(() => {
      if (pendingRequests.get(requestUrl) === requestPromise) {
        pendingRequests.delete(requestUrl);
      }
    });

  pendingRequests.set(requestUrl, requestPromise);

  return requestPromise.then(cloneData);
}

// --------------------------------------------
// Validation
// --------------------------------------------

function validateEndpoint(endpoint) {
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//") ||
    endpoint.includes("?") ||
    endpoint.includes("#") ||
    endpoint.includes("\\") ||
    endpoint.split("/").some(
      (part) => part === "." || part === ".."
    )
  ) {
    throw new Error("Invalid API endpoint.");
  }
}

function validateOptions(options) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("Invalid API query parameters.");
  }
}

function buildRequestUrl(endpoint, params) {
  const timeoutMs = Number(API_TIMEOUT_MS);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Invalid API timeout configuration.");
  }

  let baseUrl;

  try {
    baseUrl = new URL(API_BASE_URL);
  } catch {
    throw new Error("Invalid API_BASE_URL configuration.");
  }

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.hostname !== "api.openf1.org" ||
    baseUrl.pathname.replace(/\/+$/, "") !== "/v1" ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error(
      'API_BASE_URL must be "https://api.openf1.org/v1".'
    );
  }

  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const url = new URL(
    `${baseUrl.origin}${basePath}${endpoint}`
  );

  for (const [key, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error(
        `Unsupported API parameter type: ${key}`
      );
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      throw new Error(`Invalid API parameter: ${key}`);
    }

    url.searchParams.set(key, String(value));
  }

  // Chuẩn hóa thứ tự tham số để dùng chung cache key.
  url.searchParams.sort();

  return url;
}

// --------------------------------------------
// HTTP request and error handling
// --------------------------------------------

async function performRequest(requestUrl) {
  const timeoutMs = Number(API_TIMEOUT_MS);
  const controller = new AbortController();

  let didTimeout = false;

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: JSON_ACCEPT_HEADER
      },
      signal: controller.signal
    });

    // Không tự retry khi bị rate limit.
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");

      console.warn("OpenF1 rate limit reached:", {
        url: requestUrl,
        retryAfter
      });

      throw new Error(
        `OpenF1 API error: HTTP 429 Too Many Requests.${getRetryAfterMessage(retryAfter)}`
      );
    }

    if (!response.ok) {
      const responseBody = await response
        .text()
        .catch(() => "");

      console.error("OpenF1 API request failed:", {
        url: requestUrl,
        status: response.status,
        statusText: response.statusText,
        responseBody: responseBody.slice(0, 1000)
      });

      throw new Error(
        `OpenF1 API error: HTTP ${response.status} ${response.statusText}`.trim()
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("json")) {
      const responseBody = await response
        .text()
        .catch(() => "");

      console.error("OpenF1 returned non-JSON data:", {
        url: requestUrl,
        contentType,
        responseBody: responseBody.slice(0, 500)
      });

      throw new Error(
        "OpenF1 returned a non-JSON response."
      );
    }

    try {
      return await response.json();
    } catch {
      throw new Error("OpenF1 returned invalid JSON.");
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        didTimeout
          ? `OpenF1 request timed out after ${timeoutMs / 1000} seconds.`
          : "OpenF1 request was cancelled."
      );
    }

    if (error instanceof TypeError) {
      console.error("OpenF1 network request failed:", {
        url: requestUrl,
        message: error.message
      });

      throw new Error(
        "Cannot connect to OpenF1. Check internet access, CORS, or API availability."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --------------------------------------------
// TTL cache helpers
// --------------------------------------------

function getCacheTtl(requestUrl) {
  const endpoint = new URL(requestUrl)
    .pathname
    .split("/")
    .pop();

  return CACHE_TTL_MS[endpoint] || 0;
}

function storeCacheEntry(key, data, ttl) {
  if (responseCache.has(key)) {
    responseCache.delete(key);
  }

  responseCache.set(key, {
    data: cloneData(data),
    expiresAt: Date.now() + ttl
  });

  // Giới hạn bộ nhớ cache.
  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

function cloneData(data) {
  // Tránh code bên ngoài vô tình sửa dữ liệu trong cache.
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
}

// --------------------------------------------
// Rate-limit helper
// --------------------------------------------

function getRetryAfterMessage(retryAfter) {
  if (!retryAfter) {
    return " Please wait before retrying; the API has rate-limited requests.";
  }

  const seconds = Number(retryAfter);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return ` Please wait at least ${Math.ceil(seconds)} seconds before retrying.`;
  }

  const retryDate = Date.parse(retryAfter);

  if (Number.isFinite(retryDate)) {
    const secondsUntilRetry = Math.max(
      0,
      Math.ceil((retryDate - Date.now()) / 1000)
    );

    return ` Please wait at least ${secondsUntilRetry} seconds before retrying.`;
  }

  return " Please wait before retrying; the API has rate-limited requests.";
}

// --------------------------------------------
// Public API methods
// --------------------------------------------

export function getSessions(year) {
  validateYear(year);

  return apiGet("/sessions", {
    year: Number(year)
  });
}

export function getDrivers(sessionKey) {
  validateSessionKey(sessionKey);

  return apiGet("/drivers", {
    session_key: Number(sessionKey)
  });
}

export function getDriverChampionship(sessionKey) {
  validateSessionKey(sessionKey);

  return apiGet("/championship_drivers", {
    session_key: Number(sessionKey)
  });
}

export function getConstructorChampionship(sessionKey) {
  validateSessionKey(sessionKey);

  return apiGet("/championship_teams", {
    session_key: Number(sessionKey)
  });
}

export function getCarData(
  sessionKey,
  driverNumber,
  options = {}
) {
  validateSessionKey(sessionKey);
  validateDriverNumber(driverNumber);
  validateOptions(options);

  return apiGet("/car_data", {
    ...options,
    session_key: Number(sessionKey),
    driver_number: Number(driverNumber)
  });
}

export function getCarLocation(
  sessionKey,
  driverNumber,
  options = {}
) {
  validateSessionKey(sessionKey);
  validateDriverNumber(driverNumber);
  validateOptions(options);

  return apiGet("/location", {
    ...options,
    session_key: Number(sessionKey),
    driver_number: Number(driverNumber)
  });
}

export function getLaps(sessionKey, options = {}) {
  validateSessionKey(sessionKey);
  validateOptions(options);

  return apiGet("/laps", {
    ...options,
    session_key: Number(sessionKey)
  });
}

export function getIntervals(sessionKey, options = {}) {
  validateSessionKey(sessionKey);
  validateOptions(options);

  return apiGet("/intervals", {
    ...options,
    session_key: Number(sessionKey)
  });
}

export function getRaceControl(sessionKey, options = {}) {
  validateSessionKey(sessionKey);
  validateOptions(options);

  return apiGet("/race_control", {
    ...options,
    session_key: Number(sessionKey)
  });
}

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

// --------------------------------------------
// Input validation helpers
// --------------------------------------------

function validateYear(year) {
  const value = Number(year);

  if (
    year === null ||
    year === undefined ||
    String(year).trim() === "" ||
    !Number.isInteger(value) ||
    value < MIN_SEASON ||
    value > MAX_SEASON
  ) {
    throw new Error(
      `Invalid season year. Allowed range: ${MIN_SEASON}-${MAX_SEASON}.`
    );
  }
}

function validateSessionKey(sessionKey) {
  const value = Number(sessionKey);

  if (
    sessionKey === null ||
    sessionKey === undefined ||
    String(sessionKey).trim() === "" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      "A valid positive integer session_key is required."
    );
  }
}

function validateDriverNumber(driverNumber) {
  const value = Number(driverNumber);

  if (
    driverNumber === null ||
    driverNumber === undefined ||
    String(driverNumber).trim() === "" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error("Invalid driver number.");
  }
}
