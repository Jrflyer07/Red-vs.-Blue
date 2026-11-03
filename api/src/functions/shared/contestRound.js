
const { resolveRpsRound } = require('./rps');
const { bankAndSwitchHolder } = require('./scoring');

const COOLDOWN_MS = 30_000;
const VALID_MOVES = ['rock', 'paper', 'scissors'];
const MAX_KILL_FEED = 10;

function submitContestMove(state, username, move, now = Date.now()) {
  const contest = state?.contest;

  if (!contest) return { status: 'no-contest' };
  if (now >= contest.expiresAt) return { status: 'expired' };
  if (!VALID_MOVES.includes(move)) return { status: 'invalid-move' };

  const player = typeof username === 'string'
    ? username.toLowerCase()
    : '';

  const role = player === contest.defenderUsername.toLowerCase()
    ? 'defender'
    : player === contest.challengerUsername.toLowerCase()
      ? 'challenger'
      : null;

  if (!role) return { status: 'not-participant' };

  const moveField = `${role}Move`;
  if (contest[moveField]) return { status: 'already-submitted' };

  const updatedContest = { ...contest, [moveField]: move };
  const updatedState = { ...state, contest: updatedContest };

  if (!updatedContest.defenderMove || !updatedContest.challengerMove) {
    return { status: 'waiting', state: updatedState };
  }

  const winner = resolveRpsRound(
    updatedContest.defenderMove,
    updatedContest.challengerMove
  );

  if (winner === 'tie') {
    return {
      status: 'tie',
      state: {
        ...updatedState,
        contest: {
          ...updatedContest,
          defenderMove: null,
          challengerMove: null,
          round: updatedContest.round + 1
        }
      }
    };
  }

  const winnerUsername = winner === 'defender'
    ? contest.defenderUsername : contest.challengerUsername;

  const loserUsername = winner === 'defender'
    ? contest.challengerUsername : contest.defenderUsername;

  const winnerTeam = winner === 'defender'
    ? contest.defenderTeam : contest.challengerTeam;

  // Preserve the existing scoring and ownership behavior.
  const scoredState = winner === 'challenger'
    ? {
        ...bankAndSwitchHolder(updatedState, winnerTeam, now),
        holderUsername: winnerUsername
      }
    : updatedState;

  // Add a feed entry without changing the scoring calculation.
  const killFeedEntry = {
    id: contest.id,
    flagId: state.id,
    winnerUsername,
    loserUsername,
    winnerTeam,
    endedAt: now,
    reason: 'rps'
  };

  const previousFeed = Array.isArray(scoredState.killFeed)
    ? scoredState.killFeed
    : [];

  return {
    status: 'resolved',
    winner,
    state: {
      ...scoredState,
      contest: null,
      cooldowns: {
        ...(scoredState.cooldowns || {}),
        [loserUsername.toLowerCase()]: now + COOLDOWN_MS
      },
      lastContest: {
        id: contest.id,
        flagId: state.id,
        winnerUsername,
        loserUsername,
        winnerTeam,
        round: contest.round,
        endedAt: now
      },
      killFeed: [
        killFeedEntry,
        ...previousFeed.filter(entry => entry.id !== contest.id)
      ].slice(0, MAX_KILL_FEED)
    }
  };
}

module.exports = { submitContestMove, COOLDOWN_MS };
