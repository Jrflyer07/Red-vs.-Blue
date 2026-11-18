
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

(function () {
  'use strict';

  const REFRESH_MS = 5000;
  let latestRequest = 0;

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function getBoard() {
    let board = document.getElementById('leaderboard');
    if (board) return board;

    const anchor = document.getElementById('gameStatus') || document.getElementById('scoreboard');
    if (!anchor) return null;

    board = element('section', 'lb');
    board.id = 'leaderboard';
    board.setAttribute('aria-label', 'Rock paper scissors leaderboard');
    board.hidden = true;
    board.append(
      element('h2', 'lb-title', 'Rock paper scissors leaders'),
      element('ol', 'lb-list'),
      element('p', 'lb-empty', 'No contests yet.')
    );
    anchor.after(board);
    return board;
  }

  function currentUsername() {
    try {
      const saved = JSON.parse(localStorage.getItem('redvsblue.playerSession.v1'));
      return typeof saved?.username === 'string' ? saved.username.toLowerCase() : null;
    } catch (error) {
      return null;
    }
  }

  function renderLeaderboard(players) {
    const board = getBoard();
    if (!board) return;

    const list = board.querySelector('.lb-list');
    list.replaceChildren(...players.map((player) => {
      const team = player.team === 'red' || player.team === 'blue' ? player.team : 'none';
      const row = element('li', 'lb-row lb-row--' + team);
      row.append(
        element('span', 'lb-rank', String(player.rank)),
        element('span', 'lb-name', String(player.username)),
        element('span', 'lb-record', `${Number(player.wins) || 0}W ${Number(player.losses) || 0}L`)
      );
      if (currentUsername() === String(player.username).toLowerCase()) {
        row.classList.add('lb-row--you');
        row.querySelector('.lb-name').append(element('span', 'lb-you', 'You'));
      }
      return row;
    }));

    board.querySelector('.lb-empty').hidden = players.length > 0;
    board.hidden = false;
  }

  async function refreshLeaderboard() {
    if (!getBoard()) return;
    const request = ++latestRequest;
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) return;
      const data = await response.json();
      if (request !== latestRequest) return;
      renderLeaderboard(Array.isArray(data.players) ? data.players : []);
    } catch (error) {
      return;
    }
  }

  refreshLeaderboard();
  setInterval(refreshLeaderboard, REFRESH_MS);

  window.Leaderboard = { refresh: refreshLeaderboard, render: renderLeaderboard };
})();

(function () {
  'use strict';

  const POLL_MS = 5000;
  const TICK_MS = 1000;
  const POP_MS = 4000;

  let data = null;
  let offsetMs = 0;
  let latestRequest = 0;
  let lastRecordKey;
  let popTimer = null;

  function holdKey(hold) {
    return hold ? hold.username + '|' + hold.holdStart : null;
  }

  function formatTime(seconds) {
    if (window.Scoreboard && typeof window.Scoreboard.formatDuration === 'function') {
      return window.Scoreboard.formatDuration(seconds);
    }
    const whole = Math.floor(seconds);
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }

  function nameSpan(name, team) {
    const span = document.createElement('span');
    span.className = 'sb-king-name sb-king-name--' + (team === 'red' || team === 'blue' ? team : 'none');
    span.textContent = String(name);
    return span;
  }

  function getPanel() {
    let panel = document.getElementById('sb-king');
    if (panel) return panel;

    const timer = document.getElementById('sb-timer');
    if (!timer) return null;

    panel = document.createElement('div');
    panel.className = 'sb-king';
    panel.id = 'sb-king';
    panel.hidden = true;

    const holder = document.createElement('p');
    holder.className = 'sb-king-holder';
    const record = document.createElement('p');
    record.className = 'sb-king-record';
    const pop = document.createElement('p');
    pop.className = 'sb-king-pop';
    pop.setAttribute('role', 'status');
    pop.hidden = true;

    panel.append(holder, record, pop);
    timer.after(panel);
    return panel;
  }

  function bestToday(nowMs) {
    const king = data.king;
    const record = data.record;
    if (king) {
      const seconds = Math.max(0, (nowMs - king.holdStart) / 1000);
      if (!record || holdKey(record) === holdKey(king) || Math.floor(seconds) > record.seconds) {
        return { username: king.username, team: king.team, holdStart: king.holdStart, seconds, live: true };
      }
    }
    return record ? { ...record, live: false } : null;
  }

  function showPop(panel, record) {
    const pop = panel.querySelector('.sb-king-pop');
    pop.replaceChildren('👑 NEW RECORD! ', nameSpan(record.username, record.team));
    pop.hidden = false;
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { pop.hidden = true; }, POP_MS);
  }

  function draw() {
    const panel = getPanel();
    if (!panel || !data) return;

    const king = data.king;
    const best = bestToday(Date.now() + offsetMs);

    const holder = panel.querySelector('.sb-king-holder');
    if (king) {
      holder.replaceChildren('👑 King of the hill: ', nameSpan(king.username, king.team));
    } else {
      holder.textContent = '👑 The hill is empty. Take the button to be king.';
    }

    const record = panel.querySelector('.sb-king-record');
    if (best) {
      record.replaceChildren(
        "Today's record: ",
        nameSpan(best.username, best.team),
        ', ' + formatTime(best.seconds) + (best.live ? ' and counting' : '')
      );
    } else {
      record.textContent = 'No record yet today.';
    }

    const key = holdKey(best);
    if (lastRecordKey !== undefined && lastRecordKey !== null && key && key !== lastRecordKey && best.live) {
      showPop(panel, best);
    }
    if (!key) {
      clearTimeout(popTimer);
      panel.querySelector('.sb-king-pop').hidden = true;
    }
    lastRecordKey = key;

    panel.hidden = false;
  }

  async function refresh() {
    if (!getPanel()) return;
    const request = ++latestRequest;
    try {
      const response = await fetch('/api/king');
      if (!response.ok) return;
      const body = await response.json();
      if (request !== latestRequest) return;
      offsetMs = body.serverNow ? new Date(body.serverNow).getTime() - Date.now() : 0;
      data = { king: body.king || null, record: body.record || null };
      draw();
    } catch (error) {
      return;
    }
  }

  refresh();
  setInterval(refresh, POLL_MS);
  setInterval(draw, TICK_MS);

  window.KingOfTheHill = { refresh, draw };
})();

