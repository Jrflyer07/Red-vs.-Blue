const { CosmosClient } = require('@azure/cosmos');
(async () => {
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const { database } = await client.databases.createIfNotExists({ id: 'redvsblue' });
  for (const id of ['game', 'players', 'pressLog', 'history']) {
    await database.containers.createIfNotExists({ id, partitionKey: { paths: ['/partitionKey'] } });
  }
  console.log('done');
})();