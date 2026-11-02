
const BEATS = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper'
};

function resolveRpsRound(defenderMove, challengerMove) {
  // Reject anything other than the three valid choices.
  if (!Object.hasOwn(BEATS, defenderMove) ||
      !Object.hasOwn(BEATS, challengerMove)) {
    throw new Error('Invalid rock-paper-scissors move.');
  }

  // Matching choices mean neither player wins.
  if (defenderMove === challengerMove) {
    return 'tie';
  }

  // Check whether the defender's choice beats the challenger.
  return BEATS[defenderMove] === challengerMove
    ? 'defender'
    : 'challenger';
}

module.exports = { resolveRpsRound };
