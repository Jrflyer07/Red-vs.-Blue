const { isResetTime } = require('../src/functions/shared/schedule');

test('winter: 05:59 UTC is 11:59 PM CST', () => {
  expect(isResetTime(Date.parse('2026-11-04T05:59:00Z'))).toBe(true);
  expect(isResetTime(Date.parse('2026-11-04T05:58:00Z'))).toBe(false);
  expect(isResetTime(Date.parse('2026-11-04T04:59:00Z'))).toBe(false);
});
test('summer: 04:59 UTC is 11:59 PM CDT', () => {
  expect(isResetTime(Date.parse('2026-07-06T04:59:00Z'))).toBe(true);
  expect(isResetTime(Date.parse('2026-07-06T05:59:00Z'))).toBe(false);
});