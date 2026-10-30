
/* ============================================
   APEX F1 — APPLICATION ENTRY POINT
   File: js/app.js
   ============================================ */

import { loadChampionship } from "./championship.js";
import { loadSchedule } from "./schedule.js";
import { initRaceResults } from "./race-results.js";
import { validateConfig } from "./config.js";

// --------------------------------------------
// Application state
// --------------------------------------------

const state = {
  currentPage: null,
  initialized: false,

  loading: {
    championship: false,
    schedule: false,
    raceResults: false
  },

  reloadPending: {
    championship: false,
    schedule: false,
    raceResults: false
  },

  raceResultsInitialized: false
};

// --------------------------------------------
// DOM helpers
// --------------------------------------------

const $ = (id) => document.getElementById(id);

function getPageElements() {
  return {
    championship: $("championship-page"),
    schedule: $("schedule-page"),
    raceResults: $("race-results-page"),

    navChamp: $("navChamp"),
    navSchedule: $("navSchedule"),
    navRaceResults: $("navRaceResults"),

    refreshChampionship: $("refresh"),
    refreshSchedule: $("scheduleRefresh"),
    refreshRaceResults: $("resultsRefresh"),

    scheduleYear: $("scheduleYear"),
    timezone: $("timezone")
  };
}

// --------------------------------------------
// Page navigation
// --------------------------------------------

export function showPage(page) {
  const validPages = [
    "championship",
    "schedule",
    "raceResults"
  ];

  if (!validPages.includes(page)) {
    console.error(`Unknown page: ${page}`);
    return;
  }

  const elements = getPageElements();

  if (
    !elements.championship ||
    !elements.schedule ||
    !elements.raceResults
  ) {
    console.error(
      "Page sections are missing from index.html."
    );
    return;
  }

  if (state.currentPage === page) {
    return;
  }

  state.currentPage = page;

  // Show only the selected page.
  elements.championship.hidden = page !== "championship";
  elements.schedule.hidden = page !== "schedule";
  elements.raceResults.hidden = page !== "raceResults";

  updateNavigation(elements, page);

  // Load data for the selected page.
  switch (page) {
    case "championship":
      void loadChampionshipSafely();
      break;

    case "schedule":
      void loadScheduleSafely();
      break;

    case "raceResults":
      void loadRaceResultsSafely();
      break;
  }
}

function updateNavigation(elements, currentPage) {
  const navigation = [
    ["navChamp", "championship"],
    ["navSchedule", "schedule"],
    ["navRaceResults", "raceResults"]
  ];

  navigation.forEach(([elementKey, page]) => {
    const button = elements[elementKey];

    if (!button) return;

    const isActive = currentPage === page;

    button.classList.toggle("active", isActive);
    button.classList.toggle("secondary", !isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

// --------------------------------------------
// Safe page loading
// --------------------------------------------

async function loadChampionshipSafely() {
  if (state.loading.championship) {
    state.reloadPending.championship = true;
    return;
  }

  state.loading.championship = true;

  const button = $("refresh");

  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    await loadChampionship();
  } catch (error) {
    console.error("Championship loading failed:", error);
  } finally {
    state.loading.championship = false;

    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }

    if (state.reloadPending.championship) {
      state.reloadPending.championship = false;

      if (state.currentPage === "championship") {
        void loadChampionshipSafely();
      }
    }
  }
}

async function loadScheduleSafely() {
  if (state.loading.schedule) {
    state.reloadPending.schedule = true;
    return;
  }

  state.loading.schedule = true;

  const button = $("scheduleRefresh");

  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    await loadSchedule();
  } catch (error) {
    console.error("Schedule loading failed:", error);
  } finally {
    state.loading.schedule = false;

    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }

    if (state.reloadPending.schedule) {
      state.reloadPending.schedule = false;

      if (state.currentPage === "schedule") {
        void loadScheduleSafely();
      }
    }
  }
}

