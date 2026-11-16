// Daily Champion Scoreboard: the three most recent daily winning teams, from /api/champions.
(function () {
  'use strict';

  const REFRESH_MS = 60000;
  const TEAMS = { RED: { name: 'Red', cls: 'champ-red' }, BLUE: { name: 'Blue', cls: 'champ-blue' } };

  function formatDay(day) {
    const [y, m, d] = String(day).split('-').map(Number);
    if (!y || !m || !d) return String(day);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function describe(entry) {
    if (TEAMS[entry.winner]) return { text: TEAMS[entry.winner].name + ' won', cls: TEAMS[entry.winner].cls };
    if (entry.redTotal === 0 && entry.blueTotal === 0) return { text: 'No winner', cls: 'champ-none' };
    return { text: 'Tie', cls: 'champ-none' };
  }

  function addCell(row, className, text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    row.appendChild(span);
  }

  function render(entries) {
    const list = document.getElementById('champions-list');
    if (!list) return;
    list.textContent = '';

    if (!entries.length) {
      const empty = document.createElement('li');
      empty.className = 'champ-empty';
      empty.textContent = 'No daily winners yet. The first is decided at 11:59pm CST.';
      list.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const who = describe(entry);
      const row = document.createElement('li');
      addCell(row, 'champ-day', formatDay(entry.day));
      addCell(row, 'champ-team ' + who.cls, who.text);
      addCell(row, 'champ-score', 'Red ' + entry.redTotal.toLocaleString() + ' – Blue ' + entry.blueTotal.toLocaleString());
      list.appendChild(row);
    });
  }

  function showError() {
    const list = document.getElementById('champions-list');
    if (!list || list.querySelector('.champ-day')) return; // keep showing the last good data
    list.textContent = '';
    const item = document.createElement('li');
    item.className = 'champ-empty';
    item.textContent = 'Daily champions are unavailable right now.';
    list.appendChild(item);
  }

  async function load() {
    try {
      const response = await fetch('/api/champions');
      if (!response.ok) return showError();
      render(await response.json());
    } catch {
      showError();
    }
  }

  load();
  setInterval(load, REFRESH_MS);
})();