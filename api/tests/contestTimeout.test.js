const { settleExpiredContest } = require('../src/functions/shared/contestTimeout');
const { COOLDOWN_MS } = require('../src/functions/shared/contestRound');

function makeState(defenderMove = null, challengerMove = null) {
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
      defenderMove,
      challengerMove,
      round: 1,
      startedAt: 1000,
      expiresAt: 31000
    }
  };
}

test('leaves an active contest alone', () => {
  const original = makeState();
  const result = settleExpiredContest(original, 30000);
  expect(result).toEqual({ status: 'active', state: original });
});

test('handles missing contest without changing state', () => {
  const state = { ...makeState(), contest: null };
  expect(settleExpiredContest(state, 31000)).toEqual({ status: 'no-contest', state });
});

test('challenger wins if defender never responds, and score banks', () => {
  const original = makeState(null, 'paper');
  const result = settleExpiredContest(original, 31000);
  expect(result.status).toBe('forfeit');
  expect(result.winner).toBe('challenger');
  expect(result.state.holder).toBe('BLUE');
  expect(result.state.holderUsername).toBe('Bob');
  expect(result.state.redTotal).toBe(40);
  expect(result.state.blueTotal).toBe(5);
  expect(result.state.cooldowns.alice).toBe(31000 + COOLDOWN_MS);
  expect(result.state.contest).toBeNull();
  expect(result.state.lastContest.reason).toBe('timeout');
  expect(original.contest).not.toBeNull();
});

test('defender wins if challenger never responds', () => {
  const result = settleExpiredContest(makeState('rock', null), 32000);
  expect(result.winner).toBe('defender');
  expect(result.state.holder).toBe('RED');
  expect(result.state.holdStart).toBe(1000);
  expect(result.state.cooldowns.bob).toBe(32000 + COOLDOWN_MS);
});

test('if nobody submits, defender retains flag and challenger is cooled down', () => {
  const result = settleExpiredContest(makeState(), 31000);
  expect(result.winner).toBe('defender');
  expect(result.state.holder).toBe('RED');
  expect(result.state.contest).toBeNull();
  expect(result.state.cooldowns.bob).toBe(31000 + COOLDOWN_MS);
});

test('fallback uses RPS result if two moves were recorded', () => {
  const result = settleExpiredContest(makeState('rock', 'paper'), 31000);
  expect(result.winner).toBe('challenger');
  expect(result.state.holder).toBe('BLUE');
});

test('a tied stored round at timeout leaves defender in control', () => {
  const result = settleExpiredContest(makeState('rock', 'rock'), 31000);
  expect(result.winner).toBe('defender');
});
