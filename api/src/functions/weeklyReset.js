const { app } = require('@azure/functions');
const { resetWeek } = require('./shared/weekly');
const { isResetTime } = require('./shared/schedule');

app.timer('weeklyReset', {
  // Every day at 04:59 and 05:59 UTC. Exactly one of these is 11:59 PM Central, depending on DST.
  schedule: '0 59 4,5 * * *',
  handler: async (timer, context) => {
    if (process.env.FORCE_WEEKLY_RESET !== 'true' && !isResetTime()) {
      context.log('Not 11:59 PM Central, skipping reset');
      return;
    }
    await resetWeek();
    context.log('daily reset complete');
  },
});