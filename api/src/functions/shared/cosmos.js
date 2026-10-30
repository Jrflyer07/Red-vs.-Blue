const { CosmosClient } = require('@azure/cosmos');

// Use real connection string in runtime
const connectionString =
  process.env.COSMOS_CONNECTION_STRING ||
  'hey here';

const client = new CosmosClient(connectionString);
const database = client.database('redvsblue');

const players = database.container('players');
const game = database.container('game');

// Helper to handle initial auto-creation on a fresh DB (TR-11)
async function getOrCreateGameState(stateId = 'game-state-main') {
  const { resources } = await game.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: stateId }],
    })
    .fetchAll();
  if (resources.length > 0) return resources[0];

  const defaultState = {
    id: stateId,
    partitionKey: 'global',
    holder: null,
    holderUsername: null,
    holdStart: null,
    redTotal: 0,
    blueTotal: 0,
  };

  const { resource: created } = await game.items.create(defaultState);
  return created;
}

module.exports = { players, game, getOrCreateGameState };