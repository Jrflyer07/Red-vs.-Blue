const { bankAndSwitchHolder, getLiveScore } = require('./shared/scoring');

describe('Scoring & Switch Math Unit Tests', () => {
  const initialState = {
    id: 'game-state-main',
    partitionKey: 'global',
    holder: null,
    holdStart: null,
    redTotal: 0,
    blueTotal: 0,
  };

  test('No presses yet returns 0 for both teams', () => {
    expect(getLiveScore('RED', initialState)).toBe(0);
    expect(getLiveScore('BLUE', initialState)).toBe(0);
  });

  test('First press switches to RED without banking previous time', () => {
    const t0 = 1000;
    const redState = bankAndSwitchHolder(initialState, 'RED', t0);

    expect(redState.holder).toBe('RED');
    expect(redState.holdStart).toBe(t0);
    expect(redState.redTotal).toBe(0);
    expect(redState.blueTotal).toBe(0);
  });

  test('Banks RED hold time when button switches to BLUE (TR-13)', () => {
    const t0 = 1000;
    const redState = bankAndSwitchHolder(initialState, 'RED', t0);

    const t1 = 21000; // 20 seconds later
    const blueState = bankAndSwitchHolder(redState, 'BLUE', t1);

    expect(blueState.holder).toBe('BLUE');
    expect(blueState.holdStart).toBe(t1);
    expect(blueState.redTotal).toBe(20);
    expect(blueState.blueTotal).toBe(0);
  });

  test('Long hold calculation precision (TR-12)', () => {
    const now = Date.now();
    const longHoldState = {
      ...initialState,
      holder: 'RED',
      holdStart: now - 7200 * 1000, // 2 hours ago
      redTotal: 100,
    };

    expect(getLiveScore('RED', longHoldState, now)).toBe(7300);
  });
});