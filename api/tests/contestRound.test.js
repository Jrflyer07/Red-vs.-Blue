
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
  expect(result.state.contest.expiresAt).toBe(36000); // Tie at t=6000 + 30 seconds
  expect(result.state.contest.startedAt).toBe(1000); // Contest identity is unchanged
});

test('a late draw gives BOTH players another full 30 seconds', () => {
  const first = submitContestMove(makeState(), 'Alice', 'rock', 5000);
  const tie = submitContestMove(first.state, 'Bob', 'rock', 30000);
  expect(tie.status).toBe('tie');
  expect(tie.state.contest.expiresAt).toBe(60000);

  // The initial contest would have expired at 31000; round two stays live.
  const secondRoundFirst = submitContestMove(tie.state, 'Alice', 'paper', 32000);
  expect(secondRoundFirst.status).toBe('waiting');
  const secondRoundSecond = submitContestMove(secondRoundFirst.state, 'Bob', 'scissors', 33000);
  expect(secondRoundSecond.status).toBe('resolved');
  expect(secondRoundSecond.winner).toBe('challenger');
});

test('each successive draw restarts the clock without resetting the contest ID', () => {
  const first = submitContestMove(makeState(), 'Alice', 'rock', 5000);
  const tieOne = submitContestMove(first.state, 'Bob', 'rock', 30000);
  const second = submitContestMove(tieOne.state, 'Alice', 'paper', 32000);
  const tieTwo = submitContestMove(second.state, 'Bob', 'paper', 59000);
  expect(tieTwo.status).toBe('tie');
  expect(tieTwo.state.contest.id).toBe('contest-1');
  expect(tieTwo.state.contest.round).toBe(3);
  expect(tieTwo.state.contest.expiresAt).toBe(89000);
  expect(tieTwo.state.contest.defenderMove).toBeNull();
  expect(tieTwo.state.contest.challengerMove).toBeNull();
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
