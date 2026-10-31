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

test('the username of the player holding the button is included', () => {
  const state = { holder: 'RED', holderUsername: 'Will_07', holdStart: NOON, redTotal: 0, blueTotal: 0 };
  const result = buildStateResponse(state, NOON);

  expect(result.holderUsername).toBe('Will_07');
});

test('holderUsername is null when the saved game has no username yet', () => {
  const state = { holder: 'RED', holdStart: NOON, redTotal: 0, blueTotal: 0 };
  const result = buildStateResponse(state, NOON);

  expect(result.holderUsername).toBe(null);
});

test('only the six fields the page needs are sent, not the whole database document', () => {
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

  expect(Object.keys(result)).toEqual(['holder', 'holderUsername', 'holdStart', 'redScore', 'blueScore', 'serverNow', 'contest']);
});


test('no active contest returns null contest', () => {
  const state = {
    holder: 'RED',
    holdStart: NOON,
    redTotal: 0,
    blueTotal: 0
  };

  const result = buildStateResponse(state, NOON);

  expect(result.contest).toBeNull();
});

test('contest status is visible without exposing moves', () => {
  const state = {
    holder: 'RED',
    holdStart: NOON,
    redTotal: 0,
    blueTotal: 0,
    contest: {
      id: 'contest-1',
      defenderUsername: 'Alice',
      challengerUsername: 'Bob',
      defenderMove: 'rock',
      challengerMove: null,
      round: 1,
      expiresAt: NOON + 20000
    }
  };

  const result = buildStateResponse(state, NOON);

  expect(result.contest.status).toBe('active');
  expect(result.contest.defenderSubmitted).toBe(true);
  expect(result.contest.challengerSubmitted).toBe(false);

  // Neither player's actual move should be public.
  expect(result.contest).not.toHaveProperty('defenderMove');
  expect(result.contest).not.toHaveProperty('challengerMove');
});

test('expired contest is marked expired', () => {
  const state = {
    holder: 'RED',
    holdStart: NOON,
    redTotal: 0,
    blueTotal: 0,
    contest: {
      id: 'contest-1',
      defenderUsername: 'Alice',
      challengerUsername: 'Bob',
      defenderMove: null,
      challengerMove: null,
      round: 1,
      expiresAt: NOON - 1000
    }
  };

  const result = buildStateResponse(state, NOON);

  expect(result.contest.status).toBe('expired');
});
