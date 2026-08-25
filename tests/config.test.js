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

test('allow and ignore entries must be strings', () => {
  for (const key of ['allow', 'ignore']) {
    for (const [index, value] of [{}, 1, true, null].entries()) {
      assert.throws(
        () => validateConfig({ [key]: ['valid pattern', value] }, 'hookmark.config.json'),
        new RegExp(`hookmark\\.config\\.json: ${key}\\[1\\] must be a string`),
        `${key} accepted invalid entry ${index}`
      );
    }
  }
});

test('string allow and ignore patterns remain valid', () => {
  assert.doesNotThrow(() => validateConfig({ allow: ['package.json test'], ignore: ['^npm run'] }));
});

test('config root must be a JSON object', () => {
  for (const value of [null, [], ['ignore'], '', 'config', false, true, 0, 1]) {
    assert.throws(
      () => validateConfig(value, 'hookmark.config.json'),
      /hookmark\.config\.json: config root must be a JSON object/
    );
  }

  assert.doesNotThrow(() => validateConfig({}));
  assert.doesNotThrow(() => validateConfig({ ignore: [], allow: [] }));
});
