const { randomUUID } = require('node:crypto');
const { bankAndSwitchHolder } = require('./scoring');
const { startContest } = require('./contest');
const { settleExpiredContest } = require('./contestTimeout');
const { isValidUsername } = require('./username');

// A pure decision: the HTTP handler must verify the player session first,
// then save changed state using the game's Cosmos DB ETag.
function planCapture(state, player, now = Date.now(), contestId = randomUUID()) {
  if (!state || !player || !isValidUsername(player.username) ||
      !['red', 'blue'].includes(String(player.team).toLowerCase()) ||
      !Number.isFinite(now)) {
    throw new Error('Invalid capture inputs.');
  }

  const settlement = settleExpiredContest(state, now);
  const expiredSettled = settlement.status === 'forfeit';
  const current = expiredSettled ? settlement.state : state;
  const team = player.team.toUpperCase();
  const holder = current.holder ? current.holder.toUpperCase() : null;

  const blocked = (reason, retryAt) => ({
    status: 'blocked', reason, retryAt,
    state: current,
    // Expiration is a state mutation even if this player can't capture.
    changed: expiredSettled
  });

  if (current.contest) return blocked('contest-active');
  if (holder === team) return blocked('same-team');

  const retryAt = Number(current.cooldowns?.[player.username.toLowerCase()] || 0);
  if (retryAt > now) return blocked('cooldown', retryAt);

  // First capture, or a legacy holder without an identifiable defender.
  if (!holder || !current.holderUsername) {
    const captured = bankAndSwitchHolder({ ...current, holder }, team, now);
    return {
      status: 'captured', changed: true,
      state: { ...captured, holderUsername: player.username }
    };
  }

  const attempt = startContest(current, { username: player.username, team }, contestId, now);
  if (!attempt.started) return blocked(attempt.reason, attempt.retryAt);
  return { status: 'contest-started', changed: true, state: attempt.state };
}

module.exports = { planCapture };
