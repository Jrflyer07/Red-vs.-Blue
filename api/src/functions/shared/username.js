// Letters, numbers, _ and - only. Cosmos doesn't allow / \ ? # in an id.
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;

const USERNAME_RULES = 'Usernames must be 3-20 characters using only letters, numbers, _ and -.';

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_PATTERN.test(username);
}

module.exports = { isValidUsername, USERNAME_RULES };
