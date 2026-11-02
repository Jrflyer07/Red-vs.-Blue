const RpsUI = require('../../src/rps-ui');

const START = Date.now();
const contest = {
  id: 'contest-1', defenderUsername: 'Alice', challengerUsername: 'Bob',
  round: 1, expiresAt: START + 30000, status: 'active',
  defenderSubmitted: false, challengerSubmitted: false
};

function state(overrides = {}) {
  return { contest: { ...contest }, lastContest: null,
    serverNow: new Date(Date.now()).toISOString(), ...overrides };
}

test('correctly identifies participants regardless of username case', () => {
  expect(RpsUI.contestantRole(contest, 'alice')).toBe('defender');
  expect(RpsUI.contestantRole(contest, 'BOB')).toBe('challenger');
  expect(RpsUI.contestantRole(contest, 'Eve')).toBeNull();
});

test('missing username is not a participant', () => {
  expect(RpsUI.contestantRole(contest, null)).toBeNull();
  expect(RpsUI.contestantRole(null, 'Alice')).toBeNull();
});

test('submitted status is specific to player role', () => {
  const updated = { ...contest, defenderSubmitted: true };
  expect(RpsUI.alreadyPlayed(updated, 'defender')).toBe(true);
  expect(RpsUI.alreadyPlayed(updated, 'challenger')).toBe(false);
});

test('opponents and spectators receive an appropriate contest message', () => {
  expect(RpsUI.contestMessage(contest, 'Bob')).toMatch(/Choose Rock/i);
  expect(RpsUI.contestMessage(contest, 'Eve')).toMatch(/contesting the flag/i);
  expect(RpsUI.contestMessage({ ...contest, status: 'expired' }, 'Bob')).toBe('');
});

test('submitted player sees waiting message, not move disclosure', () => {
  const message = RpsUI.contestMessage({ ...contest, challengerSubmitted: true }, 'bob');
  expect(message).toMatch(/Waiting for the opponent/i);
  expect(message).not.toMatch(/rock|paper|scissors/i);
});

test('winner and loser see different outcomes and timeout reason', () => {
  const result = { id: 'contest-1', winnerUsername: 'Bob', loserUsername: 'Alice',
    reason: 'timeout', endedAt: START };
  expect(RpsUI.contestResult(result, 'bob').won).toBe(true);
  expect(RpsUI.contestResult(result, 'alice').won).toBe(false);
  expect(RpsUI.contestResult(result, 'alice').message).toMatch(/cooldown/i);
  expect(RpsUI.contestResult(result, 'bob').reason).toMatch(/timeout/i);
});

test('spectators never receive player-specific win or loss results', () => {
  const result = { winnerUsername: 'Bob', loserUsername: 'Alice' };
  expect(RpsUI.contestResult(result, 'Eve')).toBeNull();
  expect(RpsUI.contestResult(result, null)).toBeNull();
});

test('countdown never becomes negative', () => {
  expect(RpsUI.secondsLeft(15100, 10000)).toBe(6);
  expect(RpsUI.secondsLeft(9000, 10000)).toBe(0);
  expect(RpsUI.secondsLeft(NaN, 10000)).toBe(0);
});

