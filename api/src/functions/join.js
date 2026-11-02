const { app } = require('@azure/functions');
const { players } = require('../shared/cosmos');
const { isValidUsername, USERNAME_RULES } = require('./shared/username');

app.http('join', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const body = await request.json();
    const username = body.username;

    if (!isValidUsername(username)) {
      return { status: 400, body: USERNAME_RULES };
    }

    // lowercase id so "Will" and "will" are the same player
    const id = username.toLowerCase();

    // pick a random team in case this is a new player
    let team = 'red';
    if (Math.random() < 0.5) {
      team = 'blue';
    }

    try {
      await players.items.create({ id: id, username: username, team: team });
      context.log('New player joined: ' + team);
      return { jsonBody: { username: username, team: team } };
    } catch (error) {
      // 409 means the username is taken. Anything else is a real error.
      if (error.code !== 409) {
        throw error;
      }
    }

    // username is taken, so log them in as that player
    const result = await players.item(id, id).read();
    return { jsonBody: { username: result.resource.username, team: result.resource.team } };
  },
});
