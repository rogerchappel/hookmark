import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function runCli(args) {
  return spawnSync(process.execPath, ['dist/cli.js', ...args], { encoding: 'utf8' });
}

test('unknown options produce a diagnostic and nonzero exit', () => {
  const result = runCli(['scan', 'fixtures/safe', '--definitely-invalid']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /hookmark: Unknown option: --definitely-invalid/);
});

test('surplus positional arguments produce a diagnostic and nonzero exit', () => {
  const result = runCli(['scan', 'fixtures/safe', 'extra-positional']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /hookmark: Unexpected positional argument: extra-positional/);
});

test('documented option ordering remains valid', () => {
  const before = runCli(['scan', '--format', 'json', 'fixtures/safe']);
  const after = runCli(['scan', 'fixtures/safe', '--format', 'json']);
  assert.equal(before.status, 0, before.stderr);
  assert.equal(after.status, 0, after.stderr);
  assert.equal(JSON.parse(before.stdout).summary.total, 2);
  assert.equal(JSON.parse(after.stdout).summary.total, 2);
});
