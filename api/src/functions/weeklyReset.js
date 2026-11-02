const { app } = require('@azure/functions');
const { resetWeek } = require('./shared/weekly');

app.timer('weeklyReset', {
  schedule: '0 0 0 * * 1', // Monday 00:00 UTC (sec min hour day month weekday)
  handler: async (timer, context) => {
    await resetWeek();
    context.log('weekly reset complete');
  },
});