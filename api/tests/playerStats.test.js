const { holdSecondsAt, buildPlayerStats, ownershipChange } = require('../src/functions/shared/playerStats');

const NOON = Date.parse('2026-10-05T12:00:00.000Z');
const SECOND = 1000;

test('a new player starts with zero presses and zero time held', () => {
  const player = { id: 'will', username: 'Will', team: 'red' };
  const state = { holder: null, holderUsername: null, holdStart: null };

  expect(buildPlayerStats(player, state, NOON)).toEqual({
    username: 'Will',
    team: 'red',
    pressCount: 0,
    heldSeconds: 0,
    holding: false
  });
});

test('saved presses and time held are returned when not holding', () => {
  const player = { id: 'will', username: 'Will', team: 'red', pressCount: 4, heldSeconds: 75 };
  const state = { holder: 'BLUE', holderUsername: 'Bryce', holdStart: NOON - 30 * SECOND };
  const result = buildPlayerStats(player, state, NOON);

  expect(result.pressCount).toBe(4);
  expect(result.heldSeconds).toBe(75);
  expect(result.holding).toBe(false);
});

test('the current hold counts toward time held while the player holds the button', () => {
  const player = { id: 'will', username: 'Will', team: 'red', pressCount: 2, heldSeconds: 10 };
  const state = { holder: 'RED', holderUsername: 'will', holdStart: NOON - 45 * SECOND };
  const result = buildPlayerStats(player, state, NOON);

  expect(result.heldSeconds).toBe(55);
  expect(result.holding).toBe(true);
});

test('a teammate holding the button does not add to this player', () => {
  const player = { id: 'will', username: 'Will', team: 'red', heldSeconds: 10 };
  const state = { holder: 'RED', holderUsername: 'Peyton', holdStart: NOON - 45 * SECOND };

  expect(buildPlayerStats(player, state, NOON).heldSeconds).toBe(10);
});

test('hold time is zero with no start time and never negative', () => {
  expect(holdSecondsAt(null, NOON)).toBe(0);
  expect(holdSecondsAt(NOON + 5 * SECOND, NOON)).toBe(0);
  expect(holdSecondsAt(NOON - 12 * SECOND, NOON)).toBe(12);
});

test('a capture credits the old holder and counts a capture for the new one', () => {
  const before = { holder: 'RED', holderUsername: 'Will', holdStart: NOON - 30 * SECOND };
  const after = { holder: 'BLUE', holderUsername: 'Bryce', holdStart: NOON };

  expect(ownershipChange(before, after, NOON)).toEqual({
    previousId: 'will',
    heldSeconds: 30,
    nextId: 'bryce'
  });
});

test('starting a contest without changing the holder is not an ownership change', () => {
  const before = { holder: 'RED', holderUsername: 'Will', holdStart: NOON - 30 * SECOND };
  const after = { ...before, contest: { id: 'c1' } };

  expect(ownershipChange(before, after, NOON)).toBe(null);
});

test('the first capture of an empty button only counts for the new holder', () => {
  const before = { holder: null, holderUsername: null, holdStart: null };
  const after = { holder: 'RED', holderUsername: 'Will', holdStart: NOON };

  expect(ownershipChange(before, after, NOON)).toEqual({
    previousId: null,
    heldSeconds: 0,
    nextId: 'will'
  });
});

test('a kick credits the old holder with no new holder', () => {
  const before = { holder: 'BLUE', holderUsername: 'Bryce', holdStart: NOON - 8 * SECOND };
  const after = { holder: null, holderUsername: null, holdStart: null };

  expect(ownershipChange(before, after, NOON)).toEqual({
    previousId: 'bryce',
    heldSeconds: 8,
    nextId: null
  });
});
