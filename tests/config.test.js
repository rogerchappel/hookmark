import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, validateConfig } from '../dist/index.js';

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

test('allow and ignore must be arrays when present', () => {
  for (const key of ['allow', 'ignore']) {
    for (const value of ['', false, 0, null, {}, 'package.json test']) {
      assert.throws(
        () => validateConfig({ [key]: value }, 'hookmark.config.json'),
        new RegExp(`hookmark\\.config\\.json: ${key} must be an array`)
      );
    }
  }
});

test('empty allow and ignore arrays remain valid', () => {
  assert.doesNotThrow(() => validateConfig({ allow: [], ignore: [] }));
  assert.doesNotThrow(() => validateConfig({}));
});
