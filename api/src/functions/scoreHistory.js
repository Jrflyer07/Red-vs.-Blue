const { app } = require('@azure/functions');
const { game, getOrCreateGameState } = require('./shared/cosmos');
const { HISTORY_ID, nextHistory } = require('./shared/scoreHistory');

async function readHistory() {
  const { resources } = await game.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: HISTORY_ID }],
    })
    .fetchAll();
  return resources[0] || null;
}

async function saveHistory(existing, doc) {
  try {
    if (existing) {
      await game.item(HISTORY_ID, HISTORY_ID).replace(doc, {
        accessCondition: { type: 'IfMatch', condition: existing._etag },
      });
    } else {
      await game.items.create(doc);
    }
  } catch (error) {
    const code = error?.statusCode ?? Number(error?.code);
    if (code !== 409 && code !== 412) throw error;
  }
}

app.http('scoreHistory', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'score-history',
  handler: async (request, context) => {
    const now = Date.now();
    const state = await getOrCreateGameState();
    const existing = await readHistory();
    const { doc, changed } = nextHistory(existing, state, now);

    if (changed) {
      try {
        await saveHistory(existing, doc);
      } catch (error) {
        context.error('Could not save the score history', error);
      }
    }

    return {
      status: 200,
      jsonBody: {
        round: doc.round,
        events: doc.events.map(({ t, holder, username, red, blue }) => ({ t, holder, username, red, blue })),
        serverNow: new Date(now).toISOString(),
      },
    };
  },
});
