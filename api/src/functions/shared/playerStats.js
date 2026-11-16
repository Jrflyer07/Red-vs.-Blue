function holdSecondsAt(holdStart, now) {
  if (!holdStart) {
    return 0;
  }
  return Math.max(0, (now - holdStart) / 1000);
}

function isHolding(player, state) {
  return Boolean(
    state &&
    state.holder &&
    state.holderUsername &&
    state.holderUsername.toLowerCase() === player.username.toLowerCase()
  );
}

function buildPlayerStats(player, state, now = Date.now()) {
  const holding = isHolding(player, state);
  const savedSeconds = Number(player.heldSeconds || 0);
  const currentSeconds = holding ? holdSecondsAt(state.holdStart, now) : 0;

  return {
    username: player.username,
    team: player.team,
    pressCount: Number(player.pressCount || 0),
    heldSeconds: savedSeconds + currentSeconds,
    holding
  };
}

module.exports = { holdSecondsAt, buildPlayerStats };
