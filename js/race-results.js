/**
 * APEX F1 — Race Results
 * File: js/race-results.js
 *
 * Dependencies:
 *   ./api.js
 *   ./config.js
 *
 * Required HTML IDs:
 *   resultsYear
 *   resultsSession
 *   resultsRefresh
 *   resultsStatus
 *   raceResults
 */

import {
  getSessions,
  getDrivers,
  getSessionResult
} from "./api.js";

import {
  DEFAULT_SEASON,
  MIN_SEASON,
  MAX_SEASON
} from "./config.js";

// ============================================================
// DOM
// ============================================================

const yearSelect = document.getElementById("resultsYear");
const sessionSelect = document.getElementById("resultsSession");
const refreshButton = document.getElementById("resultsRefresh");
const statusElement = document.getElementById("resultsStatus");
const resultsContainer = document.getElementById("raceResults");

// ============================================================
// STATE
// ============================================================

let currentSessions = [];
let requestVersion = 0;
let initialized = false;

// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}

function setStatus(message, type = "info") {
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.state = type;
}

function setLoading(isLoading) {
  if (refreshButton) {
    refreshButton.disabled = isLoading;
  }

  if (sessionSelect) {
    sessionSelect.disabled = isLoading;
  }

  if (yearSelect) {
    yearSelect.disabled = isLoading;
  }
}

function showEmpty(message) {
  if (!resultsContainer) return;

  resultsContainer.innerHTML = `
    <div class="empty">${escapeHTML(message)}</div>
  `;
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Đã xảy ra lỗi khi tải dữ liệu.";
}

function getSessionLabel(session) {
  const meeting =
    session.meeting_name ||
    session.location ||
    session.circuit_short_name ||
    session.country_name ||
    "Grand Prix";

  const sessionName = session.session_name || "Race";

  return `${meeting} — ${sessionName}`;
}

