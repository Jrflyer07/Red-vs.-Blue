const { buildStateResponse } = require('../src/functions/shared/stateResponse');

const NOON = Date.parse('2026-10-05T12:00:00.000Z');
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

test('nobody has pressed yet: both scores are the saved totals', () => {
  const state = { holder: null, holdStart: null, redTotal: 0, blueTotal: 0 };
  const result = buildStateResponse(state, NOON);

  expect(result.holder).toBe(null);
  expect(result.redScore).toBe(0);
  expect(result.blueScore).toBe(0);
});

test('the holding team gets its saved total plus the seconds held', () => {
  const state = { holder: 'RED', holdStart: NOON - 90 * SECOND, redTotal: 100, blueTotal: 40 };
  const result = buildStateResponse(state, NOON);

  expect(result.redScore).toBe(190);
  expect(result.blueScore).toBe(40);
});

test('UR-11: the holder keeps scoring while nobody is on the site', () => {
  const state = { holder: 'BLUE', holdStart: NOON, redTotal: 500, blueTotal: 200 };
  const firstVisitorBack = buildStateResponse(state, NOON + HOUR);

  expect(firstVisitorBack.blueScore).toBe(200 + 3600);
  expect(firstVisitorBack.redScore).toBe(500);
});

test('the response includes the server time for the page to sync against', () => {
  const state = { holder: null, holdStart: null, redTotal: 0, blueTotal: 0 };
  const result = buildStateResponse(state, NOON);

  expect(result.serverNow).toBe('2026-10-05T12:00:00.000Z');
});

test('only the five fields the page needs are sent, not the whole database document', () => {
  const state = {
    id: 'game-state-main',
    partitionKey: 'global',
    _etag: 'abc',
    holder: null,
    holdStart: null,
    redTotal: 0,
    blueTotal: 0,
  };
  const result = buildStateResponse(state, NOON);

  expect(Object.keys(result)).toEqual(['holder', 'holdStart', 'redScore', 'blueScore', 'serverNow']);
});
