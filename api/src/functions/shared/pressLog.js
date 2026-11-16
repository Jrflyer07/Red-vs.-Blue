const { randomUUID } = require('crypto');
const { pressLog } = require('./cosmos');

async function logPress({ playerId, team, now = new Date() }) {
  await pressLog.items.create({
    id: randomUUID(),
    partitionKey: 'global',
    playerId: playerId ?? null,
    team,
    timestamp: now.toISOString(),
  });
}
module.exports = { logPress };