
const RESET_TZ = 'America/Chicago';
const resetFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
});

function is1159pmCentral(ms) {
  const parts = resetFmt.formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get('hour') === 23 && get('minute') === 59;
}

// Next 11:59 PM Central: 04:59 UTC (summer) or 05:59 UTC (winter)
function nextResetMs(now = Date.now()) {
  const d = new Date(now);
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  for (let day = 0; day <= 3; day++) {
    for (const hour of [4, 5]) {
      const t = base + day * 86400000 + hour * 3600000 + 59 * 60000;
      if (t > now && is1159pmCentral(t)) return t;
    }
  }
  return null;
}

function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

let resetTarget = nextResetMs();
setInterval(() => {
  const el = document.getElementById('reset-countdown');
  if (!el) return;
  if (Date.now() >= resetTarget) resetTarget = nextResetMs();
  el.textContent = 'Scoreboard resets in ' + formatCountdown(resetTarget - Date.now());
}, 1000);

// UR-13: Scores count up live while a team holds the button.

(function () {
  'use strict';

  const TEAM_NAMES = { RED: 'Red', BLUE: 'Blue' };
  const REDRAW_EVERY_MS = 250;
  

  let state = null;
  let clockOffsetMs = 0;

  function toMs(time) {
    return new Date(time).getTime();
  }

  function serverTimeMs() {
    return Date.now() + clockOffsetMs;
  }

  function liveScores(s, nowMs) {
    const secondsSinceAnswer = Math.max(0, (nowMs - toMs(s.serverNow)) / 1000);
    return {
      red: s.redScore + (s.holder === 'RED' ? secondsSinceAnswer : 0),
      blue: s.blueScore + (s.holder === 'BLUE' ? secondsSinceAnswer : 0),
    };
  }

  function heldSeconds(s, nowMs) {
    if (!s.holder || !s.holdStart) return 0;
    return Math.max(0, (nowMs - toMs(s.holdStart)) / 1000);
  }

  function formatDuration(totalSeconds) {
    const whole = Math.floor(totalSeconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const seconds = whole % 60;
    const twoDigits = (n) => String(n).padStart(2, '0');
    if (hours > 0) return hours + ':' + twoDigits(minutes) + ':' + twoDigits(seconds);
    return minutes + ':' + twoDigits(seconds);
  }

  function update(newState) {
    const receivedAtMs = Date.now();
    const hasServerTime = Boolean(newState.serverNow);

    state = {
      // The API sends lowercase team names, but this file uses uppercase.
      holder: newState.holder ? newState.holder.toUpperCase() : null,
      holderUsername: newState.holderUsername || null,
      holdStart: newState.holdStart || null,
      redScore: Number(newState.redScore) || 0,
      blueScore: Number(newState.blueScore) || 0,
      serverNow: hasServerTime ? newState.serverNow : receivedAtMs,
    };

    clockOffsetMs = hasServerTime ? toMs(newState.serverNow) - receivedAtMs : 0;

    render();
  }

  function render() {
    const board = document.getElementById('scoreboard');
    if (!state || !board) return;

    const nowMs = serverTimeMs();
    const scores = liveScores(state, nowMs);

    document.getElementById('sb-red-score').textContent =
      Math.floor(scores.red).toLocaleString();
    document.getElementById('sb-blue-score').textContent =
      Math.floor(scores.blue).toLocaleString();

    const total = scores.red + scores.blue;
    const redShare = total > 0 ? (scores.red / total) * 100 : 50;
    document.getElementById('sb-bar-red').style.width = redShare + '%';

    const timer = document.getElementById('sb-timer');
    if (state.holder) {
      board.dataset.holder = state.holder;
      // Holds from before usernames were saved only have a team name.
      const holderName = state.holderUsername || TEAM_NAMES[state.holder];
      timer.textContent =
        holderName + ' has held the button for ' +
        formatDuration(heldSeconds(state, nowMs));
    } else {
      board.dataset.holder = 'NONE';
      timer.textContent = 'Nobody holds the button yet.';
    }
  }

  setInterval(render, REDRAW_EVERY_MS);

  window.Scoreboard = { update, liveScores, heldSeconds, formatDuration };
})();

