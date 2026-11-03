const { contestResult, recordResult, rankPlayers } = require('../src/functions/shared/rpsStats');

function fakePlayers(docs) {
  const store = new Map(docs.map((doc) => [doc.id, { ...doc }]));
  return {
    store,
    item: (id) => ({
      patch: async ({ condition, operations }) => {
        const doc = store.get(id);
        if (!doc) throw Object.assign(new Error('Not found'), { statusCode: 404 });
        const contestId = condition.match(/!= '([^']+)'/)[1];
        if (doc.rpsLastContest === contestId) {
          throw Object.assign(new Error('Precondition failed'), { statusCode: 412 });
        }
        for (const { op, path, value } of operations) {
          const key = path.slice(1);
          doc[key] = op === 'incr' ? (doc[key] || 0) + value : value;
        }
      },
    }),
  };
}

test('reads the winner and loser of the last contest', () => {
  const state = { lastContest: { id: 'abc-1', winnerUsername: 'Peyton', loserUsername: 'Will' } };

  expect(contestResult(state)).toEqual({ id: 'abc-1', winnerId: 'peyton', loserId: 'will' });
});

test('ignores a game with no finished contest', () => {
  expect(contestResult({ lastContest: null })).toBe(null);
  expect(contestResult({})).toBe(null);
});

test('ignores a contest id that is not a plain id', () => {
  const state = { lastContest: { id: "x' OR 1=1", winnerUsername: 'a', loserUsername: 'b' } };

  expect(contestResult(state)).toBe(null);
});

test('adds one win and one loss for a contest', async () => {
  const players = fakePlayers([{ id: 'peyton' }, { id: 'will' }]);

  await recordResult(players, { id: 'c1', winnerId: 'peyton', loserId: 'will' });

  expect(players.store.get('peyton').rpsWins).toBe(1);
  expect(players.store.get('will').rpsLosses).toBe(1);
});

test('the same contest is only counted once', async () => {
  const players = fakePlayers([{ id: 'peyton' }, { id: 'will' }]);
  const result = { id: 'c1', winnerId: 'peyton', loserId: 'will' };

  await recordResult(players, result);
  await recordResult(players, result);

  expect(players.store.get('peyton').rpsWins).toBe(1);
  expect(players.store.get('will').rpsLosses).toBe(1);
});

test('a missing player does not stop the other from being counted', async () => {
  const players = fakePlayers([{ id: 'peyton' }]);

  await recordResult(players, { id: 'c1', winnerId: 'peyton', loserId: 'gone' });

  expect(players.store.get('peyton').rpsWins).toBe(1);
});

test('ranks by most wins, then fewest losses, then name', () => {
  const rows = [
    { username: 'bryce', team: 'blue', rpsWins: 3, rpsLosses: 2 },
    { username: 'will', team: 'red', rpsWins: 5, rpsLosses: 4 },
    { username: 'darryl', team: 'red', rpsWins: 3, rpsLosses: 1 },
    { username: 'peyton', team: 'blue', rpsWins: 3, rpsLosses: 1 },
  ];

  expect(rankPlayers(rows).map((row) => [row.rank, row.username])).toEqual([
    [1, 'will'],
    [2, 'darryl'],
    [3, 'peyton'],
    [4, 'bryce'],
  ]);
});

test('shows at most 10 players and skips players with no games', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ username: `p${i}`, team: 'red', rpsWins: i, rpsLosses: 0 }));

  const ranked = rankPlayers(rows);

  expect(ranked.length).toBe(10);
  expect(ranked.some((row) => row.username === 'p0')).toBe(false);
});
