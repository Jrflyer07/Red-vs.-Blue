const { app } = require('@azure/functions');
const { history } = require('./shared/cosmos');
const { recentChampions } = require('./shared/champions');

app.http('champions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'champions',
  handler: async () => {
    const { resources } = await history.items
      .query(
        { query: 'SELECT c.id, c.winner, c.redTotal, c.blueTotal FROM c' },
        { partitionKey: 'global' }
      )
      .fetchAll();

    return {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=30' },
      jsonBody: recentChampions(resources, 3),
    };
  },
});