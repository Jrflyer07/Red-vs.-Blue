// Red vs Blue scoreboard (UR-09, UR-10) - Peyton
//
// How it works:
//   1. Each time the page polls /api/state, it calls Scoreboard.update(state).
//   2. Four times a second, render() recalculates both scores and the hold
//      timer from timestamps and writes them to the page.
//
// Nothing here ever does "score = score + 1". Every number is recalculated
// from the clock, so it stays right even if the tab was asleep for an hour.
//
// The state object this file expects from /api/state:
//   {
//     holder:    "red" | "blue" | null,
//     holdStart: "2026-10-05T18:00:00.000Z" | null,
//     redScore:  1204.5,     // seconds held, as of serverNow
//     blueScore: 873,
//     serverNow: "2026-10-05T18:02:14.000Z"
//   }

(function () {
  'use strict';

  const TEAM_NAMES = { red: 'Red', blue: 'Blue' };
  const REDRAW_EVERY_MS = 250;

  let state = null;       // the most recent answer from /api/state
  let clockOffsetMs = 0;  // server clock minus this device's clock

  // Accepts an ISO string ("2026-10-05T18:00:00Z") or a number of milliseconds.
  function toMs(time) {
    return new Date(time).getTime();
  }

  // The current time according to the server, not this device.
  function serverTimeMs() {
    return Date.now() + clockOffsetMs;
  }

  // ---- The math (no page access, so it is easy to test) ------------------

  // Both scores right now. The server's numbers were correct at serverNow;
  // the holding team has earned 1 more point for every second since then.
  function liveScores(s, nowMs) {
    const secondsSinceAnswer = Math.max(0, (nowMs - toMs(s.serverNow)) / 1000);
    return {
      red: s.redScore + (s.holder === 'red' ? secondsSinceAnswer : 0),
      blue: s.blueScore + (s.holder === 'blue' ? secondsSinceAnswer : 0),
    };
  }

  // How long the current team has held the button, in seconds.
  function heldSeconds(s, nowMs) {
    if (!s.holder || !s.holdStart) return 0;
    return Math.max(0, (nowMs - toMs(s.holdStart)) / 1000);
  }

  // 134 -> "2:14"     3734 -> "1:02:14"
  function formatDuration(totalSeconds) {
    const whole = Math.floor(totalSeconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const seconds = whole % 60;
    const twoDigits = (n) => String(n).padStart(2, '0');
    if (hours > 0) return hours + ':' + twoDigits(minutes) + ':' + twoDigits(seconds);
    return minutes + ':' + twoDigits(seconds);
  }

  // ---- Talking to the page ------------------------------------------------

  // Call this with the JSON from /api/state every time a poll comes back.
  function update(newState) {
    const receivedAtMs = Date.now();
    const hasServerTime = Boolean(newState.serverNow);

    state = {
      holder: newState.holder || null,
      holdStart: newState.holdStart || null,
      // "|| 0" keeps the page working before the scores are added to the API.
      redScore: Number(newState.redScore) || 0,
      blueScore: Number(newState.blueScore) || 0,
      serverNow: hasServerTime ? newState.serverNow : receivedAtMs,
    };

    // How far this device's clock is from the server's. Measured once per poll.
    clockOffsetMs = hasServerTime ? toMs(newState.serverNow) - receivedAtMs : 0;

    render();
  }

  function render() {
    const board = document.getElementById('scoreboard');
    if (!state || !board) return; // no data yet, or the HTML is not on this page

    const nowMs = serverTimeMs();
    const scores = liveScores(state, nowMs);

    // Scores, rounded down to whole points.
    document.getElementById('sb-red-score').textContent =
      Math.floor(scores.red).toLocaleString();
    document.getElementById('sb-blue-score').textContent =
      Math.floor(scores.blue).toLocaleString();

    // The bar: red's share of all points. 50/50 until someone scores.
    const total = scores.red + scores.blue;
    const redShare = total > 0 ? (scores.red / total) * 100 : 50;
    document.getElementById('sb-bar-red').style.width = redShare + '%';

    // The timer sentence. data-holder lets the CSS highlight the holding team.
    const timer = document.getElementById('sb-timer');
    if (state.holder) {
      board.dataset.holder = state.holder;
      timer.textContent =
        TEAM_NAMES[state.holder] + ' has held it for ' +
        formatDuration(heldSeconds(state, nowMs));
    } else {
      board.dataset.holder = 'none';
      timer.textContent = 'Nobody holds the button yet.';
    }
  }

  // Redraw between polls so the numbers keep moving.
  setInterval(render, REDRAW_EVERY_MS);

  window.Scoreboard = { update, liveScores, heldSeconds, formatDuration };
})();
