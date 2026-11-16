const { app } = require('@azure/functions');
const { game, getOrCreateGameState } = require('./shared/cosmos');
const { buildStateResponse } = require('./shared/stateResponse');
const { creditHoldTime } = require('./shared/holdCredit');
const { isDeveloper, resetState, kickState } = require('./shared/devTools');

app.http('dev', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'dev',
  handler: async (request, context) => {
    let body;

    try {
      body = await request.json();
    } catch {
      return { status: 400, body: 'Invalid JSON.' };
    }

    const { username, key, action } = body || {};

    if (!isDeveloper(username, key, process.env.DEV_KEY)) {
      return { status: 403, body: 'Not allowed.' };
    }

    if (action !== 'reset' && action !== 'kick') {
      return { status: 400, body: 'Unknown action.' };
    }

    let latestState = await getOrCreateGameState();

    for (let attempt = 0; attempt < 5; attempt++) {
      const now = Date.now();
      const updatedState = action === 'reset'
        ? resetState(latestState)
        : kickState(latestState, now);

      if (!updatedState) {
        return { status: 409, body: 'Nobody is holding the button.' };
      }

      try {
        const { resource } = await game
          .item(updatedState.id, updatedState.id)
          .replace(updatedState, {
            accessCondition: { type: 'IfMatch', condition: latestState._etag }
          });

        if (action === 'kick') {
          await creditHoldTime(latestState, now, context);
        }

        context.log('Dev action: ' + action);

        return { status: 200, jsonBody: buildStateResponse(resource, now) };

      } catch (error) {
        if (error.statusCode === 412 || Number(error.code) === 412) {
          latestState = await getOrCreateGameState();
          continue;
        }

        throw error;
      }
    }

    return { status: 409, body: 'Game changed too quickly. Try again.' };
  },
});
