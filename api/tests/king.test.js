const { currentHold, recordForRound, shouldSave, newRecordDoc } = require('../src/functions/shared/king');

const NOON = Date.parse('2026-11-12T18:00:00.000Z');
const MINUTE = 60 * 1000;

test('the current holder is the king, with how long they have held it', () => {
  const state = { holder: 'RED', holderUsername: 'Will', holdStart: NOON - 5 * MINUTE };

  expect(currentHold(state, NOON)).toEqual({ username: 'Will', team: 'red', holdStart: NOON - 5 * MINUTE, seconds: 300 });
});

test('there is no king when nobody holds the button', () => {
  expect(currentHold({ holder: null, holderUsername: null, holdStart: null }, NOON)).toBe(null);
});

test('there is no king for an old hold with no username', () => {
  expect(currentHold({ holder: 'blue', holderUsername: null, holdStart: NOON }, NOON)).toBe(null);
});

test('a record from another day does not count today', () => {
  const doc = { round: '2026-11-11', username: 'Will', team: 'red', seconds: 900, holdStart: 1 };

  expect(recordForRound(doc, '2026-11-12')).toBe(null);
  expect(recordForRound(doc, '2026-11-11')).toEqual({ username: 'Will', team: 'red', seconds: 900, holdStart: 1 });
});

test('the first hold of the day becomes the record', () => {
  const hold = { username: 'Peyton', team: 'blue', holdStart: NOON, seconds: 3 };

  expect(shouldSave(hold, null)).toBe(true);
});

test('a different hold must last longer than the record to beat it', () => {
  const record = { username: 'Will', team: 'red', seconds: 600, holdStart: NOON - 60 * MINUTE };

  expect(shouldSave({ username: 'Peyton', team: 'blue', holdStart: NOON, seconds: 600.9 }, record)).toBe(false);
  expect(shouldSave({ username: 'Peyton', team: 'blue', holdStart: NOON, seconds: 601 }, record)).toBe(true);
});

test('the record holder\'s own hold keeps growing the record, one save per new second', () => {
  const record = { username: 'Will', team: 'red', seconds: 600, holdStart: NOON };
  const hold = (seconds) => ({ username: 'Will', team: 'red', holdStart: NOON, seconds });

  expect(shouldSave(hold(600.7), record)).toBe(false);
  expect(shouldSave(hold(601), record)).toBe(true);
});

test('nothing is saved when nobody holds the button', () => {
  expect(shouldSave(null, null)).toBe(false);
});

test('the saved record keeps whole seconds and today\'s round', () => {
  const doc = newRecordDoc('2026-11-12', { username: 'Peyton', team: 'blue', holdStart: NOON, seconds: 75.8 });

  expect(doc).toEqual({ id: 'king-of-the-hill', round: '2026-11-12', username: 'Peyton', team: 'blue', seconds: 75, holdStart: NOON });
});
