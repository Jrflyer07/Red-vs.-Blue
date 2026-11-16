const { rpsSummary } = require('../src/functions/shared/playerStats');

const rows = Array.from({ length: 12 }, (_, i) => ({ username: `p${i}`, team: i % 2 ? 'red' : 'blue', rpsWins: 12 - i, rpsLosses: 0 }));

test('a player in the top 10 gets their rank and the top 10 flag', () => {
  expect(rpsSummary(rows, 'P2')).toEqual({ wins: 10, losses: 0, rank: 3, rankedPlayers: 12, inTop10: true });
});

test('a player outside the top 10 still gets their rank', () => {
  expect(rpsSummary(rows, 'p11')).toEqual({ wins: 1, losses: 0, rank: 12, rankedPlayers: 12, inTop10: false });
});

test('a player with no rock paper scissors games is not ranked yet', () => {
  expect(rpsSummary(rows, 'newbie')).toEqual({ wins: 0, losses: 0, rank: null, rankedPlayers: 12, inTop10: false });
});
