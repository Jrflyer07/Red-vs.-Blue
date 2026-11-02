const { game, history, getOrCreateGameState } = require('./cosmos');
const { getLiveScore } = require('./scoring');

function isoWeekId(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function resetWeek(now = Date.now()) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await getOrCreateGameState();
    const red = getLiveScore('RED', state, now);
    const blue = getLiveScore('BLUE', state, now);
    const endedWeek = isoWeekId(new Date(now - 3600 * 1000)); // the week that just ended

    //Archive first. Upsert with a fixed id makes retries and double-fires safe.
    await history.items.upsert({
      id: endedWeek,
      partitionKey: 'global',
      weekId: endedWeek,
      endedAt: new Date(now).toISOString(),
      redTotal: red,
      blueTotal: blue,
      winner: red === blue ? 'TIE' : red > blue ? 'RED' : 'BLUE',
    });

    //Reset. The current holder keeps the button, and their clock restarts now.
    const fresh = {
      ...state,
      redTotal: 0,
      blueTotal: 0,
      holdStart: state.holder ? now : null,
      weekId: isoWeekId(new Date(now)),
    };
    try {
      await game.item(state.id, state.partitionKey).replace(fresh, {
        accessCondition: { type: 'IfMatch', condition: state._etag },
      });
      return fresh;
    } catch (err) {
      if (err.code !== 412) throw err; // someone pressed mid-reset, so re-read and retry
    }
  }
  throw new Error('resetWeek: too many concurrent updates');
}
module.exports = { resetWeek, isoWeekId };