
const { resolveRpsRound } =
  require('../src/functions/shared/rps');

describe('Rock-paper-scissors rules', () => {
  test.each([
    ['rock', 'scissors'],
    ['paper', 'rock'],
    ['scissors', 'paper']
  ])('defender wins with %s against %s', (defender, challenger) => {
    expect(resolveRpsRound(defender, challenger)).toBe('defender');
  });

  test.each([
    ['rock', 'paper'],
    ['paper', 'scissors'],
    ['scissors', 'rock']
  ])('challenger wins with %s against %s', (defender, challenger) => {
    expect(resolveRpsRound(defender, challenger)).toBe('challenger');
  });

  test.each(['rock', 'paper', 'scissors'])('matching %s moves tie', (move) => {
    expect(resolveRpsRound(move, move)).toBe('tie');
  });

  test('invalid moves are rejected', () => {
    expect(() => resolveRpsRound('lizard', 'rock')).toThrow('Invalid');
    expect(() => resolveRpsRound('rock', null)).toThrow('Invalid');
  });
});
