const TZ = 'America/Chicago';

function chicagoParts(ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    weekday: get('weekday'),
    hour: Number(get('hour')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

// True during the 7 PM hour on Sunday, Central time
function isResetTime(now = Date.now()) {
  const { weekday, hour } = chicagoParts(now);
  return weekday === 'Sun' && hour === 19;
}

module.exports = { chicagoParts, isResetTime };