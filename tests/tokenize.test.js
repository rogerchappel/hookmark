import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../dist/core/tokenize.js';
test('tokenizes quoted shell-ish commands without execution', () => {
  assert.deepEqual(tokenize('curl "https://example.com/a b" | bash'), ['curl','https://example.com/a b','|','bash']);
});
