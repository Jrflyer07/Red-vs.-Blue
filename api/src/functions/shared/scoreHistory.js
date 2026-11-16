const HISTORY_ID = 'score-history';
const MAX_EVENTS = 2000;

function toMs(value) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function eventFromState(state, now) {
  const start = state.holder ? toMs(state.holdStart) : null;
  return {
    t: start ?? now,
    holder: state.holder && start !== null ? String(state.holder).toLowerCase() : null,
    username: state.holder && start !== null && state.holderUsername ? String(state.holderUsername) : null,
    red: Number(state.redTotal) || 0,
    blue: Number(state.blueTotal) || 0,
  };
}

function nextHistory(doc, state, now) {
  const round = state.weekId ?? null;
  const sameRound = doc && (doc.round ?? null) === round && Array.isArray(doc.events);
  const events = sameRound ? doc.events.slice() : [];
  const event = eventFromState(state, now);
  const last = events[events.length - 1];

  let changed = !sameRound;
  if (!last) {
    events.push(event);
    changed = true;
  } else if (event.holder && (event.t !== last.t || event.holder !== last.holder)) {
    events.push(event);
    changed = true;
  }

  const trimmed = events.length > MAX_EVENTS
    ? [events[0], ...events.slice(events.length - (MAX_EVENTS - 1))]
    : events;

  return { doc: { id: HISTORY_ID, round, events: trimmed }, changed };
}

function scoresAt(events, t) {
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

function playerDay(events, username, now) {
  const name = String(username || '').toLowerCase();
  let captures = 0;
  let secondsHeld = 0;
  let longestHold = 0;

  events.forEach((event, index) => {
    if (!event.holder || !event.username || event.username.toLowerCase() !== name) return;
    const end = index + 1 < events.length ? events[index + 1].t : now;
    const seconds = Math.max(0, (end - event.t) / 1000);
    captures += 1;
    secondsHeld += seconds;
    longestHold = Math.max(longestHold, seconds);
  });

  return { captures, secondsHeld: Math.floor(secondsHeld), longestHold: Math.floor(longestHold) };
}

module.exports = { HISTORY_ID, MAX_EVENTS, eventFromState, nextHistory, scoresAt, playerDay };
