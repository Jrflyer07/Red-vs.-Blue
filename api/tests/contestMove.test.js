jest.mock('@azure/functions', () => ({ app: { http: jest.fn() } }));
jest.mock('../src/functions/shared/cosmos', () => ({
  players: { item: jest.fn() },
  game: { item: jest.fn() },
  getOrCreateGameState: jest.fn()
}));

const { app } = require('@azure/functions');
const { players, game, getOrCreateGameState } = require('../src/functions/shared/cosmos');
const { createPlayerSession } = require('../src/functions/shared/playerSession');
require('../src/functions/contestMove');

const handler = app.http.mock.calls.find(([name]) => name === 'contestMove')[1].handler;
const req = (body) => ({ json: jest.fn().mockResolvedValue(body) });

let playersById;
let gameState;
let gameReplace;
let start;

function payload(name, move, round = 1, contestId = 'duel-1') {
  return { username: name, sessionToken: playersById[name.toLowerCase()].token,
    move, round, contestId };
}

beforeEach(() => {
  jest.clearAllMocks();
  start = Date.now();
  const alice = createPlayerSession();
  const bob = createPlayerSession();
  const eve = createPlayerSession();
  playersById = {
    alice: { username: 'Alice', team: 'red', token: alice.sessionToken,
      sessionTokenHash: alice.sessionTokenHash },
    bob: { username: 'Bob', team: 'blue', token: bob.sessionToken,
      sessionTokenHash: bob.sessionTokenHash },
    eve: { username: 'Eve', team: 'blue', token: eve.sessionToken,
      sessionTokenHash: eve.sessionTokenHash }
  };
  players.item.mockImplementation((id) => ({
    read: jest.fn().mockImplementation(async () => {
      if (!playersById[id]) throw { statusCode: 404 };
      return { resource: playersById[id] };
    })
  }));
  gameState = {
    id: 'game-state-main', _etag: 'etag-1',
    holder: 'RED', holderUsername: 'Alice', holdStart: start - 5000,
    redTotal: 10, blueTotal: 5,
    contest: { id: 'duel-1', defenderUsername: 'Alice', defenderTeam: 'RED',
      challengerUsername: 'Bob', challengerTeam: 'BLUE', round: 1,
      defenderMove: null, challengerMove: null,
      startedAt: start - 1000, expiresAt: start + 30000 }
  };
  getOrCreateGameState.mockImplementation(async () => ({ ...gameState,
    contest: gameState.contest ? { ...gameState.contest } : null }));
  gameReplace = jest.fn().mockImplementation(async (state, options) => {
    if (options.accessCondition.condition !== gameState._etag) {
      throw { statusCode: 412 };
    }
    gameState = { ...state, _etag: 'etag-' + (gameReplace.mock.calls.length + 1) };
    return { resource: gameState };
  });
  game.item.mockReturnValue({ replace: gameReplace });
});

test('first secret move is accepted and never exposed to the browser', async () => {
  const response = await handler(req(payload('Alice', 'rock')));
  expect(response.status).toBe(202);
  expect(response.jsonBody.action).toBe('waiting');
  expect(gameState.contest.defenderMove).toBe('rock');
  expect(response.jsonBody.contest.defenderSubmitted).toBe(true);
  expect(response.jsonBody.contest).not.toHaveProperty('defenderMove');
  expect(gameReplace).toHaveBeenCalledTimes(1);
  expect(gameReplace.mock.calls[0][1].accessCondition.condition).toBe('etag-1');
});

test('second move determines challenger victory and banks defender score', async () => {
  await handler(req(payload('Alice', 'rock')));
  const response = await handler(req(payload('Bob', 'paper')));
  expect(response.status).toBe(200);
  expect(response.jsonBody.action).toBe('resolved');
  expect(response.jsonBody.holder).toBe('blue');
  expect(response.jsonBody.lastContest.winnerUsername).toBe('Bob');
  expect(response.jsonBody.contest).toBeNull();
  expect(gameState.redTotal).toBeGreaterThanOrEqual(15);
  expect(gameState.cooldowns.alice).toBeGreaterThan(start);
});

