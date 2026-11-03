const { app } = require('@azure/functions');
const { players, game, getOrCreateGameState } = require('./shared/cosmos');
const { planCapture } = require('./shared/captureDecision');
const { settleExpiredContest } = require('./shared/contestTimeout');
const { logPress } = require('./shared/pressLog');
const { buildStateResponse } = require('./shared/stateResponse');
const { isValidUsername } = require('./shared/username');
const { verifyPlayerSession } = require('./shared/playerSession');

function captureDenial(decision) {
  if (decision.reason === 'cooldown') {
    return { status: 429, jsonBody: {
      error: 'cooldown', retryAt: decision.retryAt
    } };
  }
  return { status: 409, body: decision.reason === 'contest-active'
    ? 'Button is currently contested.' : 'Your team already holds it.' };
}

app.http('gameState', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'state',
  handler: async (request, context) => {
    // Get or auto-create document on fresh DB (TR-11)
    const state = await getOrCreateGameState();

    // GET also finalizes expired contests so no absent player can lock the flag.
    if (request.method === 'GET') {
      let latest = state;
      for (let attempt = 0; attempt < 5; attempt++) {
        const settlement = settleExpiredContest(latest, Date.now());
        if (settlement.status !== 'forfeit') {
          return { status: 200, jsonBody: buildStateResponse(latest) };
        }
        if (!latest._etag) throw new Error('Game-state ETag missing.');
        try {
          const { resource } = await game.item(latest.id, latest.id).replace(
            settlement.state,
            { accessCondition: { type: 'IfMatch', condition: latest._etag } }
          );
          return { status: 200, jsonBody: buildStateResponse(resource) };
        } catch (error) {
          if (error.statusCode === 412 || Number(error.code) === 412) {
            latest = await getOrCreateGameState();
            continue;
          }
          throw error;
        }
      }
      return { status: 409, body: 'Game changed. Please refresh.' };
    }

    // POST: Immediately capture an empty flag, or start an RPS contest
    if (request.method === 'POST') {
      let body;

      try {
        body = await request.json();
      } catch {
        return { status: 400, body: 'Invalid JSON.' };
      }

      const username = body?.username;

      if (!isValidUsername(username)) {
        return { status: 400, body: 'Missing or invalid username.' };
      }

      // The player's document id is their lowercase username.
      const playerId = username.toLowerCase();

      // Find the player's actual assigned team.
      let playerResult;

      try {
        playerResult = await players.item(playerId, playerId).read();
      } catch (error) {
        if (error.statusCode === 404 || Number(error.code) === 404) {
          return { status: 401, body: 'Unknown player.' };
        }
        throw error;
      }

      const player = playerResult.resource;

      if (!player || !['red', 'blue'].includes(player.team)) {
        return { status: 401, body: 'Invalid player.' };
      }

      // A username is public. Require the browser's secret session token
      // before changing scores, capturing a flag, or reserving rate limits.
      if (!verifyPlayerSession(player, body?.sessionToken)) {
        return { status: 401, body: 'Invalid player session.' };
      }

      let latestState = state;
      let rateReserved = false;

      // Retry if another player updates the game simultaneously.
      for (let attempt = 0; attempt < 5; attempt++) {
        const decision = planCapture(latestState, player, Date.now());


        if (decision.status === 'blocked' && !decision.changed) {
          return captureDenial(decision);
        }

        // Allow one press per second per player.
        if (decision.status !== 'blocked' && !rateReserved) {
          const now = Date.now();
          const lastPress = Number(player.lastPressAt || 0);

          if (now - lastPress < 1000) {
            return { status: 429, body: 'Please wait one second.' };
          }

          const playerEtag = player._etag || playerResult.etag;

          if (!playerEtag) {
            throw new Error('Player ETag missing.');
          }

          try {
            await players.item(playerId, playerId).replace(
              { ...player, lastPressAt: now },
              {
                accessCondition: {
                  type: 'IfMatch',
                  condition: playerEtag
                }
              }
            );

            rateReserved = true;

          } catch (error) {
            if (error.statusCode === 412 || Number(error.code) === 412) {
              return { status: 429, body: 'Press already in progress.' };
            }

            throw error;
          }
        }

        if (!latestState._etag) {
          throw new Error('Game-state ETag missing.');
        }

        try {
          const { resource } = await game
            .item(decision.state.id, decision.state.id)
            .replace(decision.state, {
              accessCondition: {
                type: 'IfMatch',
                condition: latestState._etag
              }
            });


          const heldBefore = latestState.holder
            ? String(latestState.holder).toUpperCase() : null;
          const heldNow = resource.holder
            ? String(resource.holder).toUpperCase() : null;

          if (decision.status !== 'blocked' && heldNow && heldNow !== heldBefore) {
            try {
              await logPress({ playerId, team: heldNow });
            } catch (err) {
              context.error?.('press log failed', err); // never fail the press over the feed
            }
          }

          if (decision.status === 'blocked') return captureDenial(decision);
          return {
            status: decision.status === 'contest-started' ? 202 : 200,
            jsonBody: {
              ...buildStateResponse(resource),
              action: decision.status
            }
          };

        } catch (error) {
          // Someone else captured before we saved.
          if (error.statusCode === 412 || Number(error.code) === 412) {
            latestState = await getOrCreateGameState();
            continue;
          }

          throw error;
        }
      }

      return {
        status: 409,
        body: 'Game changed too quickly. Try again.'
      };
    }
    return { status: 405, body: 'Method Not Allowed' };
  },
});