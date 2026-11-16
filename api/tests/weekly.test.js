const { isResetDue } = require('../src/functions/shared/schedule');

test('due at 11:59 PM Central on the period day', () => {
  expect(isResetDue({ weekId: '2026-11-04' }, Date.parse('2026-11-05T05:59:00Z'))).toBe(true);
  expect(isResetDue({ weekId: '2026-11-04' }, Date.parse('2026-11-05T05:58:00Z'))).toBe(false);
});
test('still due if the call is late (3 AM next day)', () => {
  expect(isResetDue({ weekId: '2026-11-04' }, Date.parse('2026-11-05T09:00:00Z'))).toBe(true);
});
test('not due again once the period has rolled forward', () => {
  expect(isResetDue({ weekId: '2026-11-05' }, Date.parse('2026-11-05T09:00:00Z'))).toBe(false);
});