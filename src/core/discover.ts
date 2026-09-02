import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

function resolveCommonGitDir(gitDir: string): string {
  const commonDirPath = join(gitDir, 'commondir');
  if (!existsSync(commonDirPath)) return gitDir;

  const commonDir = readFileSync(commonDirPath, 'utf8').trim();
  if (!commonDir) return gitDir;

  return isAbsolute(commonDir) ? commonDir : resolve(gitDir, commonDir);
}

function resolveHooksDir(target: string, gitDir: string): string {
  const configured = spawnSync('git', ['-C', target, 'config', '--path', '--get', 'core.hooksPath'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });

  if (configured.status === 0) {
    const hooksPath = configured.stdout.trim();
    if (hooksPath) return isAbsolute(hooksPath) ? hooksPath : resolve(target, hooksPath);
  }

  return join(resolveCommonGitDir(gitDir), 'hooks');
}

function discoverGitHooks(target: string, out: DiscoveredCommand[]): void {
  const gitDir = resolveGitDir(target);
  if (!gitDir) return;

  const hooksDir = resolveHooksDir(target, gitDir);
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

  const pkg = JSON.parse(readFileSync(path, 'utf8')) as { scripts?: unknown };
  const scripts = pkg.scripts === undefined ? {} : pkg.scripts;
  if (scripts === null || typeof scripts !== 'object' || Array.isArray(scripts)) {
    throw new Error(`${path}: scripts must be an object`);
  }
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string') throw new Error(`${path}: scripts.${name} must be a string`);
  }
  const scriptNames = Object.keys(scripts);
  for (const [name, command] of Object.entries(scripts)) {
    out.push({ source: isLifecycleScript(name, scriptNames) ? 'npm-lifecycle' : 'package-script', trigger: name, path: rel(target, path), command: command as string });
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

      const run = line.match(/^\s+run:\s*["']?(.+?)["']?\s*$/);
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
    const idMatch = line.match(/^\s+(?:-\s*)?id:\s*(.+)$/);
    if (idMatch) id = idMatch[1].trim();

    const entry = line.match(/^\s+entry:\s*["']?(.+?)["']?\s*$/);
    if (entry) out.push({ source: 'pre-commit', trigger: id, path: rel(target, path), command: entry[1] });
  }
}
