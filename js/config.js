
/**
 * APEX F1 — Application Configuration
 * File: js/config.js
 */

// ============================================================
// API CONFIGURATION
// ============================================================

export const API_BASE_URL = "https://api.openf1.org/v1";

export const API_TIMEOUT_MS = 15000;

// ============================================================
// SEASON CONFIGURATION
// ============================================================

export const DEFAULT_SEASON = new Date().getFullYear();

export const MIN_SEASON = 1950;

export const MAX_SEASON = 2200;

// ============================================================
// TIMEZONE CONFIGURATION
// ============================================================

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export const TIMEZONE_OPTIONS = [
  {
    value: "Asia/Ho_Chi_Minh",
    label: "GMT+7 · Vietnam"
  },
  {
    value: "UTC",
    label: "UTC · GMT+0"
  },
  {
    value: "Europe/London",
    label: "London"
  },
  {
    value: "Europe/Paris",
    label: "Paris"
  },
  {
    value: "America/New_York",
    label: "New York"
  },
  {
    value: "America/Los_Angeles",
    label: "Los Angeles"
  },
  {
    value: "Asia/Tokyo",
    label: "Tokyo · GMT+9"
  },
  {
    value: "Australia/Melbourne",
    label: "Melbourne"
  }
];

// ============================================================
// APPLICATION METADATA
// ============================================================

export const APP_NAME = "APEX F1";

export const APP_VERSION = "1.0.0";

// ============================================================
// DISPLAY CONFIGURATION
// ============================================================

export const POINTS_MAX_DECIMALS = 2;

export const DATE_LOCALE = "en-GB";

export const NUMBER_LOCALE = "en-US";

// ============================================================
// CONFIGURATION VALIDATION
// ============================================================

export function validateConfig() {
  const errors = [];

  // Validate API URL
  try {
    const url = new URL(API_BASE_URL);

    if (url.protocol !== "https:") {
      errors.push("API_BASE_URL must use HTTPS.");
    }

    if (url.hostname !== "api.openf1.org") {
      errors.push("API_BASE_URL must use api.openf1.org.");
    }

    if (url.pathname.replace(/\/+$/, "") !== "/v1") {
      errors.push("API_BASE_URL must end with /v1.");
    }

    if (url.search || url.hash) {
      errors.push("API_BASE_URL must not contain a query or hash.");
    }
  } catch {
    errors.push("API_BASE_URL must be a valid URL.");
  }

  // Validate API timeout
  if (
    !Number.isFinite(API_TIMEOUT_MS) ||
    API_TIMEOUT_MS <= 0
  ) {
    errors.push("API_TIMEOUT_MS must be a positive number.");
  }

  // Validate season range
  if (
    !Number.isInteger(MIN_SEASON) ||
    !Number.isInteger(MAX_SEASON) ||
    MIN_SEASON > MAX_SEASON
  ) {
    errors.push("Season range configuration is invalid.");
  }

  // Validate default season
  if (
    !Number.isInteger(DEFAULT_SEASON) ||
    DEFAULT_SEASON < MIN_SEASON ||
    DEFAULT_SEASON > MAX_SEASON
  ) {
    errors.push("DEFAULT_SEASON must be within the configured season range.");
  }

  // Validate default timezone
  const timezoneValues = TIMEZONE_OPTIONS.map(
    (option) => option.value
  );

  if (!timezoneValues.includes(DEFAULT_TIMEZONE)) {
    errors.push("DEFAULT_TIMEZONE must exist in TIMEZONE_OPTIONS.");
  }

  // Validate timezone options
  if (
    !Array.isArray(TIMEZONE_OPTIONS) ||
    TIMEZONE_OPTIONS.length === 0
  ) {
    errors.push("TIMEZONE_OPTIONS must not be empty.");
  } else {
    const seenTimezones = new Set();

    TIMEZONE_OPTIONS.forEach((option, index) => {
      if (
        !option ||
        typeof option.value !== "string" ||
        typeof option.label !== "string" ||
        !option.value.trim() ||
        !option.label.trim()
      ) {
        errors.push(
          `TIMEZONE_OPTIONS[${index}] must contain valid value and label strings.`
        );
        return;
      }

      if (seenTimezones.has(option.value)) {
        errors.push(
          `Duplicate timezone option: ${option.value}.`
        );
      }

      seenTimezones.add(option.value);

      try {
        new Intl.DateTimeFormat("en-US", {
          timeZone: option.value
        });
      } catch {
        errors.push(
          `Invalid timezone: ${option.value}.`
        );
      }
    });
  }

  // Validate points precision
  if (
    !Number.isInteger(POINTS_MAX_DECIMALS) ||
    POINTS_MAX_DECIMALS < 0 ||
    POINTS_MAX_DECIMALS > 10
  ) {
    errors.push(
      "POINTS_MAX_DECIMALS must be an integer between 0 and 10."
    );
  }

  // Validate locale settings
  try {
    new Intl.DateTimeFormat(DATE_LOCALE);
  } catch {
    errors.push("DATE_LOCALE is invalid.");
  }

  try {
    new Intl.NumberFormat(NUMBER_LOCALE);
  } catch {
    errors.push("NUMBER_LOCALE is invalid.");
  }

  // Validate application metadata
  if (
    typeof APP_NAME !== "string" ||
    !APP_NAME.trim()
  ) {
    errors.push("APP_NAME must be a non-empty string.");
  }

  if (
    typeof APP_VERSION !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(APP_VERSION)
  ) {
    errors.push("APP_VERSION must use the format x.y.z.");
  }

  // Return validation result
  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    errors: []
  };
}
