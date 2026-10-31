
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
    } : null
  };
}

module.exports = { buildStateResponse };
