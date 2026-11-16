const {
  createPlayerSession,
  hashPlayerToken,
  verifyPlayerSession
} = require('../src/functions/shared/playerSession');

test('generates a 256-bit random browser session token', () => {
  const { sessionToken } = createPlayerSession();
  expect(sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(Buffer.from(sessionToken, 'base64url')).toHaveLength(32);
});

test('generates a different token for each player session', () => {
  expect(createPlayerSession().sessionToken)
    .not.toBe(createPlayerSession().sessionToken);
});

test('stores a hash rather than the token itself', () => {
  const { sessionToken, sessionTokenHash } = createPlayerSession();
  expect(sessionTokenHash).toMatch(/^[a-f0-9]{64}$/);
  expect(sessionTokenHash).not.toBe(sessionToken);
  expect(sessionTokenHash).toBe(hashPlayerToken(sessionToken));
});

test('accepts the correct token for a player record', () => {
  const session = createPlayerSession();
  const player = { id: 'alice', username: 'Alice', sessionTokenHash: session.sessionTokenHash };
  expect(verifyPlayerSession(player, session.sessionToken)).toBe(true);
});

test('rejects a different valid token', () => {
  const alice = createPlayerSession();
  const bob = createPlayerSession();
  expect(verifyPlayerSession({ sessionTokenHash: alice.sessionTokenHash }, bob.sessionToken))
    .toBe(false);
});

test('rejects missing and malformed tokens safely', () => {
  const session = createPlayerSession();
  const player = { sessionTokenHash: session.sessionTokenHash };
  for (const badToken of [undefined, null, '', 'Alice', {}, 123, 'x'.repeat(43)]) {
    expect(verifyPlayerSession(player, badToken)).toBe(false);
  }
});

test('does not authenticate a legacy player with no token hash', () => {
  const session = createPlayerSession();
  expect(verifyPlayerSession({ username: 'Alice' }, session.sessionToken)).toBe(false);
  expect(verifyPlayerSession(null, session.sessionToken)).toBe(false);
});

test('rejects corrupt stored hashes', () => {
  const session = createPlayerSession();
  expect(verifyPlayerSession({ sessionTokenHash: 'invalid' }, session.sessionToken)).toBe(false);
});
