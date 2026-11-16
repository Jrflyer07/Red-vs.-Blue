const { players } = require('./cosmos');
const { holdSecondsAt } = require('./playerStats');

async function creditHoldTime(previousState, endTime, context) {
  if (!previousState.holder || !previousState.holderUsername) {
    return;
  }

  const previousId = previousState.holderUsername.toLowerCase();
  const heldSeconds = holdSecondsAt(previousState.holdStart, endTime);

  try {
    await players.item(previousId, previousId).patch([
      { op: 'incr', path: '/heldSeconds', value: heldSeconds }
    ]);
  } catch (error) {
    context.log('Could not update held time: ' + error.message);
  }
}

module.exports = { creditHoldTime };
