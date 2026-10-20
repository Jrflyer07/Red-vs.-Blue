
const { getLiveScore } = require('./scoring');

function buildStateResponse(state, now = Date.now()) {
  // Bryce's scoring helper uses uppercase team names.
  const holder = state.holder
    ? state.holder.toUpperCase()
    : null;

  const normalizedState = { ...state, holder };

  return {
    // The frontend and Peyton's scoreboard use lowercase.
    holder: holder ? holder.toLowerCase() : null,
    holdStart: state.holdStart || null,
    redScore: getLiveScore('RED', normalizedState, now),
    blueScore: getLiveScore('BLUE', normalizedState, now),
    serverNow: new Date(now).toISOString()
  };
}

module.exports = { buildStateResponse };
