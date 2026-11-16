const { recentChampions } = require('../src/functions/shared/champions');

test('returns the three most recent days, newest first', () => {
  const result = recentChampions([
    { id: '2026-11-01', winner: 'RED', redTotal: 50.4, blueTotal: 10 },
    { id: '2026-11-04', winner: 'BLUE', redTotal: 1, blueTotal: 9 },
    { id: '2026-11-02', winner: 'TIE', redTotal: 5, blueTotal: 5 },
    { id: '2026-11-03', winner: 'RED', redTotal: 8, blueTotal: 2 },
  ]);
  expect(result.map((r) => r.day)).toEqual(['2026-11-04', '2026-11-03', '2026-11-02']);
  expect(result[0]).toEqual({ day: '2026-11-04', winner: 'BLUE', redTotal: 1, blueTotal: 9 });
});

test('fewer than three days, and empty history', () => {
  expect(recentChampions([{ id: '2026-11-01', winner: 'RED' }])).toHaveLength(1);
  expect(recentChampions([])).toEqual([]);
  expect(recentChampions(undefined)).toEqual([]);
});

test('unknown winner values become null', () => {
  expect(recentChampions([{ id: '2026-11-01', winner: 'GREEN' }])[0].winner).toBeNull();
});