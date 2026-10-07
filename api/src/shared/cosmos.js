const { CosmosClient } = require('@azure/cosmos');

// connect to the database using the connection string from the settings
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = client.database('redvsblue');

const players = database.container('players');
const game = database.container('game');

module.exports = { players, game };