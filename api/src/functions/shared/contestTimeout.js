
const { bankAndSwitchHolder } = require('./scoring');
const { resolveRpsRound } = require('./rps');
const { COOLDOWN_MS } = require('./contestRound');

const MAX_KILL_FEED = 10;

// Called by the API when a stored contest has reached its deadline.
// The state is returned, not saved; Cosmos DB ETags must guard the eventual write.
function settleExpiredContest(state, now = Date.now()) {
  const timestamp = Number(now);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid contest timestamp.');
  }

  const contest = state?.contest;
  if (!contest) return { status: 'no-contest', state };
  if (timestamp < contest.expiresAt) return { status: 'active', state };

  const defenderPlayed = Boolean(contest.defenderMove);
  const challengerPlayed = Boolean(contest.challengerMove);

  // A player who submitted before the deadline wins if the other did not.
  // If neither submitted, the current holder retains the flag.
  let winner = challengerPlayed && !defenderPlayed
    ? 'challenger'
    : 'defender';

  // Defensive fallback for a contest saved with both moves still present.
  if (defenderPlayed && challengerPlayed) {
    const result = resolveRpsRound(
      contest.defenderMove,
      contest.challengerMove
    );

    winner = result === 'challenger' ? 'challenger' : 'defender';
  }

  const challengerWins = winner === 'challenger';

  const winnerUsername = challengerWins
    ? contest.challengerUsername
    : contest.defenderUsername;

  const loserUsername = challengerWins
    ? contest.defenderUsername
    : contest.challengerUsername;

  const winnerTeam = challengerWins
    ? contest.challengerTeam
    : contest.defenderTeam;

  let nextState = { ...state, contest: null };

  // Preserve the existing ownership and scoring behavior.
  if (challengerWins) {
    nextState = {
      ...bankAndSwitchHolder(nextState, winnerTeam, timestamp),
      holderUsername: winnerUsername
    };
  }

  // Record the completed contest in the kill feed.
  const killFeedEntry = {
    id: contest.id,
    flagId: state.id,
    winnerUsername,
    loserUsername,
    winnerTeam,
    endedAt: timestamp,
    reason: 'timeout'
  };

  const previousFeed = Array.isArray(nextState.killFeed)
    ? nextState.killFeed
    : [];

  nextState = {
    ...nextState,

    cooldowns: {
      ...(nextState.cooldowns || {}),
      [loserUsername.toLowerCase()]: timestamp + COOLDOWN_MS
    },

    lastContest: {
      id: contest.id,
      flagId: state.id,
      winnerUsername,
      loserUsername,
      winnerTeam,
      round: contest.round,
      endedAt: timestamp,
      reason: 'timeout'
    },

    killFeed: [
      killFeedEntry,
      ...previousFeed.filter(entry => entry.id !== contest.id)
    ].slice(0, MAX_KILL_FEED)
  };

  return { status: 'forfeit', winner, state: nextState };
}

module.exports = { settleExpiredContest };
