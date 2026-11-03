const { app } = require('@azure/functions');
const { players } = require('../shared/cosmos');
const { isValidUsername, USERNAME_RULES } = require('./shared/username');
const { createPlayerSession, verifyPlayerSession } = require('./shared/playerSession');

function isConflict(error) {
  return error?.statusCode === 409 || Number(error?.code) === 409;
}

app.http('join', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, body: 'Invalid JSON.' };
    }

    const username = body?.username;
    if (!isValidUsername(username)) {
      return { status: 400, body: USERNAME_RULES };
    }

    // Existing names (including legacy players) can only be reused with a
    // previously issued token. Never let a stranger claim an old username.
    const id = username.toLowerCase();
    const presentedToken = body?.sessionToken;

    // A token-bearing request is a login attempt, never registration.
    // This prevents someone with a stale token from silently creating a new
    // identity with the requested username.
    if (presentedToken !== undefined) {
      let result;
      try {
        result = await players.item(id, id).read();
      } catch (error) {
        if (error?.statusCode === 404 || Number(error?.code) === 404) {
          return { status: 401, body: 'Session not recognized.' };
        }
        throw error;
      }
      const player = result.resource;
      if (!verifyPlayerSession(player, presentedToken)) {
        return { status: 401, body: 'Invalid player session.' };
      }
      return {
        status: 200,
        jsonBody: {
          username: player.username,
          team: player.team,
          sessionToken: presentedToken
        }
      };
    }

    const { sessionToken, sessionTokenHash } = createPlayerSession();
    const team = Math.random() < 0.5 ? 'blue' : 'red';

    try {
      await players.items.create({ id, username, team, sessionTokenHash });
      context.log('New player joined: ' + team);
      return { status: 200, jsonBody: { username, team, sessionToken } };
    } catch (error) {
      if (!isConflict(error)) throw error;
      return {
        status: 409,
        body: 'Username already exists. Use its saved browser session or choose a new name. Legacy usernames require an administrator-assisted migration.'
      };
    }
  }
});
