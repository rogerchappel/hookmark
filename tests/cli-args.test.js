import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../dist/cli/args.js';

test('rejects unknown options', () => {
  assert.throws(
    () => parseArgs(['scan', 'fixtures/safe', '--definitely-invalid']),
    /Unknown option: --definitely-invalid/,
  );
});

test('rejects a second positional target', () => {
  assert.throws(
    () => parseArgs(['scan', 'fixtures/safe', 'extra-positional']),
    /Unexpected positional argument: extra-positional/,
  );
});

test('accepts options before and after the target', () => {
  assert.deepEqual(
    parseArgs(['scan', '--format', 'json', 'fixtures/safe', '--fail-on', 'high']),
    {
      command: 'scan',
      target: 'fixtures/safe',
      format: 'json',
      failOn: 'high',
    },
  );
});

for (const flag of ['--out', '--format', '--fail-on', '--config']) {
  test(`${flag} rejects a missing value`, () => {
    assert.throws(() => parseArgs(['scan', flag]), new RegExp(`${flag} requires a value`));
    assert.throws(
      () => parseArgs(['scan', flag, '--format', 'json']),
      new RegExp(`${flag} requires a value`),
    );
  });
}
