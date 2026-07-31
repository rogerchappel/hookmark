import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs, helpText } from './args.js';
import { loadConfig } from '../config/config.js';
import { normalizeTarget, scan } from '../core/scanner.js';
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
export const isMain = process.argv[1] === fileURLToPath(import.meta.url).replace(/\/src\/cli\/run\.ts$/, '/dist/cli/run.js');
