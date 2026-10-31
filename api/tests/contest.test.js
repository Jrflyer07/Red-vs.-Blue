
const { startContest, CONTEST_DURATION_MS } =
  require('../src/functions/shared/contest');

const state = {
  id: 'game-state-main',
  holder: 'RED',
  holderUsername: 'Alice',
  holdStart: 1000,
  redTotal: 100,
  blueTotal: 50
};

const challenger = {
  username: 'Bob',
  team: 'BLUE'
};

test('opposing player can start a contest', () => {
  const result = startContest(state, challenger, 'contest-1', 5000);

  expect(result.started).toBe(true);
  expect(result.state.contest.defenderUsername).toBe('Alice');
  expect(result.state.contest.challengerUsername).toBe('Bob');
  expect(result.state.contest.expiresAt).toBe(
    5000 + CONTEST_DURATION_MS
  );
});

test('starting a contest does not change flag ownership or scores', () => {
  const result = startContest(state, challenger, 'contest-1', 5000);

  expect(result.state.holder).toBe('RED');
  expect(result.state.holdStart).toBe(1000);
  expect(result.state.redTotal).toBe(100);
  expect(result.state.blueTotal).toBe(50);
  expect(state.contest).toBeUndefined();
});

test('another player cannot interrupt an existing contest', () => {
  const first = startContest(state, challenger, 'contest-1', 5000);

  const second = startContest(
    first.state,
    { username: 'Charlie', team: 'BLUE' },
    'contest-2',
    6000
  );

  expect(second).toEqual({
    started: false,
    reason: 'contest-active'
  });
});

test('same team cannot challenge its own flag', () => {
  const result = startContest(
    state,
    { username: 'David', team: 'RED' },
    'contest-1'
  );

  expect(result.reason).toBe('same-team');
});

test('unoccupied flag does not initiate a contest', () => {
  const result = startContest(
    { ...state, holder: null, holderUsername: null },
    challenger,
    'contest-1'
  );

  expect(result.reason).toBe('no-defender');
});

test('invalid challenger is rejected', () => {
  expect(() => startContest(
    state,
    { username: 'Bob', team: 'GREEN' },
    'contest-1'
  )).toThrow('Invalid contest inputs');
});
