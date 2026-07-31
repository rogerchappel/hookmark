import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../dist/index.js';

test('explicit config paths must name an existing file', () => {
  assert.throws(
    () => loadConfig('fixtures/safe', 'fixtures/missing-config.json'),
    /config is not a readable file:/
  );
  assert.throws(
    () => loadConfig('fixtures/safe', 'fixtures/safe'),
    /config is not a readable file:/
  );
});

test('optional discovery may return no config', () => {
  assert.deepEqual(loadConfig('fixtures/safe'), { config: {} });
});

test('optional discovery loads a valid config file', () => {
  const loaded = loadConfig('fixtures/risky');
  assert.equal(loaded.path, 'fixtures/risky/hookmark.config.json');
  assert.equal(Array.isArray(loaded.config.ignore), true);
});
