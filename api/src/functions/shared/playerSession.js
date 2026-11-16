const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');

// A session token identifies a browser's player. It is not a username or team.
// Keep the raw token in the browser; save only its hash in Cosmos DB.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function hashPlayerToken(sessionToken) {
  if (typeof sessionToken !== 'string' || !TOKEN_PATTERN.test(sessionToken)) {
    throw new Error('Invalid player session token.');
  }

  // Require the canonical base64url encoding of exactly 32 random bytes.
  const decoded = Buffer.from(sessionToken, 'base64url');
  if (decoded.length !== 32 || decoded.toString('base64url') !== sessionToken) {
    throw new Error('Invalid player session token.');
  }

  return createHash('sha256').update(sessionToken, 'utf8').digest('hex');
}

function createPlayerSession() {
  const sessionToken = randomBytes(32).toString('base64url');
  return {
    sessionToken,
    sessionTokenHash: hashPlayerToken(sessionToken)
  };
}

function verifyPlayerSession(player, sessionToken) {
  const storedHash = player?.sessionTokenHash;
  if (typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/.test(storedHash)) {
    return false;
  }

  let proposedHash;
  try {
    proposedHash = hashPlayerToken(sessionToken);
  } catch {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(storedHash, 'hex'),
    Buffer.from(proposedHash, 'hex')
  );
}

module.exports = { createPlayerSession, hashPlayerToken, verifyPlayerSession };
