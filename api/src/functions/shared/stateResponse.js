const { getLiveScore } = require('./scoring');

function buildStateResponse(state, now = Date.now()) {
  return {
    holder: state.holder || null,
    holdStart: state.holdStart || null,
    redScore: getLiveScore('RED', state, now),
    blueScore: getLiveScore('BLUE', state, now),
    serverNow: new Date(now).toISOString(),
  };
}

module.exports = { buildStateResponse };
