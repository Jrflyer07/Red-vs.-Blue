const { app } = require('@azure/functions');
const { pressLog } = require('./shared/cosmos');

app.http('recent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'recent',
  handler: async () => {
    const { resources } = await pressLog.items
      .query(
        { query: 'SELECT TOP 10 c.playerId, c.team, c.timestamp FROM c ORDER BY c.timestamp DESC' },
        { partitionKey: 'global' }
      )
      .fetchAll();
    return { status: 200, jsonBody: resources };
  },
});