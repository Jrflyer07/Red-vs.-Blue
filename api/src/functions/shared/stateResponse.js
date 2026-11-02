
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

    // Public contest information only.
    // Never expose the players' actual RPS choices.
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

    // Last completed result can be shown in both browsers and later in the
    // activity feed. Never include hidden moves or database metadata.
    lastContest: state.lastContest ? {
      id: state.lastContest.id,
      flagId: state.lastContest.flagId,
      winnerUsername: state.lastContest.winnerUsername,
      loserUsername: state.lastContest.loserUsername,
      winnerTeam: state.lastContest.winnerTeam,
      round: state.lastContest.round,
      endedAt: state.lastContest.endedAt,
      reason: state.lastContest.reason || 'rps'
    } : null
  };
}

module.exports = { buildStateResponse };
