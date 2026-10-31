
const { isValidUsername } = require('./username');

const CONTEST_DURATION_MS = 30_000;

function startContest(state, challenger, contestId, now = Date.now()) {
  if (!state || !challenger ||
      !isValidUsername(challenger.username) ||
      !['RED', 'BLUE'].includes(String(challenger.team).toUpperCase()) ||
      typeof contestId !== 'string' || !contestId.trim()) {
    throw new Error('Invalid contest inputs.');
  }

  // Only one contest can exist for this flag at a time.
  if (state.contest) {
    return { started: false, reason: 'contest-active' };
  }

  const defenderTeam = state.holder?.toUpperCase();

  // No contest needed if there is no current defender.
  if (!defenderTeam || !state.holderUsername) {
    return { started: false, reason: 'no-defender' };
  }

  const challengerTeam = challenger.team.toUpperCase();

  // Your own team cannot challenge its flag.
  if (defenderTeam === challengerTeam) {
    return { started: false, reason: 'same-team' };
  }

  return {
    started: true,
    state: {
      ...state,
      contest: {
        id: contestId,
        defenderUsername: state.holderUsername,
        defenderTeam,
        challengerUsername: challenger.username,
        challengerTeam,
        defenderMove: null,
        challengerMove: null,
        round: 1,
        startedAt: now,
        expiresAt: now + CONTEST_DURATION_MS
      }
    }
  };
}

module.exports = { startContest, CONTEST_DURATION_MS };
