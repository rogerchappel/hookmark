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

    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    validateConfig(parsed, path);
    return { config: parsed, path };
  }
  if (explicit) throw new Error(`config is not a readable file: ${resolve(explicit)}`);
  return { config: {} };
}

export function validateConfig(config: unknown, path = 'config'): asserts config is HookmarkConfig {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(`${path}: config root must be a JSON object`);
  }
  const validatedConfig = config as HookmarkConfig;

  for (const key of ['allow', 'ignore'] as const) {
    if (Object.hasOwn(validatedConfig, key) && !Array.isArray(validatedConfig[key])) {
      throw new Error(`${path}: ${key} must be an array`);
    }
    for (const [index, value] of (validatedConfig[key] ?? []).entries()) {
      if (typeof value !== 'string') {
        throw new Error(`${path}: ${key}[${index}] must be a string`);
      }
    }
  }

  if (validatedConfig.severityOverrides) {
    for (const [pattern, severity] of Object.entries(validatedConfig.severityOverrides)) {
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
