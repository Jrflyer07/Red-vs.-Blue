const { game, history, getOrCreateGameState } = require('./cosmos');
const { getLiveScore } = require('./scoring');
const { chicagoParts } = require('./schedule');

async function resetWeek(now = Date.now()) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await getOrCreateGameState();
    const red = getLiveScore('RED', state, now);
    const blue = getLiveScore('BLUE', state, now);
    const endedDay = chicagoParts(now).date;                // the day that is ending, e.g. "2026-11-03"
    const nextDay = chicagoParts(now + 5 * 60 * 1000).date; // the day starting right after, e.g. "2026-11-04"

    // Archive first. Upsert with a fixed id makes retries and double-fires safe.
    await history.items.upsert({
      id: endedDay,
      partitionKey: 'global',
      weekId: endedDay,
      endedAt: new Date(now).toISOString(),
      redTotal: red,
      blueTotal: blue,
      winner: red === blue ? 'TIE' : red > blue ? 'RED' : 'BLUE',
    });

    // Reset. Nobody holds the button after a reset, so the next press is a plain capture.
    const fresh = {
      ...state,
      redTotal: 0,
      blueTotal: 0,
      holder: null,
      holderUsername: null,
      holdStart: null,
      contest: null, // drop any rock-paper-scissors duel that was in progress
      weekId: nextDay,
    };
    try {
      await game.item(state.id, state.id).replace(fresh, {
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