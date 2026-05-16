import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { isLifecycleScript } from './rules.js';
import type { SourceType } from '../types.js';

export interface DiscoveredCommand {
  source: SourceType;
  trigger: string;
  path: string;
  command: string;
}

const hookNames = new Set([
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'pre-receive',
  'update',
  'post-receive',
  'post-update',
  'push-to-checkout',
  'pre-auto-gc',
  'post-rewrite',
  'sendemail-validate',
  'fsmonitor-watchman',
  'p4-changelist',
  'p4-prepare-changelist',
  'p4-post-changelist',
  'p4-pre-submit',
  'post-index-change'
]);

export function discover(target: string): DiscoveredCommand[] {
  const out: DiscoveredCommand[] = [];
  discoverGitHooks(target, out);
  discoverHusky(target, out);
  discoverPackage(target, out);
  discoverLefthook(target, out);
  discoverPreCommit(target, out);
  return out;
}

function rel(target: string, path: string): string {
  return relative(target, path) || '.';
}

function readableCommand(path: string): string {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return t && !t.startsWith('#') && !t.startsWith('. ') && !t.startsWith('source ');
    })
    .join(' && ');
}

function isExecutable(mode: number): boolean {
  return (mode & 0o111) !== 0;
}

function resolveGitDir(target: string): string | undefined {
  const gitPath = join(target, '.git');
  if (!existsSync(gitPath)) return undefined;

  const stat = statSync(gitPath);
  if (stat.isDirectory()) return gitPath;
  if (!stat.isFile()) return undefined;

  const content = readFileSync(gitPath, 'utf8').trim();
  const match = content.match(/^gitdir:\s*(.+)$/i);
  if (!match) return undefined;

  const gitDir = match[1];
  return isAbsolute(gitDir) ? gitDir : resolve(dirname(gitPath), gitDir);
}

function discoverGitHooks(target: string, out: DiscoveredCommand[]): void {
  const gitDir = resolveGitDir(target);
  if (!gitDir) return;

  const hooksDir = join(gitDir, 'hooks');
  if (!existsSync(hooksDir)) return;

  for (const name of readdirSync(hooksDir)) {
    if (name.endsWith('.sample') || !hookNames.has(name)) continue;

    const path = join(hooksDir, name);
    const stat = statSync(path);
    if (stat.isFile() && isExecutable(stat.mode)) {
      out.push({ source: 'git-hook', trigger: name, path: rel(target, path), command: readableCommand(path) });
    }
  }
}

function discoverHusky(target: string, out: DiscoveredCommand[]): void {
  const dir = join(target, '.husky');
  if (!existsSync(dir)) return;

  for (const name of readdirSync(dir)) {
    if (name === '_' || name.startsWith('.')) continue;

    const path = join(dir, name);
    if (statSync(path).isFile()) {
      out.push({ source: 'husky', trigger: name, path: rel(target, path), command: readableCommand(path) });
    }
  }
}

function discoverPackage(target: string, out: DiscoveredCommand[]): void {
  const path = join(target, 'package.json');
  if (!existsSync(path)) return;

  const pkg = JSON.parse(readFileSync(path, 'utf8')) as { scripts?: Record<string, string> };
  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    out.push({ source: isLifecycleScript(name) ? 'npm-lifecycle' : 'package-script', trigger: name, path: rel(target, path), command });
  }
}

function discoverLefthook(target: string, out: DiscoveredCommand[]): void {
  for (const file of ['lefthook.yml', 'lefthook.yaml']) {
    const path = join(target, file);
    if (!existsSync(path)) continue;

    const text = readFileSync(path, 'utf8');
    let trigger = 'lefthook';
    for (const line of text.split('\n')) {
      const top = line.match(/^([a-z][\w-]+):\s*$/);
      if (top) trigger = top[1];

      const run = line.match(/run:\s*["']?(.+?)["']?\s*$/);
      if (run) out.push({ source: 'lefthook', trigger, path: rel(target, path), command: run[1] });
    }
  }
}

function discoverPreCommit(target: string, out: DiscoveredCommand[]): void {
  const path = join(target, '.pre-commit-config.yaml');
  if (!existsSync(path)) return;

  const text = readFileSync(path, 'utf8');
  let id = 'pre-commit';
  for (const line of text.split('\n')) {
    const idMatch = line.match(/id:\s*(.+)$/);
    if (idMatch) id = idMatch[1].trim();

    const entry = line.match(/entry:\s*["']?(.+?)["']?\s*$/);
    if (entry) out.push({ source: 'pre-commit', trigger: id, path: rel(target, path), command: entry[1] });
  }
}
