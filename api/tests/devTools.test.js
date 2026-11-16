const { isDevUsername, isDeveloper, resetState, kickState } = require('../src/functions/shared/devTools');

const NOON = Date.parse('2026-10-05T12:00:00.000Z');
const SECOND = 1000;

test('only 1974Corvette is the dev username, in any letter case', () => {
  expect(isDevUsername('1974Corvette')).toBe(true);
  expect(isDevUsername('1974corvette')).toBe(true);
  expect(isDevUsername('1975Corvette')).toBe(false);
  expect(isDevUsername(undefined)).toBe(false);
});

test('the dev needs the right key as well as the username', () => {
  expect(isDeveloper('1974Corvette', 'secret', 'secret')).toBe(true);
  expect(isDeveloper('1974Corvette', 'wrong', 'secret')).toBe(false);
  expect(isDeveloper('Will', 'secret', 'secret')).toBe(false);
});

test('nobody gets in when no dev key is configured', () => {
  expect(isDeveloper('1974Corvette', '', undefined)).toBe(false);
  expect(isDeveloper('1974Corvette', '', '')).toBe(false);
});

test('reset clears scores and the holder but keeps the document id', () => {
  const state = {
    id: 'game-state-main',
    partitionKey: 'global',
    holder: 'RED',
    holderUsername: 'Will',
    holdStart: NOON,
    redTotal: 300,
    blueTotal: 120
  };

  expect(resetState(state)).toEqual({
    id: 'game-state-main',
    partitionKey: 'global',
    holder: null,
    holderUsername: null,
    holdStart: null,
    redTotal: 0,
    blueTotal: 0
  });
});

test('kicking the holder banks their team time and empties the button', () => {
  const state = {
    holder: 'BLUE',
    holderUsername: 'Bryce',
    holdStart: NOON - 40 * SECOND,
    redTotal: 10,
    blueTotal: 20
  };
  const result = kickState(state, NOON);

  expect(result.holder).toBe(null);
  expect(result.holderUsername).toBe(null);
  expect(result.holdStart).toBe(null);
  expect(result.blueTotal).toBe(60);
  expect(result.redTotal).toBe(10);
});

test('kicking does nothing when nobody holds the button', () => {
  const state = { holder: null, holderUsername: null, holdStart: null, redTotal: 0, blueTotal: 0 };

  expect(kickState(state, NOON)).toBe(null);
});
