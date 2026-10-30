
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
  const first = driver.first_name || "";
  const last = driver.last_name || "";

  return (
    driver.full_name ||
    `${first} ${last}`.trim() ||
    driver.name_acronym ||
    `Driver ${driver.driver_number ?? ""}`.trim() ||
    "Unknown driver"
  );
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

      const driverName = getDriverName(driver);

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
        name:
          driverName !== "Unknown driver"
            ? driverName
            : record.full_name ||
              record.driver_name ||
              record.name_acronym ||
              `Driver ${record.driver_number ?? ""}`,
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
    .filter((item) => Number.isFinite(item.points))
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

  const rows = drivers.map((driver, index) => {
    const position = Number.isFinite(driver.position)
      ? driver.position
      : index + 1;

    return `
      <tr>
        <td class="pos">${position}</td>
        <td>
          <div class="name">${escapeHTML(driver.name)}</div>
          <div class="sub">${escapeHTML(driver.team)}</div>
        </td>
        <td class="points">${formatPoints(driver.points)}</td>
      </tr>
    `;
  }).join("");

  setHTML(
    "drivers",
    `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th class="points">PTS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `
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

  const rows = teams.map((team, index) => {
    const position = Number.isFinite(team.position)
      ? team.position
      : index + 1;

    return `
      <tr>
        <td class="pos">${position}</td>
        <td><div class="name">${escapeHTML(team.name)}</div></td>
        <td class="points">${formatPoints(team.points)}</td>
      </tr>
    `;
  }).join("");

  setHTML(
    "teams",
    `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>POS</th>
              <th>CONSTRUCTOR</th>
              <th class="points">PTS</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
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
  // Chặn các lần tải chồng nhau trong cùng module.
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

    // Gọi song song để giảm thời gian chờ.
    // api.js sẽ gộp các request trùng URL nếu còn request đang chạy.
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

// Giữ tương thích nếu index.html vẫn sử dụng onclick="loadData()".
if (typeof window !== "undefined") {
  window.loadData = loadChampionship;
}

// Expose current session key for future telemetry features.
export function getCurrentChampionshipSessionKey() {
  return lastLoadedSessionKey;
}
