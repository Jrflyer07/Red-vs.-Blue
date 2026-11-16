const { app } = require('@azure/functions');
const { players, getOrCreateGameState } = require('./shared/cosmos');
const { buildPlayerStats } = require('./shared/playerStats');
const { isValidUsername } = require('./shared/username');

app.http('stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stats',
  handler: async (request, context) => {
    const username = request.query.get('username');

    if (!isValidUsername(username)) {
      return { status: 400, body: 'Missing or invalid username.' };
    }

    const playerId = username.toLowerCase();
    let player;

    try {
      const result = await players.item(playerId, playerId).read();
      player = result.resource;
    } catch (error) {
      if (error.statusCode !== 404 && Number(error.code) !== 404) {
        throw error;
      }
    }

    if (!player) {
      return { status: 404, body: 'Unknown player.' };
    }

    const state = await getOrCreateGameState();

    return {
      status: 200,
      jsonBody: buildPlayerStats(player, state)
    };
  },
});
