const RpsSpectator = require('../../src/rps-spectator');

const BASE = 1750000000000;
const contest = {
  id: 'contest-1', defenderUsername: 'Alice', challengerUsername: 'Bob',
  round: 1, expiresAt: BASE + 30000, status: 'active',
  defenderSubmitted: false, challengerSubmitted: false
};

function apiState(overrides = {}) {
  return { serverNow: new Date(BASE).toISOString(), contest: { ...contest },
    lastContest: null, ...overrides };
}

function element() {
  const handlers = {};
  return {
    hidden: true, textContent: '', handlers, attributes: {},
    addEventListener: jest.fn((event, cb) => { handlers[event] = cb; }),
    setAttribute: jest.fn(function (name, value) { this.attributes[name] = value; })
  };
}

describe('Read-only spectator panel', () => {
  let nodes, spectator;
  const savedDocument = global.document;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(BASE);
    nodes = Object.fromEntries([
      'spectatorArea', 'spectatorToggle', 'spectatorPanel', 'spectatorTitle',
      'spectatorMatchup', 'spectatorRound', 'spectatorClock',
      'spectatorDefender', 'spectatorChallenger', 'spectatorAnnouncement'
    ].map(id => [id, element()]));
    global.document = { getElementById: id => nodes[id] };
    spectator = RpsSpectator.create({ getUsername: () => 'Eve' });
  });

  afterEach(() => {
    global.document = savedDocument;
    jest.useRealTimers();
  });

  test('spectator button opens a read-only panel with names, round and status', () => {
    spectator.sync(apiState());
    expect(nodes.spectatorArea.hidden).toBe(false);
    expect(nodes.spectatorPanel.hidden).toBe(true);
    nodes.spectatorToggle.handlers.click();
    expect(nodes.spectatorPanel.hidden).toBe(false);
    expect(nodes.spectatorMatchup.textContent).toContain('Alice (defender) vs Bob (challenger)');
    expect(nodes.spectatorRound.textContent).toContain('Round 1');
    expect(nodes.spectatorClock.textContent).toBe('30s left');
    expect(nodes.spectatorDefender.textContent).toMatch(/Waiting for move/);
    expect(nodes.spectatorChallenger.textContent).toMatch(/Waiting for move/);
    expect(Object.values(nodes).some(node => node.dataset?.rpsMove)).toBe(false);
  });

  test('participants are not offered the spectator control', () => {
    const participant = RpsSpectator.isParticipant(contest, 'ALICE');
    expect(participant).toBe(true);
    spectator = RpsSpectator.create({ getUsername: () => 'Bob' });
    spectator.sync(apiState());
    expect(nodes.spectatorArea.hidden).toBe(true);
  });

  test('only submission status is visible; actual RPS choices are not exposed', () => {
    spectator.sync(apiState({ contest: { ...contest, defenderSubmitted: true } }));
    nodes.spectatorToggle.handlers.click();
    expect(nodes.spectatorDefender.textContent).toMatch(/Move submitted/);
    expect(nodes.spectatorChallenger.textContent).toMatch(/Waiting for move/);
    expect(nodes.spectatorAnnouncement.textContent).toMatch(/Moves remain hidden/);
  });

  test('round advancement shows DRAW and updated server countdown', () => {
    spectator.sync(apiState());
    nodes.spectatorToggle.handlers.click();
    spectator.sync(apiState({ contest: { ...contest, round: 2, expiresAt: BASE + 55000 } }));
    expect(nodes.spectatorAnnouncement.textContent).toMatch(/DRAW!/);
    expect(nodes.spectatorClock.textContent).toBe('55s left');
    jest.advanceTimersByTime(1600);
    expect(nodes.spectatorAnnouncement.textContent).toMatch(/previous round ended in a draw/i);
    expect(nodes.spectatorClock.textContent).toBe('54s left');
  });

  test('spectators see the winner, loser and timeout reason after a contest', () => {
    spectator.sync(apiState());
    nodes.spectatorToggle.handlers.click();
    spectator.sync(apiState({ contest: null, lastContest: {
      id: 'contest-1', round: 3, winnerUsername: 'Bob', loserUsername: 'Alice',
      endedAt: BASE, reason: 'timeout'
    } }));
    expect(nodes.spectatorArea.hidden).toBe(false);
    expect(nodes.spectatorTitle.textContent).toMatch(/Final result/);
    expect(nodes.spectatorDefender.textContent).toBe('Winner: Bob');
    expect(nodes.spectatorChallenger.textContent).toBe('Loser: Alice');
    expect(nodes.spectatorAnnouncement.textContent).toMatch(/timeout/);
  });

  test('spectator can close view and results eventually disappear', () => {
    spectator.sync(apiState());
    nodes.spectatorToggle.handlers.click();
    spectator.sync(apiState({ contest: null, lastContest: {
      id: 'contest-1', round: 1, winnerUsername: 'Bob', loserUsername: 'Alice',
      endedAt: BASE, reason: 'rps'
    } }));
    nodes.spectatorToggle.handlers.click();
    expect(nodes.spectatorPanel.hidden).toBe(true);
    jest.advanceTimersByTime(20500);
    expect(nodes.spectatorArea.hidden).toBe(true);
  });
});
