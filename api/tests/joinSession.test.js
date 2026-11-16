jest.mock('@azure/functions', () => ({ app: { http: jest.fn() } }));
jest.mock('../src/shared/cosmos', () => ({
  players: {
    items: { create: jest.fn() },
    item: jest.fn()
  }
}));

const { app } = require('@azure/functions');
const { players } = require('../src/shared/cosmos');
const { createPlayerSession, verifyPlayerSession } = require('../src/functions/shared/playerSession');
require('../src/functions/join');

const handler = app.http.mock.calls.find(([name]) => name === 'join')[1].handler;
const request = (body) => ({ json: jest.fn().mockResolvedValue(body) });
const context = { log: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  players.items.create.mockResolvedValue({});
});

test('new player is assigned a team and issued a token whose hash is saved', async () => {
  const response = await handler(request({ username: 'Alice' }), context);
  expect(response.status).toBe(200);
  expect(['red', 'blue']).toContain(response.jsonBody.team);
  const created = players.items.create.mock.calls[0][0];
  expect(created.id).toBe('alice');
  expect(created.username).toBe('Alice');
  expect(created.team).toBe(response.jsonBody.team);
  expect(created).not.toHaveProperty('sessionToken');
  expect(verifyPlayerSession(created, response.jsonBody.sessionToken)).toBe(true);
});

test('returning player authenticates with existing secret and retains team', async () => {
  const session = createPlayerSession();
  players.item.mockReturnValue({ read: jest.fn().mockResolvedValue({
    resource: { username: 'Alice', team: 'red', sessionTokenHash: session.sessionTokenHash }
  }) });
  const response = await handler(request({ username: 'alice', sessionToken: session.sessionToken }), context);
  expect(response.status).toBe(200);
  expect(response.jsonBody).toEqual({ username: 'Alice', team: 'red', sessionToken: session.sessionToken });
  expect(players.items.create).not.toHaveBeenCalled();
});

test('wrong token cannot impersonate an existing username', async () => {
  const session = createPlayerSession();
  players.item.mockReturnValue({ read: jest.fn().mockResolvedValue({
    resource: { username: 'Alice', team: 'red', sessionTokenHash: session.sessionTokenHash }
  }) });
  const response = await handler(request({ username: 'Alice', sessionToken: createPlayerSession().sessionToken }), context);
  expect(response.status).toBe(401);
  expect(players.items.create).not.toHaveBeenCalled();
});

test('existing username without a token is not claimable', async () => {
  players.items.create.mockRejectedValue({ statusCode: 409 });
  const response = await handler(request({ username: 'Alice' }), context);
  expect(response.status).toBe(409);
  expect(response.body).toMatch(/already exists/i);
});

test('legacy player without stored hash cannot be authenticated by guessing token', async () => {
  players.item.mockReturnValue({ read: jest.fn().mockResolvedValue({
    resource: { username: 'Alice', team: 'red' }
  }) });
  const response = await handler(request({ username: 'Alice', sessionToken: createPlayerSession().sessionToken }), context);
  expect(response.status).toBe(401);
});

test('unknown session login cannot silently create player', async () => {
  players.item.mockReturnValue({ read: jest.fn().mockRejectedValue({ statusCode: 404 }) });
  const response = await handler(request({ username: 'Alice', sessionToken: createPlayerSession().sessionToken }), context);
  expect(response.status).toBe(401);
  expect(players.items.create).not.toHaveBeenCalled();
});

test('malformed JSON is rejected', async () => {
  const response = await handler({ json: jest.fn().mockRejectedValue(new Error('broken')) }, context);
  expect(response.status).toBe(400);
});

test('invalid username is rejected without any database call', async () => {
  const response = await handler(request({ username: 'a/b' }), context);
  expect(response.status).toBe(400);
  expect(players.items.create).not.toHaveBeenCalled();
});

test('unexpected database errors are propagated', async () => {
  players.items.create.mockRejectedValue(new Error('db unavailable'));
  await expect(handler(request({ username: 'Alice' }), context)).rejects.toThrow('db unavailable');
});
