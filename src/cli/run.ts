import { writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, helpText } from './args.js';
import { loadConfig } from '../config/config.js';
import { scan } from '../core/scanner.js';
import { renderReport } from '../reporters/index.js';
import { meetsSeverity } from '../core/severity.js';
export async function run(argv = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.command === 'help') { process.stdout.write(helpText()); return 0; }
    if (args.command === 'version') { process.stdout.write('0.1.0\n'); return 0; }
    const target = normalizeTarget(args.target);
    const { config, path } = loadConfig(target, args.config);
    const report = scan({ target, config, configPath: path });
    const output = renderReport(report, args.format);
    if (args.out) writeFileSync(args.out, output); else process.stdout.write(output);
    if (args.failOn && meetsSeverity(report.summary.maxSeverity, args.failOn)) return 2;
    return 0;
  } catch (error) { process.stderr.write(`hookmark: ${error instanceof Error ? error.message : String(error)}\n`); return 1; }
}
function normalizeTarget(input: string): string { const path = resolve(input); try { const st = statSync(path); return st.isFile() ? dirname(path) : path; } catch { return path; } }
export const isMain = process.argv[1] === fileURLToPath(import.meta.url).replace(/\/src\/cli\/run\.ts$/, '/dist/cli/run.js');
