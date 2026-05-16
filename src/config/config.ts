import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookmarkConfig, Severity } from '../types.js';
import { isSeverity } from '../core/severity.js';

export const configNames = ['hookmark.config.json', '.hookmarkrc', '.hookmarkrc.json'];

export function loadConfig(target: string, explicit?: string): { config: HookmarkConfig; path?: string } {
  const candidates = explicit ? [explicit] : configNames.map((name) => join(target, name));
  for (const path of candidates) {
    if (!existsSync(path)) continue;

    const parsed = JSON.parse(readFileSync(path, 'utf8')) as HookmarkConfig;
    validateConfig(parsed, path);
    return { config: parsed, path };
  }
  return { config: {} };
}

export function validateConfig(config: HookmarkConfig, path = 'config'): void {
  for (const key of ['allow', 'ignore'] as const) {
    if (config[key] && !Array.isArray(config[key])) throw new Error(`${path}: ${key} must be an array`);
  }

  if (config.severityOverrides) {
    for (const [pattern, severity] of Object.entries(config.severityOverrides)) {
      if (!pattern) throw new Error(`${path}: severity override pattern cannot be empty`);
      if (!isSeverity(severity as Severity)) throw new Error(`${path}: invalid severity ${severity}`);
    }
  }
}

export function matchesPattern(values: string[], text: string): boolean {
  return values.some((pattern) => patternMatches(pattern, text));
}

export function overrideFor(config: HookmarkConfig, text: string): Severity | undefined {
  for (const [pattern, severity] of Object.entries(config.severityOverrides ?? {})) {
    if (patternMatches(pattern, text)) return severity as Severity;
  }
  return undefined;
}

function patternMatches(pattern: string, text: string): boolean {
  if (text.includes(pattern)) return true;

  try {
    return new RegExp(pattern).test(text);
  } catch {
    return false;
  }
}
