const { rankPlayers } = require('./rpsStats');

function rpsSummary(rows, username) {
  const ranked = rankPlayers(rows, Infinity);
  const name = String(username || '').toLowerCase();
  const me = ranked.find((row) => row.username.toLowerCase() === name);
  return {
    wins: me ? me.wins : 0,
    losses: me ? me.losses : 0,
    rank: me ? me.rank : null,
    rankedPlayers: ranked.length,
    inTop10: Boolean(me && me.rank <= 10),
  };
}

module.exports = { rpsSummary };