describe('RPS popup behavior', () => {
  let nodes, buttons, ui, onMove, onState;
  const originalDocument = global.document;

  function element() {
    const handlers = {};
    return { hidden: true, disabled: false, textContent: '', handlers,
      addEventListener: jest.fn((name, cb) => { handlers[name] = cb; }) };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    buttons = ['rock', 'paper', 'scissors'].map(move => ({
      ...element(), dataset: { rpsMove: move }
    }));
    nodes = Object.fromEntries([
      'rpsOverlay', 'rpsTitle', 'rpsOpponent', 'rpsClock',
      'rpsFeedback', 'rpsChoices', 'rpsDismiss'
    ].map(id => [id, element()]));
    nodes.rpsChoices.querySelectorAll = jest.fn().mockReturnValue(buttons);
    global.document = { getElementById: id => nodes[id] };
    onMove = jest.fn();
    onState = jest.fn();
    ui = RpsUI.create({ getUsername: () => 'Alice', submitMove: onMove, onState });
  });

  afterEach(() => {
    global.document = originalDocument;
    jest.useRealTimers();
  });

  test('participating defender sees popup and can submit a secret move', async () => {
    ui.sync(state());
    expect(nodes.rpsOverlay.hidden).toBe(false);
    expect(nodes.rpsOpponent.textContent).toContain('Bob');
    onMove.mockResolvedValue({ action: 'waiting' });
    await buttons[0].handlers.click();
    expect(onMove).toHaveBeenCalledWith({ contestId: 'contest-1', round: 1, move: 'rock' });
    expect(onState).toHaveBeenCalledWith({ action: 'waiting' });
  });

  test('player who submitted already cannot send another move', async () => {
    ui.sync(state({ contest: { ...contest, defenderSubmitted: true } }));
    expect(buttons.every(button => button.disabled)).toBe(true);
    await buttons[1].handlers.click();
    expect(onMove).not.toHaveBeenCalled();
  });

  test('same result popup is dismissed without removing contest history', () => {
    const result = { id: 'contest-1', winnerUsername: 'Alice', loserUsername: 'Bob',
      endedAt: Date.now(), reason: 'rps' };
    ui.sync(state({ contest: null, lastContest: result }));
    expect(nodes.rpsOverlay.hidden).toBe(false);
    expect(nodes.rpsTitle.textContent).toMatch(/won/i);
    nodes.rpsDismiss.handlers.click();
    expect(nodes.rpsOverlay.hidden).toBe(true);
    ui.sync(state({ contest: null, lastContest: result }));
    expect(nodes.rpsOverlay.hidden).toBe(true);
  });

  test('a tied round briefly announces DRAW before round two can be played', async () => {
    ui.sync(state());
    ui.sync(state({ contest: { ...contest, round: 2 } }));

    expect(nodes.rpsOverlay.hidden).toBe(false);
    expect(nodes.rpsTitle.textContent).toBe('DRAW!');
    expect(nodes.rpsOpponent.textContent).toMatch(/Round 1 ended in a tie/);
    expect(nodes.rpsChoices.hidden).toBe(true);
    expect(buttons.every(button => button.disabled)).toBe(true);

    // Even a programmatic click must not submit during the announcement.
    await buttons[0].handlers.click();
    expect(onMove).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);
    expect(nodes.rpsTitle.textContent).toContain('Round 2');
    expect(nodes.rpsChoices.hidden).toBe(false);
    expect(buttons.every(button => !button.disabled)).toBe(true);
  });

  test('repeated polling of the same round does not restart the draw announcement', () => {
    ui.sync(state());
    ui.sync(state({ contest: { ...contest, round: 2 } }));
    jest.advanceTimersByTime(1000);
    ui.sync(state({ contest: { ...contest, round: 2 } }));
    jest.advanceTimersByTime(500);
    expect(nodes.rpsTitle.textContent).toContain('Round 2');
    expect(nodes.rpsChoices.hidden).toBe(false);
  });

  test('joining a duel already in round two does not invent a draw', () => {
    ui.sync(state({ contest: { ...contest, round: 2 } }));
    expect(nodes.rpsTitle.textContent).toContain('Round 2');
    expect(nodes.rpsChoices.hidden).toBe(false);
  });

  test('a finished contest immediately replaces an in-progress draw announcement', () => {
    ui.sync(state());
    ui.sync(state({ contest: { ...contest, round: 2 } }));
    expect(nodes.rpsTitle.textContent).toBe('DRAW!');
    ui.sync(state({ contest: null, lastContest: {
      id: 'contest-1', winnerUsername: 'Alice', loserUsername: 'Bob',
      endedAt: Date.now(), reason: 'rps'
    } }));
    expect(nodes.rpsTitle.textContent).toMatch(/won/i);
    expect(nodes.rpsChoices.hidden).toBe(true);
  });

  test('expired contests cannot take new moves', async () => {
    ui.sync(state({ contest: { ...contest, status: 'expired' } }));
    expect(nodes.rpsOverlay.hidden).toBe(true);
    await buttons[0].handlers.click();
    expect(onMove).not.toHaveBeenCalled();
  });
});
