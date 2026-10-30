const { isValidUsername } = require('../src/functions/shared/username');

test('letters, numbers, _ and - are allowed', () => {
  expect(isValidUsername('Will_07')).toBe(true);
  expect(isValidUsername('red-team')).toBe(true);
});

test('usernames must be 3-20 characters', () => {
  expect(isValidUsername('ab')).toBe(false);
  expect(isValidUsername('abc')).toBe(true);
  expect(isValidUsername('a'.repeat(20))).toBe(true);
  expect(isValidUsername('a'.repeat(21))).toBe(false);
});

test('characters Cosmos does not allow in an id are rejected', () => {
  expect(isValidUsername('a/b')).toBe(false);
  expect(isValidUsername('a\\b')).toBe(false);
  expect(isValidUsername('a?b')).toBe(false);
  expect(isValidUsername('a#b')).toBe(false);
});

test('spaces are rejected', () => {
  expect(isValidUsername('will p')).toBe(false);
  expect(isValidUsername(' will')).toBe(false);
});

test('old UUID player ids are not valid usernames', () => {
  expect(isValidUsername('3f2b8c1e-6a4d-4e7b-9c10-2d5f8a7b1c3e')).toBe(false);
});

test('anything that is not a string is rejected', () => {
  expect(isValidUsername(undefined)).toBe(false);
  expect(isValidUsername(null)).toBe(false);
  expect(isValidUsername(123)).toBe(false);
  expect(isValidUsername({})).toBe(false);
});
