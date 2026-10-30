
/* ==========================================
   APEX F1 — CHAMPIONSHIP MODULE
   File: js/championship.js
   ========================================== */

import {
  getSessions,
  getDrivers,
  getDriverChampionship,
  getConstructorChampionship
} from "./api.js";

import {
  DEFAULT_SEASON,
  MIN_SEASON,
  MAX_SEASON,
  DATE_LOCALE
} from "./config.js";

// ------------------------------------------
// State
// ------------------------------------------

let isLoading = false;
let lastLoadedSessionKey = null;

// ------------------------------------------
// DOM helpers
// ------------------------------------------

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function setHTML(id, html) {
  const element = $(id);
  if (element) element.innerHTML = html;
}

// ------------------------------------------
// Format helpers
// ------------------------------------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatPoints(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

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

function getTeamName(item) {
  return (
    item.team_name ||
    item.team ||
    item.name ||
    "Unknown team"
  );
}

// ------------------------------------------
// Session helpers
// ------------------------------------------

function isRaceSession(session) {
  return (
    String(session.session_type || "").toLowerCase() === "race"
  );
}

function getSessionTimestamp(session) {
  return Date.parse(session.date_end || "") || 0;
}

/**
 * Chọn Race đã kết thúc gần nhất.
 * Không chọn chặng tương lai hoặc chặng bị hủy.
 */
function getLatestRace(sessions) {
  if (!Array.isArray(sessions)) {
    throw new Error("OpenF1 returned an invalid sessions response.");
  }

  const now = Date.now();

  const completedRaces = sessions
    .filter((session) => {
      if (!isRaceSession(session)) return false;
      if (session.is_cancelled === true) return false;

      const endTime = Date.parse(session.date_end || "");

      return Number.isFinite(endTime) && endTime <= now;
    })
    .sort(
      (a, b) => getSessionTimestamp(b) - getSessionTimestamp(a)
    );

  return completedRaces[0] || null;
}

// ------------------------------------------
// Driver lookup
// ------------------------------------------

function buildDriverLookup(drivers) {
  const lookup = new Map();

  if (!Array.isArray(drivers)) return lookup;

  for (const driver of drivers) {
    const number = Number(driver.driver_number);

    if (Number.isFinite(number)) {
      lookup.set(number, driver);
    }
  }

  return lookup;
}

// ------------------------------------------
// Normalize championship records
// ------------------------------------------

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

function normalizeTeamStandings(records) {
  if (!Array.isArray(records)) {
    throw new Error("Invalid constructor championship response.");
  }

  return records
    .map((record) => {
      const rawPosition =
        record.position_current ?? record.position;

      return {
        position:
          rawPosition === undefined || rawPosition === null
            ? NaN
            : Number(rawPosition),
        name: getTeamName(record),
        points: Number(
          record.points_current ??
          record.points ??
          record.points_total
        )
      };
    })
    .filter((item) => Number.isFinite(item.points))
    .sort((a, b) => {
      const positionDiff = a.position - b.position;

      if (Number.isFinite(positionDiff) && positionDiff !== 0) {
        return positionDiff;
      }

      return b.points - a.points;
    });
}

// ------------------------------------------
// Render driver standings
// ------------------------------------------

function renderDrivers(drivers) {
  if (!drivers.length) {
    setHTML(
      "drivers",
      '<div class="empty">No driver standings available for this race.</div>'
    );
    return;
  }

  const teamColors = {
    "Mercedes": "#00D2BE",
    "Ferrari": "#E80020",
    "Red Bull Racing": "#3671C6",
    "McLaren": "#FF8000",
    "Alpine": "#0093CC",
    "Haas F1 Team": "#B6BABD",
    "Racing Bulls": "#6692FF",
    "RB": "#6692FF",
    "Audi": "#D5001C",
    "Williams": "#64C4FF",
    "Aston Martin": "#229971",
    "Cadillac": "#D6D6D6"
  };

  const rows = drivers.map((driver, index) => {
    const position = Number.isFinite(driver.position)
      ? driver.position
      : index + 1;

    const team = driver.team || "Unknown team";
    const teamColor = teamColors[team] || "#777777";

    return `
      <div class="driver-row">

        <div class="driver-position">
          ${position}
        </div>

        <div
          class="driver-team-mark"
          style="--team-color: ${teamColor}"
        ></div>

        <div class="driver-info">

          <div class="driver-name">
            ${escapeHTML(driver.name)}
          </div>

          <div class="driver-team">
            ${escapeHTML(team)}
          </div>

        </div>

        <div class="driver-points">
          ${formatPoints(driver.points)}
        </div>

      </div>
    `;
  }).join("");

  setHTML(
    "drivers",
    `<div class="driver-list">${rows}</div>`
  );
}

