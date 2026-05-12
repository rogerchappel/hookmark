import type { Severity } from '../types.js';
const rank: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3 };
export function compareSeverity(a: Severity, b: Severity): number { return rank[a] - rank[b]; }
export function maxSeverity(values: Severity[]): Severity { return values.reduce((m, v) => compareSeverity(v, m) > 0 ? v : m, 'info' as Severity); }
export function meetsSeverity(value: Severity, threshold: Severity): boolean { return compareSeverity(value, threshold) >= 0; }
export function severityRank(value: Severity): number { return rank[value]; }
export const severities = ['info', 'low', 'medium', 'high'] as const;
export function isSeverity(value: string): value is Severity { return (severities as readonly string[]).includes(value); }
