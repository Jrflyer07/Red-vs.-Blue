// Pure time-banking logic (TR-13)
function bankAndSwitchHolder(currentState, newHolder, now = Date.now()) {
  if (currentState.holder === newHolder) return currentState;

  let { redTotal, blueTotal, holder, holdStart } = currentState;

  // Bank elapsed seconds for the outgoing holder
  if (holder && holdStart) {
    const elapsedSeconds = Math.max(0, (now - holdStart) / 1000);
    if (holder === 'RED') redTotal += elapsedSeconds;
    if (holder === 'BLUE') blueTotal += elapsedSeconds;
  }

  return {
    ...currentState,
    holder: newHolder,
    holdStart: now,
    redTotal,
    blueTotal,
  };
}

// Live client score display calculation helper (TR-12)
function getLiveScore(team, state, now = Date.now()) {
  const bankedTotal = team === 'RED' ? state.redTotal : state.blueTotal;

  if (state.holder === team && state.holdStart !== null) {
    const activeElapsed = Math.max(0, (now - state.holdStart) / 1000);
    return bankedTotal + activeElapsed;
  }

  return bankedTotal;
}

module.exports = { bankAndSwitchHolder, getLiveScore };