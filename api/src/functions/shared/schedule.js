const TZ = 'America/Chicago';

function chicagoParts(ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    weekday: get('weekday'),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

// True during the 11:59 PM minute, Central time, every day
function isResetTime(now = Date.now()) {
  const { hour, minute } = chicagoParts(now);
  return hour === 23 && minute === 59;
}

// state.weekId is the date the current period ends on (set by each reset).
function isResetDue(state, now = Date.now()) {
  const { date, hour, minute } = chicagoParts(now);
  const period = state && state.weekId;
  if (!period) return hour === 23 && minute >= 59;
  return date > period || (date === period && hour === 23 && minute >= 59);
}

module.exports = { chicagoParts, isResetTime, isResetDue };