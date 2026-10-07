const { CosmosClient } = require('@azure/cosmos');

// Use real connection string in runtime, or a dummy connection string during Jest test runs
const connectionString =
  process.env.COSMOS_CONNECTION_STRING ||
  'AccountEndpoint=https://red-vs-blue.documents.azure.com/;AccountKey=mkOLWNiqde1ZIaMb80ozME2POtYqSqjZV4NAyAbsw7FhLVwFePTzKUegverAR06wisMF3eA0Lb3QACDbQv2ZoA==;';

const client = new CosmosClient(connectionString);
const database = client.database('redvsblue');

const players = database.container('players');
const game = database.container('game');

// Helper to handle initial auto-creation on a fresh DB (TR-11)
async function getOrCreateGameState(stateId = 'game-state-main') {
  try {
    const { resource } = await game.item(stateId, 'global').read();
    if (resource) return resource;
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  const defaultState = {
    id: stateId,
    partitionKey: 'global',
    holder: null,
    holdStart: null,
    redTotal: 0,
    blueTotal: 0,
  };

  const { resource: created } = await game.items.create(defaultState);
  return created;
}

module.exports = { players, game, getOrCreateGameState };