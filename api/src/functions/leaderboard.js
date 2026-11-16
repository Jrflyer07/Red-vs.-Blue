const { app } = require('@azure/functions');
const { players, getOrCreateGameState } = require('./shared/cosmos');
const { contestResult, recordResult, rankPlayers } = require('./shared/rpsStats');

let lastRecordedId = null;

app.http('leaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (request, context) => {
    try {
      const result = contestResult(await getOrCreateGameState());
      if (result && result.id !== lastRecordedId) {
        await recordResult(players, result);
        lastRecordedId = result.id;
      }
    } catch (error) {
      context.error('Could not record the latest contest', error);
    }

    const { resources } = await players.items
      .query('SELECT c.username, c.team, c.rpsWins, c.rpsLosses FROM c WHERE IS_DEFINED(c.rpsWins) OR IS_DEFINED(c.rpsLosses)')
      .fetchAll();

    return { status: 200, jsonBody: { players: rankPlayers(resources) } };
  },
});