// ------------------------------------------
// Render constructor standings
// ------------------------------------------

function renderTeams(teams) {
  if (!teams.length) {
    setHTML(
      "teams",
      '<div class="empty">No constructor standings available for this race.</div>'
    );
    return;
  }

  // Team logos and colors.
  // File extensions match the actual files in assets/teams/.
  const teamAssets = {
    "mercedes": {
      logo: "mercedes.svg",
      color: "#00D2BE",
      shortName: "M"
    },

    "ferrari": {
      logo: "ferrari.png",
      color: "#E80020",
      shortName: "F"
    },

    "red bull racing": {
      logo: "redbull.webp",
      color: "#3671C6",
      shortName: "RB"
    },

    "red bull": {
      logo: "redbull.webp",
      color: "#3671C6",
      shortName: "RB"
    },

    "mclaren": {
      logo: "mclaren.webp",
      color: "#FF8000",
      shortName: "M"
    },

    "aston martin": {
      logo: "astonmartin.png",
      color: "#229971",
      shortName: "AM"
    },

    "alpine": {
      logo: "alpine.webp",
      color: "#0093CC",
      shortName: "A"
    },

    "williams": {
      logo: "williams.webp",
      color: "#64C4FF",
      shortName: "W"
    },

    "racing bulls": {
      logo: "racingbull.png",
      color: "#6692FF",
      shortName: "RB"
    },

    "rb": {
      logo: "racingbull.png",
      color: "#6692FF",
      shortName: "RB"
    },

    "haas f1 team": {
      logo: "haas.webp",
      color: "#B6BABD",
      shortName: "H"
    },

    "haas": {
      logo: "haas.webp",
      color: "#B6BABD",
      shortName: "H"
    },

    "audi": {
      logo: "audi.webp",
      color: "#D5001C",
      shortName: "A"
    },

    "cadillac": {
      logo: "cadillac.png",
      color: "#D6D6D6",
      shortName: "C"
    }
  };

  const rows = teams.map((team, index) => {
    const position = Number.isFinite(team.position)
      ? team.position
      : index + 1;

    const teamName = String(team.name || "Unknown team");
    const normalizedName = teamName.trim().toLowerCase();

    const asset = teamAssets[normalizedName] || null;
    const teamColor = asset?.color || "#777777";

    // Logo with fallback initials if image cannot load.
    const logoMarkup = asset
      ? `
        <div class="constructor-logo-wrap">

          <img
            class="constructor-logo"
            src="./assets/teams/${asset.logo}"
            alt="${escapeHTML(teamName)} logo"
            loading="lazy"
            decoding="async"
            onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
          >

          <span
            class="constructor-logo-fallback"
            hidden
            aria-hidden="true"
          >${asset.shortName}</span>

        </div>
      `
      : `
        <div class="constructor-logo-wrap">
          <span
            class="constructor-logo-fallback"
            aria-hidden="true"
          >
            ${escapeHTML(teamName.slice(0, 2).toUpperCase())}
          </span>
        </div>
      `;

    return `
      <div
        class="constructor-row"
        style="--team-color: ${teamColor}"
      >

        <div class="constructor-position">
          ${position}
        </div>

        <span
          class="constructor-team-mark"
          aria-hidden="true"
        ></span>

        ${logoMarkup}

        <div class="constructor-info">

          <div class="constructor-name">
            ${escapeHTML(teamName)}
          </div>

        </div>

        <div class="constructor-points">
          ${formatPoints(team.points)}
          <span class="constructor-points-label">PTS</span>
        </div>

      </div>
    `;
  }).join("");

  setHTML(
    "teams",
    `
      <div class="constructor-list">

        <div class="constructor-list-head">
          <span>Constructor standings</span>
          <span>Points</span>
        </div>

        ${rows}

      </div>
    `
  );
}

// ------------------------------------------
// Status and error handling
// ------------------------------------------

