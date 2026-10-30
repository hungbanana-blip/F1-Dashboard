
/* ==========================================
   APEX F1 — SCHEDULE MODULE
   File: js/schedule.js
   ========================================== */

import { getSessions } from "./api.js";

import {
  DEFAULT_SEASON,
  DEFAULT_TIMEZONE,
  MIN_SEASON,
  MAX_SEASON,
  TIMEZONE_OPTIONS,
  DATE_LOCALE
} from "./config.js";

// ------------------------------------------
// State
// ------------------------------------------

let sessionsData = [];
let isLoading = false;
let loadedYear = null;

// ------------------------------------------
// DOM helpers
// ------------------------------------------

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function setHTML(id, html) {
  const element = $(id);

  if (element) {
    element.innerHTML = html;
  }
}

// ------------------------------------------
// HTML escaping
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

// ------------------------------------------
// Date and timezone helpers
// ------------------------------------------

function getTimezone() {
  return $("timezone")?.value || DEFAULT_TIMEZONE;
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, timezone = getTimezone()) {
  const date = parseDate(value);

  if (!date) return "Time TBC";

  try {
    return new Intl.DateTimeFormat(DATE_LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: timezone
    }).format(date);
  } catch (error) {
    console.warn("Unable to format date:", error);
    return "Time unavailable";
  }
}

function formatTime(value, timezone = getTimezone()) {
  const date = parseDate(value);

  if (!date) return "TBC";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: timezone
    }).format(date);
  } catch (error) {
    console.warn("Unable to format time:", error);
    return "Unavailable";
  }
}

function formatDateTime(value, timezone = getTimezone()) {
  const date = parseDate(value);

  if (!date) return "Time TBC";

  return `${formatDate(value, timezone)} · ${formatTime(value, timezone)}`;
}

function getTimezoneLabel(timezone) {
  const option = TIMEZONE_OPTIONS.find(
    (item) => item.value === timezone
  );

  return option?.label || timezone;
}

// ------------------------------------------
// Season selector
// ------------------------------------------

function initializeSeasonSelector() {
  const select = $("scheduleYear");

  if (!select) return;

  if (select.options.length > 0) return;

  const currentYear = new Date().getFullYear();

  const firstYear = Math.max(2018, MIN_SEASON);
  const lastYear = Math.min(currentYear, MAX_SEASON);

  for (let year = lastYear; year >= firstYear; year--) {
    const option = document.createElement("option");

    option.value = String(year);
    option.textContent = String(year);

    select.appendChild(option);
  }

  const defaultYear = Math.min(
    Math.max(DEFAULT_SEASON, firstYear),
    lastYear
  );

  select.value = String(defaultYear);
}

// ------------------------------------------
// Timezone selector
// ------------------------------------------

function initializeTimezoneSelector() {
  const select = $("timezone");

  if (!select) return;

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

  if (!hasDefault) {
    const option = document.createElement("option");

    option.value = DEFAULT_TIMEZONE;
    option.textContent = getTimezoneLabel(DEFAULT_TIMEZONE);

    select.appendChild(option);
  }

  // Chỉ thiết lập mặc định khi chưa có giá trị hợp lệ.
  const hasCurrentValue = Array.from(select.options).some(
    (option) => option.value === select.value
  );

  if (!hasCurrentValue) {
    select.value = DEFAULT_TIMEZONE;
  }
}

// ------------------------------------------
// Session classification
// ------------------------------------------

function getSessionType(session) {
  return String(session.session_type || "").toLowerCase();
}

function getSessionLabel(session) {
  const type = getSessionType(session);
  const name = String(session.session_name || "").trim();

  if (name) return name;

  if (type === "practice") return "Practice";
  if (type === "qualifying") return "Qualifying";
  if (type === "sprint") return "Sprint";
  if (type === "race") return "Race";

  return "Session";
}

