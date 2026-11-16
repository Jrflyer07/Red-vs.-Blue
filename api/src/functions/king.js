const { app } = require('@azure/functions');
const { game, getOrCreateGameState } = require('./shared/cosmos');
const { RECORD_ID, currentHold, recordForRound, shouldSave, newRecordDoc } = require('./shared/king');

async function readRecord() {
  const { resources } = await game.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: RECORD_ID }],
    })
    .fetchAll();
  return resources[0] || null;
}

async function saveRecord(existing, doc) {
  try {
    if (existing) {
      await game.item(RECORD_ID, RECORD_ID).replace(doc, {
        accessCondition: { type: 'IfMatch', condition: existing._etag },
      });
    } else {
      await game.items.create(doc);
    }
    return true;
  } catch (error) {
    const code = error?.statusCode ?? Number(error?.code);
    if (code === 409 || code === 412) return false;
    throw error;
  }
}

app.http('king', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'king',
  handler: async (request, context) => {
    const now = Date.now();
    const state = await getOrCreateGameState();
    const round = state.weekId ?? null;
    const hold = currentHold(state, now);
    const existing = await readRecord();
    let record = recordForRound(existing, round);

    if (shouldSave(hold, record)) {
      const doc = newRecordDoc(round, hold);
      try {
        if (await saveRecord(existing, doc)) record = recordForRound(doc, round);
      } catch (error) {
        context.error('Could not save the king of the hill record', error);
      }
    }

    return {
      status: 200,
      jsonBody: {
        king: hold ? { username: hold.username, team: hold.team, holdStart: hold.holdStart } : null,
        record,
        serverNow: new Date(now).toISOString(),
      },
    };
  },
});
