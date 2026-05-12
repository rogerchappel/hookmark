import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scan } from '../dist/index.js';
test('safe fixture discovers package scripts', () => {
  const report = scan({ target: 'fixtures/safe', config: {} });
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.maxSeverity, 'low');
});
test('risky fixture flags install and publish risk', () => {
  const report = scan({ target: 'fixtures/risky', config: {} });
  assert.equal(report.summary.counts.high >= 2, true);
  assert.match(JSON.stringify(report.findings), /install-time|publish/);
});
test('configuration can ignore trusted commands and override severity', () => {
  const report = scan({ target: 'fixtures/risky', config: { ignore: ['release'], severityOverrides: { clean: 'medium' } } });
  assert.equal(report.findings.find((f) => f.trigger === 'release')?.ignored, true);
  assert.equal(report.findings.find((f) => f.trigger === 'clean')?.severity, 'medium');
});
test('hook managers are discovered', () => {
  assert.equal(scan({ target: 'fixtures/husky', config: {} }).findings.some((f) => f.source === 'husky'), true);
  assert.equal(scan({ target: 'fixtures/lefthook', config: {} }).findings.some((f) => f.source === 'lefthook'), true);
});

test('native .git hooks are discovered from a real hook directory', () => {
  const target = mkdtempSync(join(tmpdir(), 'hookmark-git-hooks-'));
  const hooks = join(target, '.git', 'hooks');
  mkdirSync(hooks, { recursive: true });
  writeFileSync(join(hooks, 'pre-push'), '#!/bin/sh\ngit push --mirror backup\n');
  const report = scan({ target, config: {} });
  assert.equal(report.findings.some((f) => f.source === 'git-hook' && f.trigger === 'pre-push'), true);
});