function getSessionTimestamp(session) {
  const date = parseDate(session.date_start);

  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function getSessionStatus(session) {
  const start = parseDate(session.date_start);
  const end = parseDate(session.date_end);
  const now = Date.now();

  if (start && now < start.getTime()) {
    return "upcoming";
  }

  if (
    start &&
    end &&
    now >= start.getTime() &&
    now <= end.getTime()
  ) {
    return "live";
  }

  if (end && now > end.getTime()) {
    return "completed";
  }

  return "scheduled";
}

// ------------------------------------------
// Group sessions by Grand Prix
// ------------------------------------------

function getMeetingKey(session) {
  if (
    session.meeting_key !== undefined &&
    session.meeting_key !== null
  ) {
    return `meeting-${session.meeting_key}`;
  }

  const meetingName = session.meeting_name || "Unknown Grand Prix";

  const date = session.date_start
    ? String(session.date_start).slice(0, 10)
    : "unknown-date";

  return `${meetingName}-${date}`;
}

function groupSessions(sessions) {
  const meetings = new Map();

  for (const session of sessions) {
    const key = getMeetingKey(session);

    if (!meetings.has(key)) {
      meetings.set(key, {
        key,
        name: session.meeting_name || "Grand Prix",
        circuit: session.circuit_short_name || "",
        country: session.country_name || "",
        location: session.location || "",
        dateStart: session.date_start || null,
        sessions: []
      });
    }

    const meeting = meetings.get(key);

    meeting.sessions.push(session);

    const sessionDate = parseDate(session.date_start);
    const meetingDate = parseDate(meeting.dateStart);

    if (
      sessionDate &&
      (!meetingDate || sessionDate < meetingDate)
    ) {
      meeting.dateStart = session.date_start;
    }

    if (!meeting.circuit && session.circuit_short_name) {
      meeting.circuit = session.circuit_short_name;
    }

    if (!meeting.country && session.country_name) {
      meeting.country = session.country_name;
    }

    if (!meeting.location && session.location) {
      meeting.location = session.location;
    }
  }

  return Array.from(meetings.values())
    .map((meeting) => ({
      ...meeting,

      sessions: meeting.sessions.sort(
        (a, b) => getSessionTimestamp(a) - getSessionTimestamp(b)
      )
    }))
    .sort((a, b) => {
      const dateA = parseDate(a.dateStart)?.getTime() ?? Infinity;
      const dateB = parseDate(b.dateStart)?.getTime() ?? Infinity;

      return dateA - dateB;
    });
}

// ------------------------------------------
// Find Grand Prix Race session
// ------------------------------------------

function getRaceSession(meeting) {
  return meeting.sessions.find((session) => {
    const name = String(session.session_name || "")
      .trim()
      .toLowerCase();

    return name === "race";
  }) || null;
}

// ------------------------------------------
// Filter meetings
// ------------------------------------------

function filterRelevantMeetings(meetings) {
  const now = Date.now();

  const classified = meetings
    .map((meeting) => {
      const raceSession = getRaceSession(meeting);

      // Chỉ lấy Grand Prix có phiên Race.
      if (!raceSession) return null;

      const raceStart = parseDate(raceSession.date_start);
      const raceEnd = parseDate(raceSession.date_end);

      let status = "scheduled";

      if (
        raceStart &&
        raceEnd &&
        now >= raceStart.getTime() &&
        now <= raceEnd.getTime()
      ) {
        status = "live";
      } else if (raceEnd && now > raceEnd.getTime()) {
        status = "completed";
      } else if (raceStart && now < raceStart.getTime()) {
        status = "upcoming";
      }

      return {
        ...meeting,
        raceSession,
        raceStart,
        raceEnd,
        raceStatus: status
      };
    })
    .filter(Boolean);

  // Meeting đang diễn ra: sắp xếp theo thời gian Race.
  const live = classified
    .filter((meeting) => meeting.raceStatus === "live")
    .sort((a, b) => {
      const timeA = a.raceStart?.getTime() ?? Infinity;
      const timeB = b.raceStart?.getTime() ?? Infinity;

      return timeA - timeB;
    });

  // Meeting sắp diễn ra: Race gần nhất đứng trước.
  const upcoming = classified
    .filter((meeting) => {
      return (
        meeting.raceStatus === "upcoming" ||
        meeting.raceStatus === "scheduled"
      );
    })
    .sort((a, b) => {
      const timeA = a.raceStart?.getTime() ?? Infinity;
      const timeB = b.raceStart?.getTime() ?? Infinity;

      return timeA - timeB;
    });

  // LIVE luôn đứng trước; các meeting completed không được render.
  const result = [
    ...live.map((meeting) => ({
      ...meeting,
      displayStatus: "live"
    })),
    ...upcoming.map((meeting) => ({
      ...meeting,
      displayStatus: "upcoming"
    }))
  ];

  return {
    meetings: result,
    live,
    upcoming
  };
}

// ------------------------------------------
// Render one session
// ------------------------------------------

function renderSession(session) {
  const status = getSessionStatus(session);
  const label = getSessionLabel(session);

  const start = session.date_start
    ? formatDateTime(session.date_start)
    : "Time TBC";

  const end = session.date_end
    ? formatTime(session.date_end)
    : "";

  const timeText = end && end !== "TBC"
    ? `${start} – ${end}`
    : start;

  return `
    <div class="session-row">
      <div class="session-name">
        <span class="session-status status-${escapeHTML(status)}"></span>
        <span>${escapeHTML(label)}</span>
      </div>

      <div class="session-time">
        ${escapeHTML(timeText)}
      </div>
    </div>
  `;
}

// ------------------------------------------
// Render Grand Prix card
// ------------------------------------------

function getMeetingBadge(displayStatus) {
  switch (displayStatus) {
    case "next-race":
      return {
        label: "NEXT RACE",
        className: "next-race"
      };

    case "live":
      return {
        label: "LIVE",
        className: "live"
      };

    default:
      return {
        label: "UPCOMING",
        className: "upcoming"
      };
  }
}

function renderMeeting(meeting) {
  const sessionHTML = meeting.sessions
    .map(renderSession)
    .join("");

  const locationParts = [
    meeting.location,
    meeting.country
  ].filter(Boolean);

  const locationText = [...new Set(locationParts)].join(", ");

  const dateText = meeting.raceSession?.date_start
    ? formatDate(meeting.raceSession.date_start)
    : meeting.dateStart
      ? formatDate(meeting.dateStart)
      : "Date TBC";

  const circuitHTML = meeting.circuit
    ? `<span class="race-circuit">${escapeHTML(meeting.circuit)}</span>`
    : "";

  const locationHTML = locationText
    ? `<span class="race-location">${escapeHTML(locationText)}</span>`
    : "";

  const badge = getMeetingBadge(meeting.displayStatus);

  return `
    <article class="race-card race-card-${badge.className}">

      <div class="race-card-head">
        <div class="race-number race-label-${badge.className}">
          ${badge.label}
        </div>

        <div class="race-date">
          ${escapeHTML(dateText)}
        </div>
      </div>

      <div class="race-card-body">

        <h2 class="race-title">
          ${escapeHTML(meeting.name)}
        </h2>

        <div class="race-meta">
          ${circuitHTML}
          ${locationHTML}
        </div>

        <div class="race-sessions">
          ${sessionHTML || '<div class="empty">No sessions available.</div>'}
        </div>

      </div>
    </article>
  `;
}

// ------------------------------------------
// Render schedule
// ------------------------------------------

export function renderSchedule() {
  const container = $("scheduleList");

  if (!container) return;

  if (!sessionsData.length) {
    setHTML(
      "scheduleList",
      '<div class="panel"><div class="empty">No schedule data available.</div></div>'
    );

    return;
  }

  const timezone = getTimezone();

  const allMeetings = groupSessions(sessionsData);

  const filtered = filterRelevantMeetings(allMeetings);

  if (!filtered.meetings.length) {
    setHTML(
      "scheduleList",
      '<div class="panel"><div class="empty">No upcoming race sessions available.</div></div>'
    );

    setText(
      "timezoneNote",
      `All session times shown in ${getTimezoneLabel(timezone)}.`
    );

    return;
  }

  // LIVE meetings đứng đầu. Nếu không có LIVE, upcoming đầu tiên là NEXT RACE.
  const nextRaceKey = filtered.live.length
    ? null
    : filtered.upcoming[0]?.key;

  const rendered = filtered.meetings
    .map((meeting) => {
      if (meeting.raceStatus === "live") {
        return renderMeeting({
          ...meeting,
          displayStatus: "live"
        });
      }

      if (meeting.key === nextRaceKey) {
        return renderMeeting({
          ...meeting,
          displayStatus: "next-race"
        });
      }

      return renderMeeting({
        ...meeting,
        displayStatus: "upcoming"
      });
    })
    .join("");

  setHTML(
    "scheduleList",
    rendered
  );

  const liveText = filtered.live.length
    ? ` · ${filtered.live.length} live`
    : "";

  const upcomingText = filtered.upcoming.length
    ? ` · ${filtered.upcoming.length} upcoming`
    : "";

  setText(
    "scheduleStatus",
    `${loadedYear} season${liveText}${upcomingText}`
  );

  setText(
    "timezoneNote",
    `All session times shown in ${getTimezoneLabel(timezone)}.`
  );
}

// ------------------------------------------
// Load schedule from OpenF1
// ------------------------------------------

export async function loadSchedule() {
  if (isLoading) return;

  initializeSeasonSelector();
  initializeTimezoneSelector();

  const select = $("scheduleYear");

  const year = Number(select?.value || DEFAULT_SEASON);

  if (
    !Number.isInteger(year) ||
    year < MIN_SEASON ||
    year > MAX_SEASON
  ) {
    setText("scheduleStatus", "Please select a valid season.");
    return;
  }

  isLoading = true;

  const button = $("scheduleRefresh");

  if (button) {
    button.disabled = true;
    button.textContent = "Loading...";
  }

  setText("scheduleStatus", `Loading ${year} schedule...`);

  setHTML(
    "scheduleList",
    '<div class="panel"><div class="empty">Loading race sessions...</div></div>'
  );

  try {
    const sessions = await getSessions(year);

    if (!Array.isArray(sessions)) {
      throw new Error("Invalid session data returned by OpenF1.");
    }

    sessionsData = sessions
      .filter((session) => session.date_start || session.meeting_name)
      .sort((a, b) => {
        return getSessionTimestamp(a) - getSessionTimestamp(b);
      });

    loadedYear = year;

    if (!sessionsData.length) {
      setText(
        "scheduleStatus",
        `No sessions found for ${year}.`
      );

      setHTML(
        "scheduleList",
        '<div class="panel"><div class="empty">No sessions returned by OpenF1 for this season.</div></div>'
      );

      return;
    }

    renderSchedule();

  } catch (error) {
    console.error("Schedule loading error:", error);

    setText(
      "scheduleStatus",
      error.message || "Unable to load schedule."
    );

    setHTML(
      "scheduleList",
      `<div class="panel"><div class="error">${escapeHTML(error.message || "Unable to load schedule. Check your connection and try again.")}</div></div>`
    );

  } finally {
    isLoading = false;

    if (button) {
      button.disabled = false;
      button.textContent = "↻ Refresh schedule";
    }
  }
}

// ------------------------------------------
// Compatibility with app.js
// ------------------------------------------

window.loadSchedule = loadSchedule;
window.renderSchedule = renderSchedule;

// ------------------------------------------
// Expose loaded season for debugging
// ------------------------------------------

export function getLoadedScheduleYear() {
  return loadedYear;
}
