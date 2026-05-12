import type { ScanReport } from '../types.js';
export function renderMarkdown(report: ScanReport): string {
  const lines = ['# HookMark Safety Map', '', `Target: \`${report.summary.target}\``, `Generated: ${report.summary.generatedAt}`, `Findings: ${report.summary.total}`, `Max severity: **${report.summary.maxSeverity}**`, '', '## Severity counts', '', '| Severity | Count |', '| --- | ---: |'];
  for (const key of ['high','medium','low','info'] as const) lines.push(`| ${key} | ${report.summary.counts[key]} |`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('No hooks or package scripts were discovered.');
  for (const finding of report.findings) {
    lines.push(`### ${finding.id}: ${finding.trigger} (${finding.severity})`, '', `- Source: ${finding.source}`, `- Path: \`${finding.path}\``, `- Command: \`${finding.command.replaceAll('`', '\\`')}\``, `- Categories: ${finding.categories.length ? finding.categories.join(', ') : 'none'}`, `- Suggested action: ${finding.action}`, '- Evidence:');
    for (const evidence of finding.evidence) lines.push(`  - ${evidence}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