// --------------------------------------------
// Race Results initialization and refresh
// --------------------------------------------

async function loadRaceResultsSafely() {
  if (state.loading.raceResults) {
    state.reloadPending.raceResults = true;
    return;
  }

  state.loading.raceResults = true;

  const button = $("resultsRefresh");

  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    if (!state.raceResultsInitialized) {
      await initRaceResults();
      state.raceResultsInitialized = true;
    } else {
      // The Race Results module registers its own Refresh
      // handler. Trigger that handler to reload the selected
      // session, or reload sessions if none is selected.
      if (button) {
        button.click();
      }
    }
  } catch (error) {
    console.error("Race Results loading failed:", error);

    const status = $("resultsStatus");

    if (status) {
      status.textContent = "Không thể tải kết quả cuộc đua.";
      status.dataset.state = "error";
    }
  } finally {
    state.loading.raceResults = false;

    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }

    if (state.reloadPending.raceResults) {
      state.reloadPending.raceResults = false;

      if (state.currentPage === "raceResults") {
        void loadRaceResultsSafely();
      }
    }
  }
}

// --------------------------------------------
// Timezone handling
// --------------------------------------------

async function handleTimezoneChange() {
  try {
    const timezoneModule = await import("./timezone.js");

    if (
      typeof timezoneModule.updateTimezoneNote === "function"
    ) {
      timezoneModule.updateTimezoneNote();
    }

    // Re-render existing schedule data when possible.
    if (typeof window.renderSchedule === "function") {
      window.renderSchedule();
      return;
    }

    if (state.currentPage === "schedule") {
      void loadScheduleSafely();
    }
  } catch (error) {
    console.error("Timezone update failed:", error);
  }
}

// --------------------------------------------
// Event registration
// --------------------------------------------

function registerEvents(elements) {
  elements.navChamp?.addEventListener("click", () => {
    showPage("championship");
  });

  elements.navSchedule?.addEventListener("click", () => {
    showPage("schedule");
  });

  elements.navRaceResults?.addEventListener("click", () => {
    showPage("raceResults");
  });

  elements.refreshChampionship?.addEventListener("click", () => {
    void loadChampionshipSafely();
  });

  elements.refreshSchedule?.addEventListener("click", () => {
    void loadScheduleSafely();
  });

  elements.refreshRaceResults?.addEventListener("click", () => {
    // Refresh is handled by race-results.js after initialization.
    // Before initialization, loadRaceResultsSafely initializes it.
    if (!state.raceResultsInitialized) {
      void loadRaceResultsSafely();
    }
  });

  elements.scheduleYear?.addEventListener("change", () => {
    if (state.currentPage === "schedule") {
      void loadScheduleSafely();
    }
  });

  elements.timezone?.addEventListener("change", () => {
    void handleTimezoneChange();
  });
}

// --------------------------------------------
// Initialize application
// --------------------------------------------

export function initApp() {
  if (state.initialized) return;

  try {
    const validation = validateConfig();

    // Support validateConfig implementations that return
    // { valid: false, errors: [...] } instead of throwing.
    if (validation?.valid === false) {
      console.error(
        "APEX F1 configuration error:",
        validation.errors
      );
      return;
    }
  } catch (error) {
    console.error("APEX F1 configuration error:", error);
    return;
  }

  const elements = getPageElements();

  if (
    !elements.championship ||
    !elements.schedule ||
    !elements.raceResults
  ) {
    console.error(
      "Cannot initialize APEX F1: required page elements are missing."
    );
    return;
  }

  registerEvents(elements);

  state.initialized = true;

  // Allow navigation from other scripts or DevTools.
  window.showPage = showPage;

  // Open Championship by default.
  showPage("championship");

  console.info("APEX F1 initialized.");
}

// --------------------------------------------
// Start when DOM is ready
// --------------------------------------------

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initApp,
    { once: true }
  );
} else {
  initApp();
}
