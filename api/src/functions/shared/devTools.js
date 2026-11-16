const crypto = require('crypto');
const { bankAndSwitchHolder } = require('./scoring');

const DEV_USERNAME = '1974Corvette';

function isDevUsername(username) {
  return typeof username === 'string' &&
    username.toLowerCase() === DEV_USERNAME.toLowerCase();
}

function keysMatch(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !expected) {
    return false;
  }

  const givenHash = crypto.createHash('sha256').update(given).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();

  return crypto.timingSafeEqual(givenHash, expectedHash);
}

function isDeveloper(username, key, configuredKey) {
  return isDevUsername(username) && keysMatch(key, configuredKey);
}

function resetState(state) {
  return {
    ...state,
    holder: null,
    holderUsername: null,
    holdStart: null,
    redTotal: 0,
    blueTotal: 0,
    contest: null,
    cooldowns: {}
  };
}

function kickState(state, now = Date.now()) {
  const holder = state.holder ? state.holder.toUpperCase() : null;

  if (!holder) {
    return null;
  }

  return {
    ...bankAndSwitchHolder({ ...state, holder }, null, now),
    holderUsername: null,
    holdStart: null,
    contest: null
  };
}

module.exports = { DEV_USERNAME, isDevUsername, isDeveloper, resetState, kickState };
