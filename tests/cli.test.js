import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

test('npm lifecycle companions participate in --fail-on severity', () => {
  const medium = runCli(['scan', 'fixtures/lifecycle-companions', '--format', 'json', '--fail-on', 'medium']);
  const high = runCli(['scan', 'fixtures/lifecycle-companions', '--format', 'json', '--fail-on', 'high']);

  assert.equal(medium.status, 2, medium.stderr);
  assert.equal(JSON.parse(medium.stdout).summary.maxSeverity, 'medium');
  assert.equal(high.status, 0, high.stderr);
  const findings = JSON.parse(medium.stdout).findings;
  assert.equal(findings.find((finding) => finding.trigger === 'prebuild')?.severity, 'medium');
  assert.equal(findings.find((finding) => finding.trigger === 'build')?.severity, 'info');
});

for (const command of ['scan', 'explain']) {
  test(`${command} rejects a nonexistent target`, () => {
    const result = runCli([command, 'fixtures/definitely-missing']);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /hookmark: target is not a readable file or directory:/);
  });
}

test('an explicit config must be a readable file', () => {
  const missing = runCli(['scan', 'fixtures/risky', '--config', 'fixtures/missing-config.json']);
  const directory = runCli(['scan', 'fixtures/risky', '--config', 'fixtures/safe']);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /hookmark: config is not a readable file:/);
  assert.equal(directory.status, 1);
  assert.match(directory.stderr, /hookmark: config is not a readable file:/);
});

test('invalid config collection types produce a stable diagnostic', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hookmark-config-'));
  const config = join(directory, 'invalid.json');
  try {
    writeFileSync(config, JSON.stringify({ ignore: '' }));
    const result = runCli(['scan', 'fixtures/safe', '--config', config, '--format', 'json']);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, new RegExp(`hookmark: ${config}: ignore must be an array`));
    assert.doesNotMatch(result.stderr, /values\.some|TypeError/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('non-string config collection entries produce indexed diagnostics', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hookmark-config-entry-'));
  const config = join(directory, 'invalid.json');
  try {
    for (const key of ['allow', 'ignore']) {
      for (const value of [{ pattern: 'node' }, 1, true, null]) {
        writeFileSync(config, JSON.stringify({ [key]: ['valid', value] }));
        const result = runCli(['scan', 'fixtures/safe', '--config', config, '--format', 'json']);
        assert.equal(result.status, 1);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, new RegExp(`hookmark: ${config}: ${key}\\[1\\] must be a string`));
        assert.doesNotMatch(result.stderr, /TypeError|\\n\\s+at /);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('file and directory targets remain valid', () => {
  const directory = runCli(['scan', 'fixtures/safe', '--format', 'json']);
  const file = runCli(['explain', 'fixtures/safe/package.json']);
  assert.equal(directory.status, 0, directory.stderr);
  assert.equal(file.status, 0, file.stderr);
  assert.equal(JSON.parse(directory.stdout).summary.total, 2);
  assert.equal(JSON.parse(file.stdout).summary.total, 2);
});

test('malformed package scripts produce field-specific CLI diagnostics', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hookmark-package-scripts-cli-'));
  const packageFile = join(directory, 'package.json');
  try {
    for (const scripts of [null, [], 'npm test']) {
      writeFileSync(packageFile, JSON.stringify({ scripts }));
      const result = runCli(['scan', directory, '--format', 'json']);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, new RegExp(`hookmark: ${packageFile}: scripts must be an object`));
      assert.doesNotMatch(result.stderr, /TypeError|\\n\\s+at /);
    }
    for (const command of [42, null]) {
      writeFileSync(packageFile, JSON.stringify({ scripts: { build: command } }));
      const result = runCli(['scan', directory, '--format', 'json']);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, new RegExp(`hookmark: ${packageFile}: scripts\\.build must be a string`));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('automatic config discovery uses a file target containing directory', () => {
  const result = runCli(['explain', 'fixtures/risky/package.json']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).configPath, /fixtures\/risky\/hookmark\.config\.json$/);
});
