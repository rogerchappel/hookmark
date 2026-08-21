import { accessSync, constants, existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { HookmarkConfig, Severity } from '../types.js';
import { isSeverity } from '../core/severity.js';

export const configNames = ['hookmark.config.json', '.hookmarkrc', '.hookmarkrc.json'];

export function loadConfig(target: string, explicit?: string): { config: HookmarkConfig; path?: string } {
  const candidates = explicit ? [resolve(explicit)] : configNames.map((name) => join(target, name));
  for (const path of candidates) {
    if (!existsSync(path)) continue;

    if (explicit) {
      try {
        accessSync(path, constants.R_OK);
        if (!statSync(path).isFile()) throw new Error();
      } catch {
        throw new Error(`config is not a readable file: ${path}`);
      }
    }

    const parsed = JSON.parse(readFileSync(path, 'utf8')) as HookmarkConfig;
    validateConfig(parsed, path);
    return { config: parsed, path };
  }
  if (explicit) throw new Error(`config is not a readable file: ${resolve(explicit)}`);
  return { config: {} };
}

export function validateConfig(config: HookmarkConfig, path = 'config'): void {
  for (const key of ['allow', 'ignore'] as const) {
    if (Object.hasOwn(config, key) && !Array.isArray(config[key])) {
      throw new Error(`${path}: ${key} must be an array`);
    }
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
