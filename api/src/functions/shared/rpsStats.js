const CONTEST_ID = /^[A-Za-z0-9-]{1,128}$/;

function contestResult(state) {
  const last = state?.lastContest;
  if (!last || typeof last.id !== 'string' || !CONTEST_ID.test(last.id)) return null;
  if (typeof last.winnerUsername !== 'string' || typeof last.loserUsername !== 'string') return null;

  const winnerId = last.winnerUsername.toLowerCase();
  const loserId = last.loserUsername.toLowerCase();
  if (!winnerId || !loserId || winnerId === loserId) return null;

  return { id: last.id, winnerId, loserId };
}

function isIgnorable(error) {
  const code = error?.statusCode ?? Number(error?.code);
  return code === 404 || code === 412;
}

async function addResult(players, playerId, field, contestId) {
  try {
    await players.item(playerId, playerId).patch({
      condition: `from c where NOT IS_DEFINED(c.rpsLastContest) OR c.rpsLastContest != '${contestId}'`,
      operations: [
        { op: 'incr', path: `/${field}`, value: 1 },
        { op: 'set', path: '/rpsLastContest', value: contestId },
      ],
    });
  } catch (error) {
    if (!isIgnorable(error)) throw error;
  }
}

async function recordResult(players, result) {
  await addResult(players, result.winnerId, 'rpsWins', result.id);
  await addResult(players, result.loserId, 'rpsLosses', result.id);
}

function rankPlayers(rows, limit = 10) {
  return rows
    .map((row) => ({
      username: String(row.username || ''),
      team: row.team === 'red' || row.team === 'blue' ? row.team : null,
      wins: Number(row.rpsWins) || 0,
      losses: Number(row.rpsLosses) || 0,
    }))
    .filter((row) => row.username && (row.wins > 0 || row.losses > 0))
    .sort((a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.username.localeCompare(b.username))
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

module.exports = { contestResult, recordResult, rankPlayers };
