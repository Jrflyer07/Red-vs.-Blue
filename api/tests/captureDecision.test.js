const { planCapture } = require('../src/functions/shared/captureDecision');

const redHolder = () => ({
  id: 'game-state-main', holder: 'RED', holderUsername: 'Alice',
  holdStart: 1000, redTotal: 10, blueTotal: 5
});
const blue = { username: 'Bob', team: 'blue' };

test('first player captures immediately with no contest', () => {
  const result = planCapture({ ...redHolder(), holder: null, holderUsername: null,
    holdStart: null }, blue, 5000);
  expect(result.status).toBe('captured');
  expect(result.state.holder).toBe('BLUE');
  expect(result.state.holderUsername).toBe('Bob');
  expect(result.state.contest).toBeUndefined();
});

test('opposing press starts RPS but does not transfer ownership or bank score', () => {
  const state = redHolder();
  const result = planCapture(state, blue, 5000, 'contest-1');
  expect(result.status).toBe('contest-started');
  expect(result.state.contest.id).toBe('contest-1');
  expect(result.state.contest.challengerUsername).toBe('Bob');
  expect(result.state.holder).toBe('RED');
  expect(result.state.redTotal).toBe(10);
  expect(state.contest).toBeUndefined();
});

test('an active contest blocks other captures without changing state', () => {
  const started = planCapture(redHolder(), blue, 5000, 'contest-1');
  const result = planCapture(started.state, { username: 'Charlie', team: 'blue' }, 6000);
  expect(result.status).toBe('blocked');
  expect(result.reason).toBe('contest-active');
  expect(result.changed).toBe(false);
});

test('same team cannot capture while its team already holds the flag', () => {
  const result = planCapture(redHolder(), { username: 'David', team: 'red' }, 5000);
  expect(result.reason).toBe('same-team');
});

test('loser on cooldown is blocked until cooldown ends', () => {
  const state = { ...redHolder(), cooldowns: { bob: 7000 } };
  const blocked = planCapture(state, blue, 6000);
  expect(blocked.reason).toBe('cooldown');
  expect(blocked.retryAt).toBe(7000);
  expect(planCapture(state, blue, 7000).status).toBe('contest-started');
});

test('expiration settles old contest atomically with a new capture decision', () => {
  const started = planCapture(redHolder(), blue, 5000, 'contest-old');
  const expired = {
    ...started.state,
    contest: { ...started.state.contest, expiresAt: 6000,
      defenderMove: null, challengerMove: 'paper' }
  };
  const result = planCapture(expired, { username: 'Charlie', team: 'red' },
    7000, 'contest-new');
  // Bob wins by forfeit, then Charlie can challenge the new Blue holder.
  expect(result.status).toBe('contest-started');
  expect(result.state.holder).toBe('BLUE');
  expect(result.state.holderUsername).toBe('Bob');
  expect(result.state.contest.id).toBe('contest-new');
  expect(result.state.redTotal).toBe(16);
});

test('expired contest persists settlement even if next press is blocked', () => {
  const started = planCapture(redHolder(), blue, 5000, 'contest-old');
  const expired = { ...started.state, contest: {
    ...started.state.contest, expiresAt: 6000
  } };
  const result = planCapture(expired, { username: 'David', team: 'red' }, 7000);
  expect(result.status).toBe('blocked');
  expect(result.reason).toBe('same-team');
  expect(result.changed).toBe(true);
  expect(result.state.contest).toBeNull();
});

test('legacy holder without username can be replaced without an unanswerable contest', () => {
  const result = planCapture({ ...redHolder(), holderUsername: null }, blue, 5000);
  expect(result.status).toBe('captured');
  expect(result.state.holder).toBe('BLUE');
});
