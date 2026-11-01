jest.mock('@azure/functions', () => ({ app: { http: jest.fn() } }));
jest.mock('../src/functions/shared/cosmos', () => ({
  players: { item: jest.fn() },
  game: { item: jest.fn() },
  getOrCreateGameState: jest.fn()
}));

const { app } = require('@azure/functions');
const { players, game, getOrCreateGameState } = require('../src/functions/shared/cosmos');
const { createPlayerSession } = require('../src/functions/shared/playerSession');
require('../src/functions/gameState');

const handler = app.http.mock.calls.find(([name]) => name === 'gameState')[1].handler;
const request = (body) => ({ method: 'POST', json: jest.fn().mockResolvedValue(body) });

let session;
let playerRead;
let playerReplace;
let gameReplace;
beforeEach(() => {
  jest.clearAllMocks();
  session = createPlayerSession();
  playerRead = jest.fn().mockResolvedValue({ resource: {
    username: 'Alice', team: 'red', sessionTokenHash: session.sessionTokenHash,
    lastPressAt: 0, _etag: 'player-etag'
  } });
  playerReplace = jest.fn().mockResolvedValue({});
  gameReplace = jest.fn().mockImplementation(async (updated) => ({ resource: updated }));
  players.item.mockReturnValue({ read: playerRead, replace: playerReplace });
  game.item.mockReturnValue({ replace: gameReplace });
  getOrCreateGameState.mockResolvedValue({
    id: 'game-state-main', holder: null, holderUsername: null, holdStart: null,
    redTotal: 0, blueTotal: 0, _etag: 'game-etag'
  });
});

test('capture without token is rejected before any writes', async () => {
  const response = await handler(request({ username: 'Alice' }), {});
  expect(response.status).toBe(401);
  expect(playerReplace).not.toHaveBeenCalled();
  expect(gameReplace).not.toHaveBeenCalled();
});

test('capture with incorrect token is rejected before any writes', async () => {
  const response = await handler(request({ username: 'Alice', sessionToken: createPlayerSession().sessionToken }), {});
  expect(response.status).toBe(401);
  expect(playerReplace).not.toHaveBeenCalled();
  expect(gameReplace).not.toHaveBeenCalled();
});

test('valid player token permits first capture and preserves username', async () => {
  const response = await handler(request({ username: 'Alice', sessionToken: session.sessionToken }), {});
  expect(response.status).toBe(200);
  expect(playerReplace).toHaveBeenCalledTimes(1);
  expect(gameReplace).toHaveBeenCalledTimes(1);
  const updated = gameReplace.mock.calls[0][0];
  expect(updated.holder).toBe('RED');
  expect(updated.holderUsername).toBe('Alice');
});

test('GET scoreboard remains public and requires no session', async () => {
  const response = await handler({ method: 'GET' }, {});
  expect(response.status).toBe(200);
  expect(response.jsonBody.holder).toBeNull();
  expect(playerRead).not.toHaveBeenCalled();
});
