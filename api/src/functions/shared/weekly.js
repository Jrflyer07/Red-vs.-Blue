const { game, history, getOrCreateGameState } = require('./cosmos');
const { getLiveScore } = require('./scoring');
const { chicagoParts } = require('./schedule');

async function resetWeek(now = Date.now()) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await getOrCreateGameState();
    const red = getLiveScore('RED', state, now);
    const blue = getLiveScore('BLUE', state, now);
    const endedWeek = chicagoParts(now).date; // the Sunday this week ended, e.g. "2026-11-01"
    const nextWeek = chicagoParts(now + 7 * 24 * 3600 * 1000).date; // the Sunday the new week ends

    // Archive first. Upsert with a fixed id makes retries and double-fires safe.
    await history.items.upsert({
      id: endedWeek,
      partitionKey: 'global',
      weekId: endedWeek,
      endedAt: new Date(now).toISOString(),
      redTotal: red,
      blueTotal: blue,
      winner: red === blue ? 'TIE' : red > blue ? 'RED' : 'BLUE',
    });

    // Reset. The current holder keeps the button, and their clock restarts now.
    const fresh = {
      ...state,
      redTotal: 0,
      blueTotal: 0,
      holdStart: state.holder ? now : null,
      weekId: nextWeek,
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

module.exports = { resetWeek };