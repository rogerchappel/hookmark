import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReport, scan } from '../dist/index.js';
test('renders markdown and json reports', () => {
  const report = scan({ target: 'fixtures/risky', config: {} });
  assert.match(renderReport(report, 'markdown'), /HookMark Safety Map/);
  assert.equal(JSON.parse(renderReport(report, 'json')).summary.total, report.summary.total);
});
