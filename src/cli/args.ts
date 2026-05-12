import { isSeverity } from '../core/severity.js';
import type { Severity } from '../types.js';
export interface CliArgs { command: 'scan' | 'explain' | 'help' | 'version'; target: string; out?: string; format: 'markdown' | 'json'; failOn?: Severity; config?: string; }
export function parseArgs(argv: string[]): CliArgs {
  const [commandRaw, ...rest] = argv;
  if (!commandRaw || commandRaw === '--help' || commandRaw === '-h') return { command: 'help', target: '.', format: 'markdown' };
  if (commandRaw === '--version' || commandRaw === '-v') return { command: 'version', target: '.', format: 'markdown' };
  if (commandRaw !== 'scan' && commandRaw !== 'explain') throw new Error(`Unknown command: ${commandRaw}`);
  const args: CliArgs = { command: commandRaw, target: '.', format: commandRaw === 'explain' ? 'json' : 'markdown' };
  const positionals: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--out') args.out = need(rest, ++i, arg);
    else if (arg === '--format') { const value = need(rest, ++i, arg); if (value !== 'json' && value !== 'markdown') throw new Error('--format must be json or markdown'); args.format = value; }
    else if (arg === '--fail-on') { const value = need(rest, ++i, arg); if (!isSeverity(value)) throw new Error('--fail-on must be info, low, medium, or high'); args.failOn = value; }
    else if (arg === '--config') args.config = need(rest, ++i, arg);
    else positionals.push(arg);
  }
  if (positionals[0]) args.target = positionals[0];
  return args;
}
function need(args: string[], index: number, flag: string): string { if (!args[index]) throw new Error(`${flag} requires a value`); return args[index]; }
export function helpText(): string { return `HookMark - local hook and package-script auditor\n\nUsage:\n  hookmark scan <dir> [--out hooks.md] [--format markdown|json] [--fail-on high] [--config file]\n  hookmark explain <path-or-dir> [--format json|markdown]\n\nHookMark never executes discovered hooks or scripts.\n`; }
