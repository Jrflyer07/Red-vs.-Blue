// Run with:  node --test
// Uses Node's built-in test runner, so there is nothing to install.

const test = require('node:test');
const assert = require('node:assert');
const { buildStateResponse } = require('../src/functions/shared/stateResponse');

const NOON = Date.parse('2026-10-05T12:00:00.000Z');
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

test('nobody has pressed yet: both scores are the saved totals', () => {
  const doc = { holder: null, holdStart: null, redTotal: 0, blueTotal: 0 };
  const result = buildStateResponse(doc, NOON);

  assert.strictEqual(result.holder, null);
  assert.strictEqual(result.redScore, 0);
  assert.strictEqual(result.blueScore, 0);
});

test('the holding team gets its saved total plus the seconds held', () => {
  const doc = {
    holder: 'red',
    holdStart: new Date(NOON - 90 * SECOND).toISOString(), // took it 90s ago
    redTotal: 100,
    blueTotal: 40,
  };
  const result = buildStateResponse(doc, NOON);

  assert.strictEqual(result.redScore, 190); // 100 saved + 90 held
  assert.strictEqual(result.blueScore, 40); // not holding, so unchanged
});

test('UR-11: the holder keeps scoring while nobody is on the site', () => {
  const doc = {
    holder: 'blue',
    holdStart: new Date(NOON).toISOString(),
    redTotal: 500,
    blueTotal: 200,
  };

  // Nothing touches the document for a whole hour. No visits, no presses.
  const firstVisitorBack = buildStateResponse(doc, NOON + HOUR);

  assert.strictEqual(firstVisitorBack.blueScore, 200 + 3600);
  assert.strictEqual(firstVisitorBack.redScore, 500);
});

test('the response includes the server time for the page to sync against', () => {
  const doc = { holder: null, holdStart: null, redTotal: 0, blueTotal: 0 };
  const result = buildStateResponse(doc, NOON);

  assert.strictEqual(result.serverNow, '2026-10-05T12:00:00.000Z');
});
