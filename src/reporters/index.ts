import type { ScanReport } from '../types.js';
import { renderJson } from './json.js';
import { renderMarkdown } from './markdown.js';
export type ReportFormat = 'markdown' | 'json';
export function renderReport(report: ScanReport, format: ReportFormat): string { return format === 'json' ? renderJson(report) : renderMarkdown(report); }
