const { app } = require('@azure/functions');
const { players, game, getOrCreateGameState } = require('./shared/cosmos');
const { HISTORY_ID, playerDay } = require('./shared/scoreHistory');
const { rpsSummary } = require('./shared/playerStats');

app.http('stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stats',
  handler: async (request) => {
    const username = String(request.query.get('username') || '').trim();
    if (!username || username.length > 40) {
      return { status: 400, jsonBody: { error: 'A username is required.' } };
    }

    const id = username.toLowerCase();
    let player = null;
    try {
      ({ resource: player } = await players.item(id, id).read());
    } catch (error) {
      if (error?.statusCode !== 404 && Number(error?.code) !== 404) throw error;
    }
    if (!player || !player.username) {
      return { status: 404, jsonBody: { error: 'Player not found.' } };
    }

    const now = Date.now();
    const [{ resources: rows }, { resources: history }, state] = await Promise.all([
      players.items
        .query('SELECT c.username, c.team, c.rpsWins, c.rpsLosses FROM c WHERE IS_DEFINED(c.rpsWins) OR IS_DEFINED(c.rpsLosses)')
        .fetchAll(),
      game.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: HISTORY_ID }],
        })
        .fetchAll(),
      getOrCreateGameState(),
    ]);

    const doc = history[0];
    const events = doc && (doc.round ?? null) === (state.weekId ?? null) && Array.isArray(doc.events) ? doc.events : [];

    return {
      status: 200,
      jsonBody: {
        username: player.username,
        team: player.team === 'red' || player.team === 'blue' ? player.team : null,
        rps: rpsSummary(rows, player.username),
        today: playerDay(events, player.username, now),
        serverNow: new Date(now).toISOString(),
      },
    };
  },
});