function getSessionDate(session) {
  if (!session.date_start) return "";

  const date = new Date(session.date_start);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

// ============================================================
// RACE IDENTITY
// ============================================================

function getCountryCode(session) {
  const rawCode = String(
    session?.country_code || session?.country_iso_code || ""
  ).trim().toUpperCase();

  const threeLetterCodes = {
    USA: "US",
    GBR: "GB",
    ITA: "IT",
    MCO: "MC",
    ESP: "ES",
    CAN: "CA",
    MEX: "MX",
    BRA: "BR",
    AUS: "AU",
    JPN: "JP",
    CHN: "CN",
    SGP: "SG",
    BHR: "BH",
    SAU: "SA",
    ARE: "AE",
    QAT: "QA",
    NLD: "NL",
    BEL: "BE",
    AUT: "AT",
    HUN: "HU",
    AZE: "AZ",
    PRT: "PT",
    FRA: "FR",
    DEU: "DE",
    CHE: "CH"
  };

  if (/^[A-Z]{2}$/.test(rawCode)) return rawCode;
  if (threeLetterCodes[rawCode]) return threeLetterCodes[rawCode];

  const country = String(session?.country_name || "")
    .trim()
    .toLowerCase();

  const countryCodes = {
    "united states": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
    "great britain": "GB",
    italy: "IT",
    monaco: "MC",
    spain: "ES",
    canada: "CA",
    mexico: "MX",
    brazil: "BR",
    australia: "AU",
    japan: "JP",
    china: "CN",
    singapore: "SG",
    bahrain: "BH",
    "saudi arabia": "SA",
    "united arab emirates": "AE",
    uae: "AE",
    qatar: "QA",
    netherlands: "NL",
    belgium: "BE",
    austria: "AT",
    hungary: "HU",
    azerbaijan: "AZ",
    portugal: "PT",
    france: "FR",
    germany: "DE",
    switzerland: "CH"
  };

  return countryCodes[country] || "";
}

function getCountryFlagURL(session) {
  const countryCode = getCountryCode(session);
  const rawFlagURL = String(session?.country_flag || "").trim();

  // Ưu tiên URL cờ do OpenF1 cung cấp, chỉ chấp nhận HTTPS.
  if (rawFlagURL) {
    try {
      const parsedURL = new URL(rawFlagURL);
      if (parsedURL.protocol === "https:") {
        return {
          primary: parsedURL.href,
          fallback: countryCode
            ? `https://flagcdn.com/${countryCode.toLowerCase()}.svg`
            : ""
        };
      }
    } catch (error) {
      console.warn("Race Results: URL country_flag không hợp lệ.", error);
    }
  }

  if (!countryCode) return { primary: "", fallback: "" };

  const iso2 = countryCode.toLowerCase();
  return {
    primary: `https://flagcdn.com/${iso2}.svg`,
    fallback: `https://flagcdn.com/w80/${iso2}.png`
  };
}

function renderCountryFlag(session) {
  const flag = getCountryFlagURL(session);

  if (!flag.primary) {
    return `
      <div class="race-identity-flag race-identity-flag-empty"
           role="img" aria-label="Country flag unavailable">
        <span>F1</span>
      </div>
    `;
  }

  const primaryURL = escapeHTML(flag.primary);
  const fallbackURL = escapeHTML(flag.fallback);
  const countryName = escapeHTML(session?.country_name || "Country");

  const onError = flag.fallback
    ? `onerror="if(this.dataset.fallbackTried!=='1'){this.dataset.fallbackTried='1';this.src='${fallbackURL}';}else{this.onerror=null;this.parentElement.classList.add('race-identity-flag-empty');this.remove();}"`
    : `onerror="this.onerror=null;this.parentElement.classList.add('race-identity-flag-empty');this.remove();"` ;

  return `
    <div class="race-identity-flag">
      <img src="${primaryURL}" alt="${countryName} flag"
           loading="lazy" decoding="async" ${onError}>
    </div>
  `;
}

function getGrandPrixName(session) {
  const officialName =
    session?.meeting_official_name || session?.meeting_name;

  if (officialName) return officialName;

  const country = String(session?.country_name || "").trim();
  return country ? `${country} Grand Prix` : "Grand Prix";
}

function getCircuitName(session) {
  const circuit = String(session?.circuit_short_name || "").trim();
  const location = String(session?.location || "").trim().toLowerCase();
  const countryCode = getCountryCode(session);

  // OpenF1 may identify COTA by the city name "Austin".
  if (countryCode === "US" && location === "austin") {
    return "Circuit of The Americas (COTA)";
  }

  return circuit;
}

function renderRaceIdentity(session, driverCount) {
  if (!session) return "";

  const country = session.country_name || "";
  const location = session.location || "";
  const circuit = getCircuitName(session);
  const grandPrixName = getGrandPrixName(session);
  const sessionName = session.session_name || "Race";
  const date = getSessionDate(session);
  const season = session.year || yearSelect?.value || "";
  const roundNumber = Number(session.meeting_number);

  const roundLabel =
    Number.isInteger(roundNumber) && roundNumber > 0
      ? `ROUND ${roundNumber}`
      : "";

  const locationLabel = [location, country].filter(Boolean).join(", ");

  return `
    <section class="race-identity" aria-label="Race event information">
      <div class="race-identity-main">
        ${renderCountryFlag(session)}

        <div class="race-identity-copy">
          <div class="race-identity-eyebrow">
            ${roundLabel ? `${escapeHTML(roundLabel)} · ` : ""}
            ${season ? `${escapeHTML(season)} SEASON` : ""}
          </div>

          <h2 class="race-identity-title">
            ${escapeHTML(grandPrixName)}
          </h2>

          ${circuit ? `
            <div class="race-identity-circuit">
              ${escapeHTML(circuit)}
            </div>
          ` : ""}

          ${locationLabel ? `
            <div class="race-identity-location">
              ${escapeHTML(locationLabel)}
            </div>
          ` : ""}
        </div>
      </div>

      <div class="race-identity-meta">
        <div>
          <span>SESSION</span>
          <strong>${escapeHTML(sessionName)}</strong>
        </div>
        <div>
          <span>DATE</span>
          <strong>${escapeHTML(date || "—")}</strong>
        </div>
        <div>
          <span>CLASSIFICATION</span>
          <strong>${driverCount} DRIVERS</strong>
        </div>
      </div>
    </section>
  `;
}function formatSeconds(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return String(value);
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
  }

  return `${remainingSeconds.toFixed(3)}s`;
}

function formatDuration(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => formatSeconds(item))
      .join(" / ");
  }

  return formatSeconds(value);
}

function formatGap(value, position) {
  if (position === 1) return "LEADER";

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return String(value);
  }

  return `+${seconds.toFixed(3)}s`;
}

