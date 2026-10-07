/**
 * Frontend scoring helper: saved total + (now - holdStart) (TR-12)
 */
export function getLiveScore(team, state, now = Date.now()) {
  const bankedTotal = team === 'RED' ? state.redTotal : state.blueTotal;

  if (state.holder === team && state.holdStart !== null) {
    const activeElapsed = Math.max(0, (now - state.holdStart) / 1000);
    return bankedTotal + activeElapsed;
  }

  return bankedTotal;
}