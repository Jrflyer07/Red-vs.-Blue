const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getOrCreateGameState } = require('./shared/cosmos');
const { resetWeek } = require('./shared/weekly');
const { isResetDue } = require('./shared/schedule');

function secretMatches(given) {
  const expected = process.env.RESET_SECRET || '';
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Local testing only: func start sets this to "Development", Azure sets it to "Production"
function currentTime() {
  const local = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development';
  const offset = local ? Number(process.env.TEST_CLOCK_OFFSET_MS || 0) : 0;
  return Date.now() + offset;
}

app.http('resetDay', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'reset-day',
  handler: async (request, context) => {
    if (!secretMatches(request.headers.get('x-reset-secret'))) {
      return { status: 401, body: 'Unauthorized' };
    }
    const force = request.query.get('force') === '1';
    const day = request.query.get('day'); // archive label for a forced reset, e.g. 2026-11-04

    const now = currentTime();
    const state = await getOrCreateGameState();
    if (!force && !isResetDue(state, now)) {
      return { status: 200, jsonBody: { reset: false, reason: 'not due', weekId: state.weekId ?? null, at: new Date(now).toISOString() } };
    }
    const fresh = await resetWeek(now, day ? { endedDay: day } : {});
    context.log('daily reset complete');
    return { status: 200, jsonBody: { reset: true, weekId: fresh.weekId, at: new Date(now).toISOString() } };
  },
});