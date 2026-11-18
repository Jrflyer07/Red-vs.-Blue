const { eventFromState, nextHistory, scoresAt, playerDay, MAX_EVENTS } = require('../src/functions/shared/scoreHistory');

const T0 = Date.parse('2026-11-15T14:00:00.000Z');
const S = 1000;
const day = '2026-11-15';

test('the first check of the day starts the history', () => {
  const state = { weekId: day, holder: null, holdStart: null, redTotal: 0, blueTotal: 0 };
  const { doc, changed } = nextHistory(null, state, T0);

  expect(changed).toBe(true);
  expect(doc.events).toEqual([{ t: T0, holder: null, username: null, red: 0, blue: 0 }]);
});

test('a capture adds an event with the scores at that moment', () => {
  const start = nextHistory(null, { weekId: day, holder: null, redTotal: 0, blueTotal: 0 }, T0).doc;
  const state = { weekId: day, holder: 'RED', holderUsername: 'Will', holdStart: T0 + 10 * S, redTotal: 0, blueTotal: 0 };

  const { doc, changed } = nextHistory(start, state, T0 + 30 * S);

  expect(changed).toBe(true);
  expect(doc.events[1]).toEqual({ t: T0 + 10 * S, holder: 'red', username: 'Will', red: 0, blue: 0 });
});

test('checking again during the same hold adds nothing', () => {
  const state = { weekId: day, holder: 'BLUE', holderUsername: 'Peyton', holdStart: T0, redTotal: 5, blueTotal: 0 };
  const first = nextHistory(null, state, T0 + S).doc;

  const { doc, changed } = nextHistory(first, state, T0 + 60 * S);

  expect(changed).toBe(false);
  expect(doc.events.length).toBe(1);
});

test('a new day starts a fresh history', () => {
  const old = { round: '2026-11-14', events: [{ t: 1, holder: 'red', username: 'Will', red: 900, blue: 10 }] };
  const state = { weekId: day, holder: null, redTotal: 0, blueTotal: 0 };

  const { doc, changed } = nextHistory(old, state, T0);

  expect(changed).toBe(true);
  expect(doc.round).toBe(day);
  expect(doc.events).toEqual([{ t: T0, holder: null, username: null, red: 0, blue: 0 }]);
});

test('a dev reset in the middle of the day starts the history over', () => {
  const old = { round: day, events: [
    { t: T0, holder: null, username: null, red: 0, blue: 0 },
    { t: T0 + 10 * S, holder: 'red', username: 'Will', red: 0, blue: 0 },
    { t: T0 + 900 * S, holder: 'blue', username: 'Peyton', red: 890, blue: 0 },
  ] };
  const state = { weekId: day, holder: null, holdStart: null, redTotal: 0, blueTotal: 0 };

  const { doc, changed } = nextHistory(old, state, T0 + 1000 * S);

  expect(changed).toBe(true);
  expect(doc.events).toEqual([{ t: T0 + 1000 * S, holder: null, username: null, red: 0, blue: 0 }]);
});

test('a history saved across a dev reset drops everything from before the reset', () => {
  const old = { round: day, events: [
    { t: T0, holder: 'red', username: 'Will', red: 0, blue: 0 },
    { t: T0 + 900 * S, holder: 'blue', username: 'Peyton', red: 900, blue: 0 },
    { t: T0 + 1000 * S, holder: 'red', username: 'Jae', red: 0, blue: 0 },
    { t: T0 + 1100 * S, holder: 'blue', username: 'rogue2', red: 100, blue: 0 },
  ] };
  const state = { weekId: day, holder: 'BLUE', holderUsername: 'rogue2', holdStart: T0 + 1100 * S, redTotal: 100, blueTotal: 0 };

  const { doc, changed } = nextHistory(old, state, T0 + 1200 * S);

  expect(changed).toBe(true);
  expect(doc.events).toEqual(old.events.slice(2));
});

test('the first capture of the day keeps the start of the day', () => {
  const start = { round: day, events: [{ t: T0, holder: null, username: null, red: 0, blue: 0 }] };
  const state = { weekId: day, holder: 'RED', holderUsername: 'Will', holdStart: T0 + 10 * S, redTotal: 0, blueTotal: 0 };

  const { doc } = nextHistory(start, state, T0 + 20 * S);

  expect(doc.events.map((event) => event.t)).toEqual([T0, T0 + 10 * S]);
});

test('the history never grows past its limit and keeps the start of the day', () => {
  const events = Array.from({ length: MAX_EVENTS }, (_, i) => ({ t: T0 + i * S, holder: i % 2 ? 'red' : 'blue', username: 'x', red: 0, blue: 0 }));
  const state = { weekId: day, holder: 'RED', holderUsername: 'Will', holdStart: T0 + MAX_EVENTS * S, redTotal: 1, blueTotal: 1 };

  const { doc } = nextHistory({ round: day, events }, state, T0 + MAX_EVENTS * S);

  expect(doc.events.length).toBe(MAX_EVENTS);
  expect(doc.events[0].t).toBe(T0);
  expect(doc.events[doc.events.length - 1].t).toBe(T0 + MAX_EVENTS * S);
});

test('scores are rebuilt at any moment from the capture history', () => {
  const events = [
    { t: T0, holder: null, username: null, red: 0, blue: 0 },
    { t: T0 + 10 * S, holder: 'red', username: 'Will', red: 0, blue: 0 },
    { t: T0 + 70 * S, holder: 'blue', username: 'Peyton', red: 60, blue: 0 },
  ];

  expect(scoresAt(events, T0 + 40 * S)).toEqual({ red: 30, blue: 0 });
  expect(scoresAt(events, T0 + 100 * S)).toEqual({ red: 60, blue: 30 });
});

test('a player\'s day adds up their captures and time held, including a hold still going', () => {
  const events = [
    { t: T0, holder: 'red', username: 'Will', red: 0, blue: 0 },
    { t: T0 + 60 * S, holder: 'blue', username: 'Peyton', red: 60, blue: 0 },
    { t: T0 + 90 * S, holder: 'red', username: 'Will', red: 60, blue: 30 },
    { t: T0 + 100 * S, holder: 'blue', username: 'peyton', red: 70, blue: 30 },
  ];

  expect(playerDay(events, 'Peyton', T0 + 150 * S)).toEqual({ captures: 2, secondsHeld: 80, longestHold: 50 });
  expect(playerDay(events, 'Will', T0 + 150 * S)).toEqual({ captures: 2, secondsHeld: 70, longestHold: 60 });
  expect(playerDay(events, 'Bryce', T0 + 150 * S)).toEqual({ captures: 0, secondsHeld: 0, longestHold: 0 });
});

test('a hold is only recorded once someone has the button', () => {
  expect(eventFromState({ holder: null, holdStart: null, redTotal: 3, blueTotal: 4 }, T0)).toEqual({ t: T0, holder: null, username: null, red: 3, blue: 4 });
});
