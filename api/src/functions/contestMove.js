const { app } = require('@azure/functions');
const { players, game, getOrCreateGameState } = require('./shared/cosmos');
const { isValidUsername } = require('./shared/username');
const { verifyPlayerSession } = require('./shared/playerSession');
const { submitContestMove } = require('./shared/contestRound');
const { settleExpiredContest } = require('./shared/contestTimeout');
const { buildStateResponse } = require('./shared/stateResponse');

function isPreconditionFailure(error) {
  return error?.statusCode === 412 || Number(error?.code) === 412;
}

// Each move carries the contest ID and round number, so an old or retried
// request can never accidentally place a move in a later contest/round.
app.http('contestMove', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contest/move',
  handler: async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, body: 'Invalid JSON.' };
    }

    const { username, sessionToken, contestId, round, move } = body || {};
    if (!isValidUsername(username) ||
        typeof contestId !== 'string' || !contestId || contestId.length > 128 ||
        !Number.isSafeInteger(round) || round < 1 ||
        !['rock', 'paper', 'scissors'].includes(move)) {
      return { status: 400, body: 'Invalid contest move request.' };
    }

    const playerId = username.toLowerCase();
    let playerResult;
    try {
      playerResult = await players.item(playerId, playerId).read();
    } catch (error) {
      if (error?.statusCode === 404 || Number(error?.code) === 404) {
        return { status: 401, body: 'Unknown player.' };
      }
      throw error;
    }
    const player = playerResult.resource;
    if (!player || !['red', 'blue'].includes(player.team) ||
        !verifyPlayerSession(player, sessionToken)) {
      return { status: 401, body: 'Invalid player session.' };
    }

    let state = await getOrCreateGameState();
    for (let attempt = 0; attempt < 5; attempt++) {
      const contest = state.contest;
      if (!contest || contest.id !== contestId || contest.round !== round) {
        return { status: 409, body: 'Contest or round is no longer active.' };
      }

      const name = player.username.toLowerCase();
      if (name !== contest.defenderUsername.toLowerCase() &&
          name !== contest.challengerUsername.toLowerCase()) {
        return { status: 403, body: 'You are not a participant in this contest.' };
      }

      // Timeout settlement is a server-side write, not permission to add a
      // late move. The existing holder continues scoring unless ownership changes.
      const now = Date.now();
      const settlement = settleExpiredContest(state, now);
      const result = settlement.status === 'forfeit'
        ? { status: 'expired', state: settlement.state }
        : submitContestMove(state, player.username, move, now);

      if (result.status === 'already-submitted') {
        return {
          status: 200,
          jsonBody: { action: 'already-submitted', ...buildStateResponse(state) }
        };
      }
      if (!['waiting', 'tie', 'resolved', 'expired'].includes(result.status)) {
        return { status: 409, body: 'Contest move was not accepted.' };
      }
      if (!state._etag) throw new Error('Game-state ETag missing.');

      try {
        const { resource } = await game.item(state.id, state.id).replace(
          result.state,
          { accessCondition: { type: 'IfMatch', condition: state._etag } }
        );
        return {
          status: result.status === 'waiting' ? 202
            : result.status === 'expired' ? 409 : 200,
          jsonBody: { action: result.status, ...buildStateResponse(resource) }
        };
      } catch (error) {
        if (isPreconditionFailure(error)) {
          state = await getOrCreateGameState();
          continue;
        }
        throw error;
      }
    }

    return { status: 409, body: 'Contest changed too quickly. Try again.' };
  }
});
