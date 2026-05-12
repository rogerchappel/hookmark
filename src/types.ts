export type Severity = 'info' | 'low' | 'medium' | 'high';
export type SourceType = 'git-hook' | 'husky' | 'lefthook' | 'pre-commit' | 'package-script' | 'npm-lifecycle' | 'file';
export interface Finding {
  id: string;
  source: SourceType;
  trigger: string;
  path: string;
  command: string;
  severity: Severity;
  categories: string[];
  evidence: string[];
  action: string;
  ignored?: boolean;
}
export interface Summary {
  target: string;
  generatedAt: string;
  counts: Record<Severity, number>;
  total: number;
  maxSeverity: Severity;
}
export interface ScanReport { summary: Summary; findings: Finding[]; configPath?: string; }
export interface HookmarkConfig { allow?: string[]; ignore?: string[]; severityOverrides?: Record<string, Severity>; }
export interface ScanOptions { target: string; config?: HookmarkConfig; configPath?: string; }