test('defender victory retains the flag and cools down the challenger', async () => {
  await handler(req(payload('Alice', 'scissors')));
  const response = await handler(req(payload('Bob', 'paper')));
  expect(response.jsonBody.action).toBe('resolved');
  expect(response.jsonBody.holder).toBe('red');
  expect(gameState.cooldowns.bob).toBeGreaterThan(start);
});

test('tie creates new round; stale round one requests cannot affect round two', async () => {
  await handler(req(payload('Alice', 'rock')));
  const tied = await handler(req(payload('Bob', 'rock')));
  expect(tied.jsonBody.action).toBe('tie');
  expect(tied.jsonBody.contest.round).toBe(2);
  const stale = await handler(req(payload('Bob', 'paper', 1)));
  expect(stale.status).toBe(409);
  expect(gameState.contest.challengerMove).toBeNull();
  const next = await handler(req(payload('Bob', 'paper', 2)));
  expect(next.status).toBe(202);
});

test('repeated move returns an idempotent status without another write', async () => {
  await handler(req(payload('Alice', 'rock')));
  const again = await handler(req(payload('Alice', 'rock')));
  expect(again.status).toBe(200);
  expect(again.jsonBody.action).toBe('already-submitted');
  expect(gameReplace).toHaveBeenCalledTimes(1);
});

test('unknown or expired contest identifiers cannot submit moves', async () => {
  const response = await handler(req(payload('Bob', 'paper', 1, 'duel-old')));
  expect(response.status).toBe(409);
  expect(gameReplace).not.toHaveBeenCalled();
});

test('nonparticipant is rejected without writing game state', async () => {
  const response = await handler(req(payload('Eve', 'rock')));
  expect(response.status).toBe(403);
  expect(gameReplace).not.toHaveBeenCalled();
});

test('invalid or missing session is rejected without writing game state', async () => {
  const request = payload('Bob', 'paper');
  request.sessionToken = 'wrong';
  const response = await handler(req(request));
  expect(response.status).toBe(401);
  expect(gameReplace).not.toHaveBeenCalled();
});

test('unrecognized username is rejected before any game write', async () => {
  const response = await handler(req({ username: 'Zed', move: 'rock',
    round: 1, contestId: 'duel-1', sessionToken: 'token' }));
  expect(response.status).toBe(401);
  expect(gameReplace).not.toHaveBeenCalled();
});

test('invalid JSON and malformed moves are rejected', async () => {
  const malformed = await handler({ json: jest.fn().mockRejectedValue(new Error('bad')) });
  expect(malformed.status).toBe(400);
  for (const body of [payload('Bob', 'lizard'), payload('Bob', 'paper', 0),
    payload('Bob', 'paper', 1, '')]) {
    expect((await handler(req(body))).status).toBe(400);
  }
  expect(gameReplace).not.toHaveBeenCalled();
});

test('late move settles expired contest but does not count as a move', async () => {
  gameState.contest.expiresAt = start - 1;
  gameState.contest.defenderMove = 'rock';
  const response = await handler(req(payload('Bob', 'paper')));
  expect(response.status).toBe(409);
  expect(response.jsonBody.action).toBe('expired');
  expect(response.jsonBody.holder).toBe('red');
  expect(gameState.contest).toBeNull();
  expect(gameState.lastContest.reason).toBe('timeout');
});

test('ETag conflict retries against fresh state instead of overwriting', async () => {
  gameReplace.mockImplementationOnce(async () => {
    gameState = { ...gameState, _etag: 'etag-2',
      contest: { ...gameState.contest, defenderMove: 'scissors' } };
    throw { statusCode: 412 };
  });
  const response = await handler(req(payload('Bob', 'rock')));
  expect(response.status).toBe(200);
  expect(response.jsonBody.action).toBe('resolved');
  expect(response.jsonBody.holder).toBe('blue');
  expect(gameReplace).toHaveBeenCalledTimes(2);
});
