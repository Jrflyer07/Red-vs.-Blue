// The most recent daily winners from the history documents, newest day first.
function recentChampions(docs, count = 3) {
  return (docs || [])
    .filter((d) => d && typeof d.id === 'string')
    .sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .slice(0, count)
    .map((d) => ({
      day: d.id,
      winner: ['RED', 'BLUE', 'TIE'].includes(d.winner) ? d.winner : null,
      redTotal: Math.round(d.redTotal || 0),
      blueTotal: Math.round(d.blueTotal || 0),
    }));
}

module.exports = { recentChampions };