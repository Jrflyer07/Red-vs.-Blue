const { app } = require('@azure/functions');
const { players, game, getOrCreateGameState } = require('./shared/cosmos');
const { bankAndSwitchHolder } = require('./shared/scoring');
const { buildStateResponse } = require('./shared/stateResponse');
const { isValidUsername } = require('./shared/username');

app.http('gameState', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'state',
  handler: async (request, context) => {
    // Get or auto-create document on fresh DB (TR-11)
    const state = await getOrCreateGameState();

    // GET: Fetch current state
    if (request.method === 'GET') {
      return {
        status: 200,
        jsonBody: buildStateResponse(state)
      };
    }

    // POST: Handle button press & switch holders (TR-13)
    
    // POST: Capture the button
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

      const team = player.team.toUpperCase();
      let latestState = state;
      let rateReserved = false;

      // Retry if another player updates the game simultaneously.
      for (let attempt = 0; attempt < 5; attempt++) {
        const holder = latestState.holder
          ? latestState.holder.toUpperCase()
          : null;

        // Can't capture if your team already holds the button.
        if (holder === team) {
          return { status: 409, body: 'Your team already holds it.' };
        }

        // Allow one press per second per player.
        if (!rateReserved) {
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

        // Use Bryce's helper to bank time and change owners.
        const updatedState = {
          ...bankAndSwitchHolder({ ...latestState, holder }, team, Date.now()),
          holderUsername: player.username
        };

        if (!latestState._etag) {
          throw new Error('Game-state ETag missing.');
        }

        try {
          const { resource } = await game
            .item(updatedState.id, updatedState.id)
            .replace(updatedState, {
              accessCondition: {
                type: 'IfMatch',
                condition: latestState._etag
              }
            });

          return {
            status: 200,
            jsonBody: buildStateResponse(resource)
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