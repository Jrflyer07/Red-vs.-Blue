const { CosmosClient } = require('@azure/cosmos');
(async () => {
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const { database } = await client.databases.createIfNotExists({ id: 'redvsblue' });

  // The merged code reads these with item(id, id), so they partition on /id
  for (const id of ['game', 'players']) {
    await database.containers.createIfNotExists({ id, partitionKey: { paths: ['/id'] } });
  }

  // The feed and archive containers use a fixed 'global' partition value
  for (const id of ['pressLog', 'history']) {
    await database.containers.createIfNotExists({ id, partitionKey: { paths: ['/partitionKey'] } });
  }

  console.log('done');
})();