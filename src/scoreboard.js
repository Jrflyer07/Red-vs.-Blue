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
      holder: newState.holder || null,
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
      timer.textContent =
        TEAM_NAMES[state.holder] + ' has held it for ' +
        formatDuration(heldSeconds(state, nowMs));
    } else {
      board.dataset.holder = 'NONE';
      timer.textContent = 'Nobody holds the button yet.';
    }
  }

  setInterval(render, REDRAW_EVERY_MS);

  window.Scoreboard = { update, liveScores, heldSeconds, formatDuration };
})();