function getDriverName(driver) {
  return (
    driver?.full_name ||
    driver?.broadcast_name ||
    [driver?.first_name, driver?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Unknown Driver"
  );
}

function getDriverCode(driver) {
  return driver?.name_acronym || "—";
}

function getDriverColor(driver) {
  const color = String(driver?.team_colour || "").replace("#", "");

  if (/^[0-9a-fA-F]{6}$/.test(color)) {
    return `#${color}`;
  }

  return "#777777";
}

function getResultStatus(result) {
  if (result.dsq === true) return "DSQ";
  if (result.dns === true) return "DNS";
  if (result.dnf === true) return "DNF";

  return "Finished";
}

function getValidPosition(result) {
  const value = result?.position;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const position = Number(value);

  return Number.isInteger(position) && position > 0
    ? position
    : null;
}

function isClassifiedResult(result) {
  return (
    result?.dnf !== true &&
    result?.dns !== true &&
    result?.dsq !== true &&
    getValidPosition(result) !== null
  );
}

function getStatusClass(status) {
  switch (status) {
    case "Finished":
      return "result-finished";
    case "DNF":
      return "result-dnf";
    case "DNS":
      return "result-dns";
    case "DSQ":
      return "result-dsq";
    default:
      return "";
  }
}

// ============================================================
// SEASON SELECTOR
// ============================================================

function populateYears() {
  if (!yearSelect) return;

  yearSelect.innerHTML = "";

  // OpenF1 historical data is documented from 2023 onwards.
  const firstAvailableYear = Math.max(MIN_SEASON, 2023);
  const lastAvailableYear = Math.min(
    MAX_SEASON,
    DEFAULT_SEASON
  );

  for (
    let year = lastAvailableYear;
    year >= firstAvailableYear;
    year--
  ) {
    const option = document.createElement("option");

    option.value = String(year);
    option.textContent = String(year);

    yearSelect.appendChild(option);
  }

  const preferredYear = Math.min(
    Math.max(DEFAULT_SEASON, firstAvailableYear),
    lastAvailableYear
  );

  yearSelect.value = String(preferredYear);
}

// ============================================================
// SESSION SELECTOR
// ============================================================

function isRaceSession(session) {
  const name = String(session.session_name || "")
    .trim()
    .toLowerCase();

  return name === "race" || name === "sprint";
}

function populateSessions(sessions) {
  if (!sessionSelect) return;

  sessionSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a Grand Prix";

  sessionSelect.appendChild(placeholder);

  const raceSessions = sessions
    .filter(isRaceSession)
    .sort((a, b) => {
      return new Date(a.date_start || 0) -
        new Date(b.date_start || 0);
    });

  raceSessions.forEach((session) => {
    const option = document.createElement("option");

    option.value = String(session.session_key);
    option.textContent = [
      getSessionLabel(session),
      getSessionDate(session)
    ]
      .filter(Boolean)
      .join(" · ");

    sessionSelect.appendChild(option);
  });

  return raceSessions;
}

// ============================================================
// LOAD SEASONS AND SESSIONS
// ============================================================

async function loadSessions() {
  const version = ++requestVersion;
  const year = Number(yearSelect?.value);

  if (!Number.isInteger(year)) {
    setStatus("Vui lòng chọn mùa giải.", "error");
    return;
  }

  setLoading(true);
  showEmpty("Loading race schedule...");
  setStatus(`Đang tải lịch đua mùa ${year}...`);

  try {
    const sessions = await getSessions(year);

    if (version !== requestVersion) return;

    if (!Array.isArray(sessions)) {
      throw new Error("API không trả về danh sách session hợp lệ.");
    }

    currentSessions = sessions;

    const raceSessions = populateSessions(sessions);

    if (!raceSessions.length) {
      showEmpty("Không tìm thấy Race hoặc Sprint trong mùa giải này.");
      setStatus(`Không có phiên đua phù hợp trong mùa ${year}.`);
      return;
    }

    setStatus(
      `Đã tải ${raceSessions.length} phiên Race/Sprint cho mùa ${year}.`
    );

    // Tự động chọn phiên đua gần nhất có kết quả,
    // bắt đầu tìm từ phiên mới nhất trở về trước.
    for (const session of [...raceSessions].reverse()) {
      if (version !== requestVersion) return;

      try {
        const results = await getSessionResult(session.session_key);

        if (version !== requestVersion) return;

        if (Array.isArray(results) && results.length > 0) {
          sessionSelect.value = String(session.session_key);
          await loadResults();
          return;
        }
      } catch {
        // Một session có thể chưa có kết quả.
        // Tiếp tục thử session trước đó.
      }
    }

    showEmpty("Chưa có kết quả chính thức cho các phiên đua này.");
    setStatus("Không tìm thấy kết quả đã được công bố.");
  } catch (error) {
    if (version !== requestVersion) return;

    showEmpty("Không thể tải lịch đua.");
    setStatus(`Lỗi: ${getErrorMessage(error)}`, "error");
  } finally {
    if (version === requestVersion) {
      setLoading(false);
    }
  }
}

// ============================================================
// RACE SUMMARY
// ============================================================

function renderRaceSummary(sortedResults, driverMap) {
  if (!Array.isArray(sortedResults) || sortedResults.length === 0) {
    return "";
  }

  const getDriver = (result) =>
    driverMap.get(Number(result?.driver_number));

  const winner = sortedResults.find(
    (result) =>
      getValidPosition(result) === 1 &&
      isClassifiedResult(result)
  );

  const second = sortedResults.find(
    (result) =>
      getValidPosition(result) === 2 &&
      isClassifiedResult(result)
  );

  const podium = sortedResults.filter((result) => {
    const position = getValidPosition(result);
    return (
      position !== null &&
      position <= 3 &&
      isClassifiedResult(result)
    );
  });

  const classified = sortedResults.filter(isClassifiedResult);

  const dnfCount = sortedResults.filter(
    (result) => result?.dnf === true
  ).length;

  const dnsCount = sortedResults.filter(
    (result) => result?.dns === true
  ).length;

  const dsqCount = sortedResults.filter(
    (result) => result?.dsq === true
  ).length;

  const maxLaps = Math.max(
    0,
    ...sortedResults.map((result) => {
      const laps = Number(result?.number_of_laps);
      return Number.isFinite(laps) && laps > 0 ? laps : 0;
    })
  );

  const winnerDriver = winner ? getDriver(winner) : null;
  const winnerName = winner
    ? getDriverName(winnerDriver)
    : "Not available";
  const winnerTeam = winnerDriver?.team_name || "—";

  const winningGap = second
    ? formatGap(second.gap_to_leader, 2)
    : "—";

  const podiumHTML = podium.map((result) => {
    const driver = getDriver(result);
    const position = getValidPosition(result);
    const name = getDriverName(driver);
    const code = getDriverCode(driver);
    const team = driver?.team_name || "—";
    const color = getDriverColor(driver);

    return `
      <div class="race-summary-podium-item">
        <span class="race-summary-position">P${position}</span>
        <span
          class="race-summary-team-color"
          style="background-color: ${color}"
          aria-hidden="true"
        ></span>
        <span class="race-summary-driver">
          <strong>${escapeHTML(name)}</strong>
          <small>${escapeHTML(code)} · ${escapeHTML(team)}</small>
        </span>
      </div>
    `;
  }).join("");

  const nonFinishers = dnfCount + dnsCount + dsqCount;

  return `
    <section class="race-summary" aria-label="Race Summary">
      <div class="race-summary-header">
        <h3>RACE SUMMARY</h3>
        <span>${escapeHTML(winnerTeam === "—" ? "RACE" : "RACE RESULTS")}</span>
      </div>

      <div class="race-summary-grid">
        <article class="race-summary-card">
          <span class="race-summary-label">WINNER</span>
          <strong>${escapeHTML(winnerName)}</strong>
          <small>${escapeHTML(winnerTeam)}</small>
        </article>

        <article class="race-summary-card">
          <span class="race-summary-label">GAP TO P2</span>
          <strong>${escapeHTML(winningGap)}</strong>
          <small>Winning margin</small>
        </article>

        <article class="race-summary-card">
          <span class="race-summary-label">CLASSIFIED</span>
          <strong>${classified.length}</strong>
          <small>Of ${sortedResults.length} drivers</small>
        </article>

        <article class="race-summary-card">
          <span class="race-summary-label">NON-FINISHERS</span>
          <strong>${nonFinishers}</strong>
          <small>DNF ${dnfCount} · DNS ${dnsCount} · DSQ ${dsqCount}</small>
        </article>
      </div>

      ${
        podium.length > 0
          ? `
            <div class="race-summary-podium">
              <h4>FINAL PODIUM</h4>
              <div class="race-summary-podium-list">
                ${podiumHTML}
              </div>
            </div>
          `
          : ""
      }

      <div class="race-summary-footer">
        <span>RACE DISTANCE</span>
        <strong>${maxLaps > 0 ? `${maxLaps} Laps` : "—"}</strong>
      </div>
    </section>
  `;
}// ============================================================
// RENDER RESULTS
// ============================================================

function renderResults(results, drivers, session) {
  if (!resultsContainer) return;

  if (!Array.isArray(results) || results.length === 0) {
    showEmpty("Chưa có kết quả cho phiên đua này.");
    return;
  }

  const driverMap = new Map(
    (Array.isArray(drivers) ? drivers : []).map((driver) => [
      Number(driver.driver_number),
      driver
    ])
  );

  const sortedResults = [...results].sort((a, b) => {
    const positionA = getValidPosition(a);
    const positionB = getValidPosition(b);

    if (positionA === null && positionB === null) return 0;
    if (positionA === null) return 1;
    if (positionB === null) return -1;

    return positionA - positionB;
  });

  const rows = sortedResults.map((result) => {
    const driver = driverMap.get(Number(result.driver_number));
    const name = getDriverName(driver);
    const code = getDriverCode(driver);
    const team = driver?.team_name || "—";
    const color = getDriverColor(driver);
    const status = getResultStatus(result);
    const statusClass = getStatusClass(status);

    const position = getValidPosition(result) ?? "—";
    const number = result.driver_number ?? "—";
    const laps = result.number_of_laps ?? "—";

    const duration = formatDuration(result.duration);
    const gap = formatGap(result.gap_to_leader, Number(position));

    return `
      <tr>
        <td class="result-position">${escapeHTML(position)}</td>

        <td class="result-driver-number">
          ${escapeHTML(number)}
        </td>

        <td class="result-driver">
          <span
            class="result-team-color"
            style="background-color: ${color}"
            aria-hidden="true"
          ></span>

          <span class="result-driver-info">
            <strong>${escapeHTML(name)}</strong>
            <small>${escapeHTML(code)}</small>
          </span>
        </td>

        <td class="result-team">${escapeHTML(team)}</td>

        <td class="result-time">${escapeHTML(duration)}</td>

        <td class="result-gap">${escapeHTML(gap)}</td>

        <td class="result-laps">${escapeHTML(laps)}</td>

        <td>
          <span class="result-status ${statusClass}">
            ${escapeHTML(status)}
          </span>
        </td>
      </tr>
    `;
  });

  resultsContainer.innerHTML = `
    ${renderRaceIdentity(session, sortedResults.length)}

    ${renderRaceSummary(sortedResults, driverMap)}

    <div class="panel-head results-classification-header">
      <h2>Final Classification</h2>
      <span class="tag">RACE RESULTS</span>
    </div>

    <div class="results-table-wrapper">
      <table class="results-table">
        <thead>
          <tr>
            <th scope="col">Pos</th>
            <th scope="col">No.</th>
            <th scope="col">Driver</th>
            <th scope="col">Team</th>
            <th scope="col">Time</th>
            <th scope="col">Gap</th>
            <th scope="col">Laps</th>
            <th scope="col">Status</th>
          </tr>
        </thead>

        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// LOAD ONE SESSION RESULT
// ============================================================

async function loadResults() {
  const sessionKey = Number(sessionSelect?.value);
  const version = ++requestVersion;

  if (!Number.isInteger(sessionKey) || sessionKey <= 0) {
    showEmpty("Vui lòng chọn một Grand Prix.");
    setStatus("Chọn Grand Prix để tải kết quả.");
    return;
  }

  const session = currentSessions.find(
    (item) => Number(item.session_key) === sessionKey
  );

  setLoading(true);
  showEmpty("Loading race results...");
  setStatus("Đang tải kết quả và thông tin tay đua...");

  try {
    const results = await getSessionResult(sessionKey);

    if (version !== requestVersion) return;

    if (!Array.isArray(results) || results.length === 0) {
      showEmpty("Chưa có kết quả chính thức cho phiên đua này.");
      setStatus("API chưa có dữ liệu kết quả.", "info");
      return;
    }

    let drivers = [];

    try {
      drivers = await getDrivers(sessionKey);
    } catch (error) {
      // Vẫn hiển thị vị trí và số xe nếu thông tin tay đua lỗi.
      console.warn("Không tải được thông tin tay đua:", error);
    }

    if (version !== requestVersion) return;

    renderResults(results, drivers, session);

    const label = session ? getSessionLabel(session) : "Grand Prix";

    setStatus(
      `${label}: ${results.length} tay đua.`,
      "success"
    );
  } catch (error) {
    if (version !== requestVersion) return;

    showEmpty("Không thể tải kết quả.");
    setStatus(`Lỗi: ${getErrorMessage(error)}`, "error");
  } finally {
    if (version === requestVersion) {
      setLoading(false);
    }
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

export async function initRaceResults() {
  if (initialized) return;

  if (
    !yearSelect ||
    !sessionSelect ||
    !refreshButton ||
    !statusElement ||
    !resultsContainer
  ) {
    console.error(
      "Race Results: thiếu một hoặc nhiều HTML element bắt buộc."
    );
    return;
  }

  initialized = true;

  populateYears();

  yearSelect.addEventListener("change", loadSessions);

  sessionSelect.addEventListener("change", loadResults);

  refreshButton.addEventListener("click", () => {
    if (sessionSelect.value) {
      loadResults();
    } else {
      loadSessions();
    }
  });

  await loadSessions();
}