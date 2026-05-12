import { resolve } from 'node:path';
import { discover } from './discover.js';
import { classifyCommand } from './rules.js';
import { maxSeverity } from './severity.js';
import { matchesPattern, overrideFor } from '../config/config.js';
import type { ScanOptions, ScanReport, Severity } from '../types.js';
export function scan(options: ScanOptions): ScanReport {
  const target = resolve(options.target);
  const findings = discover(target).map((item, index) => {
    const text = `${item.path} ${item.trigger} ${item.command}`;
    return classifyCommand({ ...item, id: `HM${String(index + 1).padStart(3, '0')}`, ignored: matchesPattern(options.config?.ignore ?? [], text) || matchesPattern(options.config?.allow ?? [], text), override: overrideFor(options.config ?? {}, text) });
  });
  const severities = findings.filter((f) => !f.ignored).map((f) => f.severity);
  const counts: Record<Severity, number> = { info: 0, low: 0, medium: 0, high: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return { configPath: options.configPath, summary: { target, generatedAt: new Date().toISOString(), counts, total: findings.length, maxSeverity: maxSeverity(severities.length ? severities : ['info']) }, findings };
}
