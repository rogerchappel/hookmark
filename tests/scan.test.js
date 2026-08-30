import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scan } from '../dist/index.js';
test('safe fixture discovers package scripts', () => {
  const report = scan({ target: 'fixtures/safe', config: {} });
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.maxSeverity, 'low');
});
test('public scan API rejects a missing target', () => {
  assert.throws(
    () => scan({ target: 'fixtures/definitely-missing', config: {} }),
    /target is not a readable file or directory:/
  );
});
test('public scan API accepts a file target by scanning its directory', () => {
  const report = scan({ target: 'fixtures/safe/package.json', config: {} });
  assert.equal(report.summary.total, 2);
});
test('risky fixture flags install and publish risk', () => {
  const report = scan({ target: 'fixtures/risky', config: {} });
  assert.equal(report.summary.counts.high >= 2, true);
  assert.match(JSON.stringify(report.findings), /install-time|publish/);
});
test('npm pre/post companions are implicit but their ordinary script is not', () => {
  const report = scan({ target: 'fixtures/lifecycle-companions', config: {} });
  const byTrigger = Object.fromEntries(report.findings.map((finding) => [finding.trigger, finding]));

  for (const trigger of ['prebuild', 'postbuild']) {
    assert.equal(byTrigger[trigger]?.source, 'npm-lifecycle');
    assert.equal(byTrigger[trigger]?.severity, 'medium');
    assert.deepEqual(byTrigger[trigger]?.categories, ['implicit-trigger']);
  }
  assert.equal(byTrigger.build?.source, 'package-script');
  assert.equal(byTrigger.build?.severity, 'info');
  assert.deepEqual(byTrigger.build?.categories, []);
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

test('comment-only YAML fields are not discovered as hook commands', () => {
  const report = scan({ target: 'fixtures/yaml-comments', config: {} });
  const yamlFindings = report.findings.filter((finding) => finding.source === 'lefthook' || finding.source === 'pre-commit');

  assert.deepEqual(
    yamlFindings.map(({ source, trigger, command }) => ({ source, trigger, command })),
    [
      { source: 'lefthook', trigger: 'pre-push', command: 'npm audit --production' },
      { source: 'pre-commit', trigger: 'active-hook', command: 'npm test' }
    ]
  );
  assert.equal(JSON.stringify(yamlFindings).includes('comment-only'), false);
  assert.equal(JSON.stringify(yamlFindings).includes('npm publish'), false);
});

test('native .git hooks are discovered from a real hook directory when executable', () => {
  const target = mkdtempSync(join(tmpdir(), 'hookmark-git-hooks-'));
  const hooks = join(target, '.git', 'hooks');
  const hook = join(hooks, 'pre-push');
  mkdirSync(hooks, { recursive: true });
  writeFileSync(hook, '#!/bin/sh\ngit push --mirror backup\n');
  chmodSync(hook, 0o755);
  const report = scan({ target, config: {} });
  assert.equal(report.findings.some((f) => f.source === 'git-hook' && f.trigger === 'pre-push'), true);
});

test('native .git hooks ignore non-executable files', () => {
  const target = mkdtempSync(join(tmpdir(), 'hookmark-git-hooks-'));
  const hooks = join(target, '.git', 'hooks');
  mkdirSync(hooks, { recursive: true });
  writeFileSync(join(hooks, 'pre-push'), '#!/bin/sh\ngit push --mirror backup\n');
  const report = scan({ target, config: {} });
  assert.equal(report.findings.some((f) => f.source === 'git-hook' && f.trigger === 'pre-push'), false);
});

test('native Git hooks honor a repository-relative core.hooksPath', () => {
  const target = mkdtempSync(join(tmpdir(), 'hookmark-configured-hooks-'));
  const hooks = join(target, '.githooks');
  const hook = join(hooks, 'pre-push');
  execFileSync('git', ['init', '--quiet', target]);
  execFileSync('git', ['-C', target, 'config', 'core.hooksPath', '.githooks']);
  mkdirSync(hooks);
  writeFileSync(hook, '#!/bin/sh\nnpm publish\n');
  writeFileSync(join(hooks, 'pre-commit'), '#!/bin/sh\nnpm test\n');
  writeFileSync(join(hooks, 'commit-msg.sample'), '#!/bin/sh\nnpm publish\n');
  chmodSync(hook, 0o755);
  chmodSync(join(hooks, 'commit-msg.sample'), 0o755);

  const report = scan({ target, config: {} });
  const gitHooks = report.findings.filter((finding) => finding.source === 'git-hook');
  assert.deepEqual(gitHooks.map((finding) => finding.trigger), ['pre-push']);
  assert.equal(gitHooks[0]?.path, '.githooks/pre-push');
});

test('native .git hooks are discovered from a linked worktree common directory', () => {
  const target = mkdtempSync(join(tmpdir(), 'hookmark-git-worktree-'));
  const commonDir = mkdtempSync(join(tmpdir(), 'hookmark-git-common-'));
  const gitDir = join(commonDir, 'worktrees', 'linked');
  const hooks = join(commonDir, 'hooks');
  const hook = join(hooks, 'pre-commit');
  mkdirSync(gitDir, { recursive: true });
  mkdirSync(hooks);
  writeFileSync(join(target, '.git'), `gitdir: ${gitDir}\n`);
  writeFileSync(join(gitDir, 'commondir'), '../..\n');
  writeFileSync(hook, '#!/bin/sh\nnpm test\n');
  chmodSync(hook, 0o755);
  const report = scan({ target, config: {} });
  assert.equal(report.findings.some((f) => f.source === 'git-hook' && f.trigger === 'pre-commit'), true);
});

test('invalid config regex patterns do not crash substring matching', () => {
  const report = scan({ target: 'fixtures/risky', config: { ignore: ['('] } });
  assert.equal(report.summary.total > 0, true);
});