(function () {
  'use strict';

  const POLL_MS = 5000;
  const HEIGHT = 150;
  const MARGIN = { top: 12, right: 64, bottom: 24, left: 44 };
  const SVG_NS = 'http://www.w3.org/2000/svg';

  let events = [];
  let offsetMs = 0;
  let latestRequest = 0;
  let hoverX = null;

  function svg(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, value);
    return el;
  }

  function html(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function serverNow() {
    return Date.now() + offsetMs;
  }

  function scoresAt(t) {
    let current = null;
    for (const event of events) {
      if (event.t <= t) current = event;
      else break;
    }
    if (!current) return { red: 0, blue: 0 };
    const held = Math.max(0, (t - current.t) / 1000);
    return {
      red: current.red + (current.holder === 'red' ? held : 0),
      blue: current.blue + (current.holder === 'blue' ? held : 0),
    };
  }

  function niceMax(value) {
    if (value <= 10) return 10;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
      if (step * power >= value) return step * power;
    }
    return 10 * power;
  }

  function formatScore(value) {
    return Math.floor(value).toLocaleString();
  }

  function axisLabel(value, top) {
    if (value === 0) return '0';
    if (top >= 10000) return (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K';
    return Math.round(value).toLocaleString();
  }

  function formatClock(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function getFigure() {
    let figure = document.getElementById('sb-race');
    if (figure) return figure;

    const scoreboard = document.getElementById('scoreboard');
    if (!scoreboard) return null;

    figure = html('figure', 'sb-race');
    figure.id = 'sb-race';
    figure.hidden = true;

    const head = html('figcaption', 'sb-race-head');
    const legend = html('span', 'sb-race-legend');
    legend.append(
      html('span', 'sb-race-key sb-race-key--red'), 'Red',
      html('span', 'sb-race-key sb-race-key--blue'), 'Blue'
    );
    head.append(html('span', 'sb-race-title', "Today's score race"), legend);

    const plot = html('div', 'sb-race-plot');
    const tip = html('div', 'sb-race-tip');
    tip.hidden = true;
    plot.append(svg('svg', { class: 'sb-race-svg', role: 'img' }), tip);
    plot.addEventListener('pointermove', (event) => {
      hoverX = event.clientX - plot.getBoundingClientRect().left;
      draw();
    });
    plot.addEventListener('pointerleave', () => {
      hoverX = null;
      draw();
    });

    const details = html('details', 'sb-race-table');
    details.append(html('summary', '', 'Show as table'), html('table'));

    figure.append(head, plot, details);
    scoreboard.append(figure);
    return figure;
  }

  function buildTable(table, start, end) {
    const head = html('thead');
    const headRow = html('tr');
    for (const label of ['Time', 'Red', 'Blue']) headRow.append(html('th', '', label));
    head.append(headRow);

    const body = html('tbody');
    const times = [];
    const firstHour = new Date(start);
    firstHour.setMinutes(0, 0, 0);
    for (let t = firstHour.getTime() + 3600000; t < end; t += 3600000) times.push(t);
    times.push(end);
    for (const t of times) {
      const score = scoresAt(t);
      const row = html('tr');
      row.append(
        html('td', '', t === end ? 'Now' : formatClock(t)),
        html('td', '', formatScore(score.red)),
        html('td', '', formatScore(score.blue))
      );
      body.append(row);
    }
    table.replaceChildren(head, body);
  }

  function draw() {
    const figure = getFigure();
    if (!figure || events.length === 0) return;
    figure.hidden = false;

    const plot = figure.querySelector('.sb-race-plot');
    const chart = figure.querySelector('.sb-race-svg');
    const tip = figure.querySelector('.sb-race-tip');
    const width = Math.max(240, plot.clientWidth || 320);
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

    const end = serverNow();
    const start = Math.min(events[0].t, end - 60000);
    const now = scoresAt(end);
    const top = niceMax(Math.max(now.red, now.blue, ...events.map((event) => Math.max(event.red, event.blue))));
    const x = (t) => MARGIN.left + ((t - start) / (end - start)) * innerW;
    const y = (v) => MARGIN.top + innerH - (v / top) * innerH;

    chart.setAttribute('width', width);
    chart.setAttribute('height', HEIGHT);
    chart.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
    const leader = now.red === now.blue ? 'The teams are tied' : (now.red > now.blue ? 'Red leads' : 'Blue leads');
    chart.setAttribute('aria-label', `Today's score race. ${leader}: Red ${formatScore(now.red)}, Blue ${formatScore(now.blue)}.`);

    const nodes = [];
    for (const value of [0, top / 2, top]) {
      nodes.push(svg('line', { class: 'sb-race-grid', x1: MARGIN.left, x2: MARGIN.left + innerW, y1: y(value), y2: y(value) }));
      const label = svg('text', { class: 'sb-race-axis', x: MARGIN.left - 6, y: y(value) + 4, 'text-anchor': 'end' });
      label.textContent = axisLabel(value, top);
      nodes.push(label);
    }

    const startLabel = svg('text', { class: 'sb-race-axis', x: MARGIN.left, y: HEIGHT - 6, 'text-anchor': 'start' });
    startLabel.textContent = formatClock(start);
    const endLabel = svg('text', { class: 'sb-race-axis', x: MARGIN.left + innerW, y: HEIGHT - 6, 'text-anchor': 'end' });
    endLabel.textContent = 'Now';
    nodes.push(startLabel, endLabel);

    const times = events.map((event) => Math.max(event.t, start)).concat(end);
    for (const team of ['blue', 'red']) {
      const points = times.map((t) => `${x(t).toFixed(1)},${y(scoresAt(t)[team]).toFixed(1)}`).join(' ');
      nodes.push(svg('polyline', { class: `sb-race-line sb-race-line--${team}`, points }));
    }

    for (const team of ['blue', 'red']) {
      nodes.push(svg('circle', { class: `sb-race-dot sb-race-dot--${team}`, cx: x(end), cy: y(now[team]), r: 4 }));
    }

    if (Math.abs(y(now.red) - y(now.blue)) >= 14) {
      for (const team of ['red', 'blue']) {
        const label = svg('text', { class: 'sb-race-value', x: x(end) + 10, y: y(now[team]) + 4 });
        label.textContent = formatScore(now[team]);
        nodes.push(label);
      }
    }

    if (hoverX !== null && hoverX >= MARGIN.left && hoverX <= MARGIN.left + innerW) {
      const t = start + ((hoverX - MARGIN.left) / innerW) * (end - start);
      const score = scoresAt(t);
      nodes.push(svg('line', { class: 'sb-race-cross', x1: hoverX, x2: hoverX, y1: MARGIN.top, y2: MARGIN.top + innerH }));
      for (const team of ['blue', 'red']) {
        nodes.push(svg('circle', { class: `sb-race-dot sb-race-dot--${team}`, cx: hoverX, cy: y(score[team]), r: 4 }));
      }

      const rows = [['red', 'Red'], ['blue', 'Blue']].map(([team, name]) => {
        const row = html('div', 'sb-race-tip-row');
        row.append(html('span', `sb-race-key sb-race-key--${team}`), html('strong', '', formatScore(score[team])), html('span', '', name));
        return row;
      });
      tip.replaceChildren(html('div', 'sb-race-tip-time', formatClock(t)), ...rows);
      tip.hidden = false;
      const left = Math.min(Math.max(hoverX + 12, 0), width - 132);
      tip.style.left = (hoverX + 140 > width ? hoverX - 140 : left) + 'px';
    } else {
      tip.hidden = true;
    }

    chart.replaceChildren(...nodes);

    const details = figure.querySelector('.sb-race-table');
    if (details.open) buildTable(details.querySelector('table'), start, end);
  }

  async function refresh() {
    if (!getFigure()) return;
    const request = ++latestRequest;
    try {
      const response = await fetch('/api/score-history');
      if (!response.ok) return;
      const body = await response.json();
      if (request !== latestRequest) return;
      offsetMs = body.serverNow ? new Date(body.serverNow).getTime() - Date.now() : 0;
      events = (Array.isArray(body.events) ? body.events : [])
        .filter((event) => Number.isFinite(event.t))
        .map((event) => ({
          t: event.t,
          holder: event.holder === 'red' || event.holder === 'blue' ? event.holder : null,
          red: Number(event.red) || 0,
          blue: Number(event.blue) || 0,
        }))
        .sort((a, b) => a.t - b.t);
      draw();
    } catch (error) {
      return;
    }
  }

  refresh();
  setInterval(refresh, POLL_MS);
  window.addEventListener('resize', draw);
  document.addEventListener('toggle', draw, true);

  window.ScoreRace = { refresh, draw };
})();

(function () {
  'use strict';

  const POLL_MS = 10000;
  let latestRequest = 0;

  function html(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function savedUsername() {
    try {
      const saved = JSON.parse(localStorage.getItem('redvsblue.playerSession.v1'));
      return typeof saved?.username === 'string' && saved.username ? saved.username : null;
    } catch (error) {
      return null;
    }
  }

  function formatTime(seconds) {
    if (window.Scoreboard && typeof window.Scoreboard.formatDuration === 'function') {
      return window.Scoreboard.formatDuration(seconds);
    }
    const whole = Math.floor(seconds);
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
  }

  function getCard() {
    let card = document.getElementById('my-stats');
    if (card) return card;

    const anchor = document.getElementById('leaderboard') ||
      document.getElementById('gameStatus') ||
      document.getElementById('scoreboard');
    if (!anchor) return null;

    card = html('section', 'ms');
    card.id = 'my-stats';
    card.setAttribute('aria-label', 'Your stats');
    card.hidden = true;
    card.append(html('h2', 'ms-title'), html('p', 'ms-note'), html('div', 'ms-tiles'));
    anchor.after(card);
    return card;
  }

  function tile(label, value, detail) {
    const box = html('div', 'ms-tile');
    box.append(html('span', 'ms-label', label), html('span', 'ms-value', value));
    if (detail) box.append(html('span', 'ms-detail', detail));
    return box;
  }

  function render(stats) {
    const card = getCard();
    if (!card) return;

    const title = card.querySelector('.ms-title');
    const team = stats.team === 'red' || stats.team === 'blue' ? stats.team : 'none';
    title.replaceChildren('Your stats: ', html('span', 'ms-name ms-name--' + team, String(stats.username)));

    const rps = stats.rps || {};
    const today = stats.today || {};
    const note = card.querySelector('.ms-note');
    if (rps.inTop10) note.textContent = "⭐ You're in the top 10!";
    else if (rps.rank) note.textContent = `You're #${rps.rank}, outside the top 10. Keep winning!`;
    else note.textContent = 'Play rock paper scissors to get on the leaderboard.';

    card.querySelector('.ms-tiles').replaceChildren(
      tile('Rank', rps.rank ? '#' + rps.rank : 'Unranked', rps.rank ? `of ${rps.rankedPlayers} players` : 'no games yet'),
      tile('Rock paper scissors', `${Number(rps.wins) || 0}W ${Number(rps.losses) || 0}L`),
      tile('Captures today', String(Number(today.captures) || 0)),
      tile('Time held today', formatTime(Number(today.secondsHeld) || 0), today.longestHold ? 'longest ' + formatTime(today.longestHold) : '')
    );

    card.hidden = false;
  }

  async function refresh() {
    const card = getCard();
    if (!card) return;
    const username = savedUsername();
    if (!username) {
      card.hidden = true;
      return;
    }

    const request = ++latestRequest;
    try {
      const response = await fetch('/api/stats?username=' + encodeURIComponent(username));
      if (request !== latestRequest) return;
      if (!response.ok) {
        card.hidden = true;
        return;
      }
      render(await response.json());
    } catch (error) {
      return;
    }
  }

  refresh();
  setInterval(refresh, POLL_MS);

  window.MyStats = { refresh, render };
})();

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

