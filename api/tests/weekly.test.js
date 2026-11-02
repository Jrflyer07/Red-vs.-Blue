const { isResetTime } = require('../src/functions/shared/schedule');

test('winter: 01:00 UTC Monday is Sunday 7 PM CST', () => {
  expect(isResetTime(Date.parse('2026-11-02T01:00:00Z'))).toBe(true);
  expect(isResetTime(Date.parse('2026-11-02T00:00:00Z'))).toBe(false);
});
test('summer: 00:00 UTC Monday is Sunday 7 PM CDT', () => {
  expect(isResetTime(Date.parse('2026-07-06T00:00:00Z'))).toBe(true);
  expect(isResetTime(Date.parse('2026-07-06T01:00:00Z'))).toBe(false);
});