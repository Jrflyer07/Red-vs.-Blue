const RECORD_ID = 'king-of-the-hill';

function currentHold(state, now) {
  if (!state || !state.holder || !state.holderUsername || !state.holdStart) return null;
  const start = new Date(state.holdStart).getTime();
  if (!Number.isFinite(start)) return null;
  return {
    username: String(state.holderUsername),
    team: String(state.holder).toLowerCase(),
    holdStart: start,
    seconds: Math.max(0, (now - start) / 1000),
  };
}

function recordForRound(doc, round) {
  if (!doc || (doc.round ?? null) !== (round ?? null)) return null;
  return {
    username: doc.username,
    team: doc.team,
    seconds: Number(doc.seconds) || 0,
    holdStart: Number(doc.holdStart) || 0,
  };
}

function shouldSave(hold, record) {
  if (!hold) return false;
  if (!record) return true;
  return Math.floor(hold.seconds) > record.seconds;
}

function newRecordDoc(round, hold) {
  return {
    id: RECORD_ID,
    round: round ?? null,
    username: hold.username,
    team: hold.team,
    seconds: Math.floor(hold.seconds),
    holdStart: hold.holdStart,
  };
}

module.exports = { RECORD_ID, currentHold, recordForRound, shouldSave, newRecordDoc };
