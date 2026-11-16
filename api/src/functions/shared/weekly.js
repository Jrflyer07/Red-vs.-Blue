const { game, history, getOrCreateGameState } = require('./cosmos');
const { getLiveScore } = require('./scoring');
const { chicagoParts } = require('./schedule');

async function resetWeek(now = Date.now(), { endedDay } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const state = await getOrCreateGameState();
    const red = getLiveScore('RED', state, now);
    const blue = getLiveScore('BLUE', state, now);
    // The period being closed: an explicit day, else the day stored on the state, else a guess from the clock
    const day = endedDay || state.weekId || chicagoParts(now - 2 * 3600 * 1000).date;
    const nextDay = chicagoParts(now + 5 * 60 * 1000).date; // the day the new period ends on

    // Archive once per day. If it already exists, keep the original totals.
    try {
      await history.items.create({
        id: day,
        partitionKey: 'global',
        weekId: day,
        endedAt: new Date(now).toISOString(),
        redTotal: red,
        blueTotal: blue,
        winner: red === blue ? 'TIE' : red > blue ? 'RED' : 'BLUE',
      });
    } catch (err) {
      if (err.code !== 409 && err.statusCode !== 409) throw err;
    }

    // Reset. Nobody holds the button afterward.
    const fresh = {
      ...state,
      redTotal: 0,
      blueTotal: 0,
      holder: null,
      holderUsername: null,
      holdStart: null,
      contest: null,
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