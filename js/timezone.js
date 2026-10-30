
/* ==========================================
   APEX F1 — TIMEZONE MODULE
   File: js/timezone.js
   ========================================== */

import {
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  DATE_LOCALE,
  NUMBER_LOCALE
} from "./config.js";

// ------------------------------------------
// Validate timezone
// ------------------------------------------

export function isValidTimezone(timezone) {
  if (typeof timezone !== "string" || !timezone.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone
    });

    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------
// Get timezone
// ------------------------------------------

export function getTimezone() {
  const selected = document.getElementById("timezone")?.value;

  if (isValidTimezone(selected)) {
    return selected;
  }

  return DEFAULT_TIMEZONE;
}

// ------------------------------------------
// Parse date
// ------------------------------------------

export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  if (typeof value === "string" && !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

// ------------------------------------------
// Format date
// ------------------------------------------

export function formatDate(
  value,
  timezone = getTimezone(),
  locale = DATE_LOCALE
) {
  const date = parseDate(value);

  if (!date) return "Date TBC";

  const safeTimezone = isValidTimezone(timezone)
    ? timezone
    : DEFAULT_TIMEZONE;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: safeTimezone
  }).format(date);
}

// ------------------------------------------
// Format time
// ------------------------------------------

export function formatTime(
  value,
  timezone = getTimezone(),
  locale = "en-GB"
) {
  const date = parseDate(value);

  if (!date) return "Time TBC";

  const safeTimezone = isValidTimezone(timezone)
    ? timezone
    : DEFAULT_TIMEZONE;

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: safeTimezone
  }).format(date);
}

// ------------------------------------------
// Format date + time
// ------------------------------------------

export function formatDateTime(
  value,
  timezone = getTimezone(),
  locale = DATE_LOCALE
) {
  const date = parseDate(value);

  if (!date) return "Date and time TBC";

  return `${formatDate(date, timezone, locale)} · ${formatTime(date, timezone)}`;
}

// ------------------------------------------
// Get UTC offset for a specific date
// ------------------------------------------

export function getUTCOffset(
  value = new Date(),
  timezone = getTimezone()
) {
  const date = parseDate(value);

  if (!date) return "UTC offset unavailable";

  const safeTimezone = isValidTimezone(timezone)
    ? timezone
    : DEFAULT_TIMEZONE;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    timeZoneName: "longOffset",
    hour: "2-digit"
  }).formatToParts(date);

  const offset = parts.find(
    (part) => part.type === "timeZoneName"
  )?.value;

  if (!offset || offset === "GMT" || offset === "GMT+00:00") {
    return "UTC+00:00";
  }

  return offset.replace(/^GMT/, "UTC");
}

// ------------------------------------------
// Get timezone label
// ------------------------------------------

export function getTimezoneLabel(timezone = getTimezone()) {
  const option = TIMEZONE_OPTIONS.find(
    (item) => item.value === timezone
  );

  if (option) return option.label;

  return timezone;
}

// ------------------------------------------
// Convert date to selected timezone
// ------------------------------------------

// Date luôn đại diện cho một thời điểm cụ thể.
// Không thay đổi timestamp; chỉ định dạng theo múi giờ.
export function convertTimezone(
  value,
  timezone = getTimezone()
) {
  const date = parseDate(value);

  if (!date) return null;

  const safeTimezone = isValidTimezone(timezone)
    ? timezone
    : DEFAULT_TIMEZONE;

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: safeTimezone
  }).format(date);
}

// ------------------------------------------
// Format number
// ------------------------------------------

export function formatNumber(
  value,
  maximumFractionDigits = 2,
  locale = NUMBER_LOCALE
) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString(locale, {
    maximumFractionDigits
  });
}

// ------------------------------------------
// Initialize timezone selector
// ------------------------------------------

export function initializeTimezoneSelector() {
  const select = document.getElementById("timezone");

  if (!select) return;

  // Giữ nguyên các option có sẵn trong index.html.
  if (select.options.length === 0) {
    for (const item of TIMEZONE_OPTIONS) {
      const option = document.createElement("option");

      option.value = item.value;
      option.textContent = item.label;

      select.appendChild(option);
    }
  }

  const hasDefault = Array.from(select.options).some(
    (option) => option.value === DEFAULT_TIMEZONE
  );

  if (hasDefault) {
    select.value = DEFAULT_TIMEZONE;
  }
}

// ------------------------------------------
// Update timezone note
// ------------------------------------------

export function updateTimezoneNote() {
  const note = document.getElementById("timezoneNote");

  if (!note) return;

  const timezone = getTimezone();
  const label = getTimezoneLabel(timezone);
  const offset = getUTCOffset(new Date(), timezone);

  note.textContent = `Times shown in ${label} (${offset}).`;
}
