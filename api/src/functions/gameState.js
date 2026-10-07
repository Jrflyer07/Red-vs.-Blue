const { app } = require('@azure/functions');
const { game, getOrCreateGameState } = require('./shared/cosmos');
const { bankAndSwitchHolder } = require('./shared/scoring');

app.http('gameState', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'state',
  handler: async (request, context) => {
    // 1. Get or auto-create document on fresh DB (TR-11)
    const state = await getOrCreateGameState();

    // GET: Fetch current state
    if (request.method === 'GET') {
      return { status: 200, jsonBody: state };
    }

    // POST: Handle button press & switch holders (TR-13)
    if (request.method === 'POST') {
      const body = await request.json();
      if (!body || !body.team || !['RED', 'BLUE'].includes(body.team)) {
        return { status: 400, body: "Invalid team. Must be 'RED' or 'BLUE'." };
      }

      const updatedState = bankAndSwitchHolder(state, body.team);

      const { resource } = await game
        .item(updatedState.id, updatedState.partitionKey)
        .replace(updatedState);

      return { status: 200, jsonBody: resource };
    }

    return { status: 405, body: 'Method Not Allowed' };
  },
});