const { players } = require('./cosmos');
const { ownershipChange } = require('./playerStats');

async function incrementField(playerId, path, value, context) {
  try {
    await players.item(playerId, playerId).patch([
      { op: 'incr', path, value }
    ]);
  } catch (error) {
    context?.log?.('Could not update ' + path + ' for ' + playerId + ': ' + error.message);
  }
}

async function recordOwnershipChange(before, after, endTime, context) {
  const change = ownershipChange(before, after, endTime);

  if (!change) {
    return;
  }

  if (change.previousId) {
    await incrementField(change.previousId, '/heldSeconds', change.heldSeconds, context);
  }

  if (change.nextId) {
    await incrementField(change.nextId, '/pressCount', 1, context);
  }
}

module.exports = { recordOwnershipChange };
