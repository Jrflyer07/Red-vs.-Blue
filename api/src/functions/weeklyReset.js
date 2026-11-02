const { app } = require('@azure/functions');
const { resetWeek } = require('./shared/weekly');
const { isResetTime } = require('./shared/schedule');

app.timer('weeklyReset', {
  // Monday 00:00 and 01:00 UTC. Exactly one of these is Sunday 7 PM Central, depending on DST.
  schedule: '0 0 0,1 * * 1',
  handler: async (timer, context) => {
    if (process.env.FORCE_WEEKLY_RESET !== 'true' && !isResetTime()) {
      context.log('Not Sunday 7 PM Central, skipping reset');
      return;
    }
    await resetWeek();
    context.log('weekly reset complete');
  },
});