function setLoading(loading) {
  const button = $("refresh");

  if (button) {
    button.disabled = loading;
    button.setAttribute("aria-busy", String(loading));
    button.textContent = loading
      ? "Loading..."
      : "↻ Refresh data";
  }

  if (loading) {
    setText("updated", "Loading championship data...");
  }
}

function showError(error) {
  console.error("Championship loading error:", error);

  const message =
    error instanceof Error
      ? error.message
      : "Unable to load championship data.";

  setText("updated", message);

  setHTML(
    "drivers",
    `<div class="error">${escapeHTML(message)}</div>`
  );

  setHTML(
    "teams",
    `<div class="error">${escapeHTML(message)}</div>`
  );
}

// ------------------------------------------
// Load championship data
// ------------------------------------------

export async function loadChampionship() {
  // Prevent overlapping requests.
  if (isLoading) return;

  isLoading = true;
  setLoading(true);

  try {
    const year = DEFAULT_SEASON;

    if (
      !Number.isInteger(year) ||
      year < MIN_SEASON ||
      year > MAX_SEASON
    ) {
      throw new Error(`Invalid season year: ${year}.`);
    }

    setText("raceName", `${year} Season`);

    const sessions = await getSessions(year);
    const latestRace = getLatestRace(sessions);

    if (!latestRace) {
      setText(
        "raceName",
        `${year} Season — No completed Race`
      );

      setHTML(
        "drivers",
        '<div class="empty">No completed Race session is available yet.</div>'
      );

      setHTML(
        "teams",
        '<div class="empty">Constructor standings are unavailable until a completed Race is found.</div>'
      );

      setText("updated", `No completed Race found for ${year}.`);

      lastLoadedSessionKey = null;
      return;
    }

    const sessionKey = Number(latestRace.session_key);

    if (!Number.isSafeInteger(sessionKey) || sessionKey <= 0) {
      throw new Error("Race session has an invalid session_key.");
    }

    setText(
      "raceName",
      `${latestRace.meeting_name ||
        latestRace.circuit_short_name ||
        "F1"} — ${latestRace.session_name || "Race"}`
    );

    // Run requests in parallel.
    const results = await Promise.allSettled([
      getDriverChampionship(sessionKey),
      getConstructorChampionship(sessionKey),
      getDrivers(sessionKey)
    ]);

    const [driverResult, teamResult, driverListResult] = results;

    if (driverResult.status === "fulfilled") {
      const driverList =
        driverListResult.status === "fulfilled"
          ? driverListResult.value
          : [];

      renderDrivers(
        normalizeDriverStandings(
          driverResult.value,
          driverList
        )
      );
    } else {
      setHTML(
        "drivers",
        `<div class="error">${escapeHTML(driverResult.reason?.message || "Driver standings could not be loaded.")}</div>`
      );
    }

    if (teamResult.status === "fulfilled") {
      renderTeams(
        normalizeTeamStandings(teamResult.value)
      );
    } else {
      setHTML(
        "teams",
        `<div class="error">${escapeHTML(teamResult.reason?.message || "Constructor standings could not be loaded.")}</div>`
      );
    }

    lastLoadedSessionKey = sessionKey;

    const sessionDate =
      latestRace.date_end || latestRace.date_start;

    let formattedDate = "";

    if (sessionDate) {
      const date = new Date(sessionDate);

      if (!Number.isNaN(date.getTime())) {
        formattedDate = date.toLocaleDateString(
          DATE_LOCALE,
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Ho_Chi_Minh"
          }
        );
      }
    }

    const failures = results.filter(
      (result) => result.status === "rejected"
    );

    if (failures.length > 0) {
      const hasRateLimit = failures.some(
        (result) => result.reason?.message?.includes("429")
      );

      setText(
        "updated",
        hasRateLimit
          ? "OpenF1 rate limit reached. Please wait before refreshing."
          : `Some championship data could not be loaded. ${formattedDate}`
      );
    } else {
      setText(
        "updated",
        `Season ${year} · ${formattedDate} · Updated ${new Date().toLocaleTimeString("vi-VN")}`
      );
    }

  } catch (error) {
    showError(error);

  } finally {
    isLoading = false;
    setLoading(false);
  }
}

// ------------------------------------------
// Compatibility
// ------------------------------------------

// Keep compatibility with onclick="loadData()" in index.html.
if (typeof window !== "undefined") {
  window.loadData = loadChampionship;
}

// Expose current session key for future telemetry features.
export function getCurrentChampionshipSessionKey() {
  return lastLoadedSessionKey;
}
