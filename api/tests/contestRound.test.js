
const { submitContestMove, COOLDOWN_MS } =
  require('../src/functions/shared/contestRound');

function makeState() {
  return {
    id: 'game-state-main',
    holder: 'RED',
    holderUsername: 'Alice',
    holdStart: 1000,
    redTotal: 10,
    blueTotal: 5,
    contest: {
      id: 'contest-1',
      defenderUsername: 'Alice',
      defenderTeam: 'RED',
      challengerUsername: 'Bob',
      challengerTeam: 'BLUE',
      defenderMove: null,
      challengerMove: null,
      round: 1,
      startedAt: 1000,
      expiresAt: 31000
    }
  };
}

test('first move waits for the other player', () => {
  const original = makeState();
  const result = submitContestMove(original, 'Alice', 'rock', 5000);

  expect(result.status).toBe('waiting');
  expect(result.state.contest.defenderMove).toBe('rock');
  expect(original.contest.defenderMove).toBeNull();
});

test('defender victory keeps the flag', () => {
  const first = submitContestMove(makeState(), 'Alice', 'rock', 5000);
  const result = submitContestMove(first.state, 'Bob', 'scissors', 6000);

  expect(result.status).toBe('resolved');
  expect(result.winner).toBe('defender');
  expect(result.state.holder).toBe('RED');
  expect(result.state.contest).toBeNull();
  expect(result.state.cooldowns.bob).toBe(6000 + COOLDOWN_MS);
});

test('challenger victory transfers flag and banks score', () => {
  const first = submitContestMove(makeState(), 'Alice', 'rock', 5000);
  const result = submitContestMove(first.state, 'Bob', 'paper', 6000);

  expect(result.winner).toBe('challenger');
  expect(result.state.holder).toBe('BLUE');
  expect(result.state.holderUsername).toBe('Bob');
  expect(result.state.redTotal).toBe(15);
  expect(result.state.blueTotal).toBe(5);
  expect(result.state.cooldowns.alice).toBe(6000 + COOLDOWN_MS);
  expect(result.state.lastContest.winnerUsername).toBe('Bob');
});

test('tie starts another round without transferring the flag', () => {
  const first = submitContestMove(makeState(), 'Alice', 'rock', 5000);
  const result = submitContestMove(first.state, 'Bob', 'rock', 6000);

  expect(result.status).toBe('tie');
  expect(result.state.holder).toBe('RED');
  expect(result.state.contest.round).toBe(2);
  expect(result.state.contest.defenderMove).toBeNull();
  expect(result.state.contest.challengerMove).toBeNull();
});

test('player cannot submit twice in the same round', () => {
  const first = submitContestMove(makeState(), 'Alice', 'rock', 5000);
  const result = submitContestMove(first.state, 'Alice', 'paper', 6000);

  expect(result.status).toBe('already-submitted');
});

test('outside player cannot submit a move', () => {
  const result = submitContestMove(makeState(), 'Eve', 'paper', 5000);
  expect(result.status).toBe('not-participant');
});

test('invalid move is rejected', () => {
  const result = submitContestMove(makeState(), 'Alice', 'lizard', 5000);
  expect(result.status).toBe('invalid-move');
});

test('expired contest cannot accept a new move', () => {
  const result = submitContestMove(makeState(), 'Alice', 'rock', 31000);
  expect(result.status).toBe('expired');
});
