1. Code bổ sung cho js/race-results.js

// ============================================================
// RACE SUMMARY
// ============================================================

function renderRaceSummary(sortedResults, driverMap) {
  if (!Array.isArray(sortedResults) || sortedResults.length === 0) {
    return "";
  }

  const getDriver = (result) =>
    driverMap.get(Number(result.driver_number));

  const getPosition = (result) => Number(result.position);

  const winner = sortedResults.find(
    (result) => getPosition(result) === 1
  );

  const second = sortedResults.find(
    (result) => getPosition(result) === 2
  );

  const podium = sortedResults.filter((result) => {
    const position = getPosition(result);
    return position >= 1 && position <= 3;
  });

  const classified = sortedResults.filter((result) => {
    return (
      result.dnf !== true &&
      result.dns !== true &&
      result.dsq !== true &&
      Number.isFinite(getPosition(result))
    );
  });

  const dnfCount = sortedResults.filter(
    (result) => result.dnf === true
  ).length;

  const dnsCount = sortedResults.filter(
    (result) => result.dns === true
  ).length;

  const dsqCount = sortedResults.filter(
    (result) => result.dsq === true
  ).length;

  const maxLaps = Math.max(
    0,
    ...sortedResults.map((result) => {
      const laps = Number(result.number_of_laps);
      return Number.isFinite(laps) ? laps : 0;
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
    const position = getPosition(result);
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
        <span>KEY RACE STATISTICS</span>
      </div>

      <div class="race-summary-grid">

        <article class="race-summary-card">
          <span class="race-summary-label">WINNING DRIVER</span>
          <strong>${escapeHTML(winnerName)}</strong>
          <small>${escapeHTML(winnerTeam)}</small>
        </article>

        <article class="race-summary-card">
          <span class="race-summary-label">WINNING GAP</span>
          <strong>${escapeHTML(winningGap)}</strong>
          <small>Gap to P2</small>
        </article>

        <article class="race-summary-card">
          <span class="race-summary-label">CLASSIFIED</span>
          <strong>${classified.length}</strong>
          <small>Of ${sortedResults.length} drivers</small>
        </article>

        <article class="race-summary-card">
          <span class="race-summary-label">NON-FINISHERS</span>
          <strong>${nonFinishers}</strong>
          <small>
            DNF ${dnfCount} · DNS ${dnsCount} · DSQ ${dsqCount}
          </small>
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
        <strong>${maxLaps} Laps</strong>
      </div>

    </section>
  `;
}
2. Thay đổi trong renderResults()
Tìm đoạn cuối hàm hiện tại:
resultsContainer.innerHTML = `
  <div class="results-table-wrapper">
    ...
  </div>
`;

Thay bằng:

resultsContainer.innerHTML = `
  ${renderRaceSummary(sortedResults, driverMap)}

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

3. CSS bổ sung cho css/race-results.css


/* ============================================================
   RACE SUMMARY
   ============================================================ */

.race-summary {
  margin-bottom: 24px;
  padding: 18px;
  background: var(--surface, #161b24);
  border: 1px solid var(--border, #303846);
  border-radius: 10px;
}

.race-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.race-summary-header h3 {
  margin: 0;
  color: var(--text-primary, #f1f3f5);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.race-summary-header > span {
  color: var(--text-muted, #929baa);
  font-size: 11px;
}

.race-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.race-summary-card {
  min-width: 0;
  padding: 14px;
  background: var(--card-bg, #222936);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.race-summary-label {
  color: var(--text-muted, #a0a8b5);
  font-size: 11px;
  font-weight: 500;
}

.race-summary-card > strong {
  color: var(--text-primary, #f1f3f5);
  font-size: 20px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.race-summary-card > small {
  color: var(--text-secondary, #aeb7c4);
  font-size: 12px;
}

.race-summary-podium {
  margin-top: 20px;
}

.race-summary-podium h4 {
  margin: 0 0 12px;
  color: var(--text-primary, #f1f3f5);
  font-size: 13px;
  font-weight: 700;
}

.race-summary-podium-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.race-summary-podium-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  background: var(--card-bg, #222936);
  border-radius: 8px;
}

.race-summary-position {
  flex-shrink: 0;
  color: var(--text-primary, #ffffff);
  font-size: 14px;
  font-weight: 800;
}

.race-summary-team-color {
  width: 3px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 3px;
}

.race-summary-driver {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.race-summary-driver strong {
  color: var(--text-primary, #ffffff);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.race-summary-driver small {
  color: var(--text-muted, #a0a8b5);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.race-summary-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border, #303846);
}

.race-summary-footer span {
  color: var(--text-muted, #a0a8b5);
  font-size: 11px;
}

.race-summary-footer strong {
  color: var(--text-primary, #ffffff);
  font-size: 14px;
}

@media (max-width: 700px) {
  .race-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .race-summary-podium-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 400px) {
  .race-summary {
    padding: 12px;
  }

  .race-summary-card {
    padding: 10px;
  }

  .race-summary-card > strong {
    font-size: 17px;
  }
}
