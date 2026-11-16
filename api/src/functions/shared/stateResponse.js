
const { getLiveScore } = require('./scoring');

function buildStateResponse(state, now = Date.now()) {
  const holder = state.holder
    ? state.holder.toUpperCase()
    : null;

  const normalizedState = { ...state, holder };
  const contest = state.contest;

  return {
    holder: holder ? holder.toLowerCase() : null,
    holderUsername: state.holderUsername || null,
    holdStart: state.holdStart || null,
    redScore: getLiveScore('RED', normalizedState, now),
    blueScore: getLiveScore('BLUE', normalizedState, now),
    serverNow: new Date(now).toISOString(),

    contest: contest ? {
      id: contest.id,
      defenderUsername: contest.defenderUsername,
      challengerUsername: contest.challengerUsername,
      round: contest.round,
      expiresAt: contest.expiresAt,
      status: now >= contest.expiresAt ? 'expired' : 'active',
      defenderSubmitted: Boolean(contest.defenderMove),
      challengerSubmitted: Boolean(contest.challengerMove)
    } : null,

    lastContest: state.lastContest ? {
      id: state.lastContest.id,
      flagId: state.lastContest.flagId,
      winnerUsername: state.lastContest.winnerUsername,
      loserUsername: state.lastContest.loserUsername,
      winnerTeam: state.lastContest.winnerTeam,
      round: state.lastContest.round,
      endedAt: state.lastContest.endedAt,
      reason: state.lastContest.reason || 'rps'
    } : null,

    // Public kill feed. Never expose the players' RPS choices.
    killFeed: (Array.isArray(state.killFeed) ? state.killFeed : [])
      .slice(0, 10)
      .map(entry => ({
        id: entry.id,
        flagId: entry.flagId,
        winnerUsername: entry.winnerUsername,
        loserUsername: entry.loserUsername,
        winnerTeam: entry.winnerTeam,
        endedAt: entry.endedAt,
        reason: entry.reason || 'rps'
      }))
  };
}

module.exports = { buildStateResponse };
