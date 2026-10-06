const { app } = require('@azure/functions');
const crypto = require('crypto');
const { players } = require('../shared/cosmos');

app.http('join', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const body = await request.json();
    const playerId = body.playerId;

    // if the browser sent an id, see if we already have that player
    if (playerId) {
      const result = await players.item(playerId, playerId).read();
      if (result.resource) {
        return { jsonBody: { playerId: playerId, team: result.resource.team } };
      }
    }

    // new player, so pick a random team
    let team = 'red';
    if (Math.random() < 0.5) {
      team = 'blue';
    }

    const newPlayer = {
      id: crypto.randomUUID(),
      team: team,
    };

    await players.items.create(newPlayer);
    context.log('New player joined: ' + team);

    return { jsonBody: { playerId: newPlayer.id, team: team } };
  },
});