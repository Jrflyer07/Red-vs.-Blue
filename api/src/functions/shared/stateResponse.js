// Builds the JSON that GET /api/state sends back (UR-09, UR-11) - Peyton
//
// The state document in Cosmos DB only stores SAVED totals. This file turns
// it into what the page needs: each team's score as of right now.
//
//   score = saved total + (now - holdStart)     <- holding team only
//
// Because the score is worked out from holdStart every time someone asks,
// the holding team keeps scoring even when nobody is on the site. No timer
// runs on the server.

// TEMPORARY stand-in for Bryce's scoring helper (TR-12).
// Once his is merged, delete this function and use his instead, e.g.
//   const { currentScore } = require('./scoring');
function currentScore(doc, team, nowMs) {
  const saved = (team === 'red' ? doc.redTotal : doc.blueTotal) || 0;

  // Not holding the button (or nobody has pressed yet): just the saved total.
  if (doc.holder !== team || !doc.holdStart) return saved;

  // Holding: add 1 point for every second since they took it.
  // new Date(...) accepts an ISO string or a number of milliseconds.
  const heldSeconds = (nowMs - new Date(doc.holdStart).getTime()) / 1000;
  return saved + Math.max(0, heldSeconds);
}

// doc   = the state document read from Cosmos DB
// nowMs = the current time in milliseconds (tests pass their own value)
function buildStateResponse(doc, nowMs = Date.now()) {
  return {
    holder: doc.holder || null,
    holdStart: doc.holdStart || null,
    redScore: currentScore(doc, 'red', nowMs),
    blueScore: currentScore(doc, 'blue', nowMs),
    // The server's clock, so the page can correct for a wrong device clock.
    serverNow: new Date(nowMs).toISOString(),
  };
}

module.exports = { buildStateResponse, currentScore };
