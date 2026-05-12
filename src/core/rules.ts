import type { Finding, Severity, SourceType } from '../types.js';
import { tokenize } from './tokenize.js';
import { maxSeverity } from './severity.js';
const network = /\b(curl|wget|fetch|axios|httpie|nc|netcat|ssh|scp|rsync|git\s+clone|npm\s+(install|ci)|pnpm\s+install|yarn\s+install)\b/i;
const write = /\b(rm|mv|cp|chmod|chown|mkdir|touch|tee|sed\s+-i|perl\s+-pi|git\s+(commit|tag|push)|npm\s+version)\b/i;
const creds = /\b(SECRET|TOKEN|PASSWORD|PASS|KEY|AWS_|GITHUB_TOKEN|NPM_TOKEN|\.env|gh\s+auth|npmrc)\b/i;
const publish = /\b(npm\s+publish|pnpm\s+publish|yarn\s+npm\s+publish|docker\s+push|gh\s+release|twine\s+upload)\b/i;
const deploy = /\b(kubectl|helm|terraform\s+apply|vercel|netlify|flyctl|wrangler\s+deploy|serverless\s+deploy|aws\s+cloudformation)\b/i;
const spawn = /\b(sh|bash|zsh|python|python3|ruby|perl|node|npx|tsx|make|just|docker\s+run)\b/i;
const dangerousDelete = /\brm\s+(-[rfRF]+\s+)*(-[rfRF]+\s+)?(\/|~|\.\.|\$\w+)/i;
const lifecycleHigh = new Set(['preinstall', 'install', 'postinstall', 'prepublish', 'prepublishOnly', 'prepare']);
export function classifyCommand(input: { source: SourceType; trigger: string; path: string; command: string; id: string; ignored?: boolean; override?: Severity }): Finding {
  const command = input.command.trim();
  const categories: string[] = [];
  const evidence: string[] = [];
  const severities: Severity[] = ['info'];
  const add = (category: string, sev: Severity, why: string) => { categories.push(category); severities.push(sev); evidence.push(why); };
  if (network.test(command)) add('network', 'medium', 'Network-capable command detected.');
  if (write.test(command)) add('filesystem-write', 'low', 'Command may mutate files, permissions, Git state, or package version.');
  if (creds.test(command)) add('credential-access', 'high', 'Command references credentials, secret-like environment variables, or auth material.');
  if (publish.test(command)) add('publish', 'high', 'Command can publish artifacts or releases.');
  if (deploy.test(command)) add('deploy', 'high', 'Command can deploy or alter infrastructure.');
  if (spawn.test(command)) add('process-spawn', 'low', 'Command starts another interpreter or process runner.');
  if (dangerousDelete.test(command)) add('dangerous-delete', 'high', 'Delete command has broad or variable target.');
  if (input.source === 'npm-lifecycle' && lifecycleHigh.has(input.trigger)) add('install-time', 'high', 'NPM lifecycle script can run during install or publish preparation.');
  if (input.source !== 'package-script' && input.source !== 'file') add('implicit-trigger', 'medium', 'Hook can run implicitly from Git or a hook manager.');
  const tokens = tokenize(command);
  if (tokens.some((token) => token.startsWith('http://') || token.startsWith('https://'))) add('remote-url', 'medium', 'Command includes a remote URL.');
  let severity = input.override ?? maxSeverity(severities);
  if (input.ignored) severity = 'info';
  return { id: input.id, source: input.source, trigger: input.trigger, path: input.path, command, severity, categories: [...new Set(categories)], evidence: evidence.length ? evidence : ['No risky pattern matched.'], action: actionFor(severity, input.ignored), ignored: input.ignored };
}
function actionFor(severity: Severity, ignored?: boolean): string {
  if (ignored) return 'Ignored by configuration; periodically re-review the trust entry.';
  if (severity === 'high') return 'Stop and review manually before running this trigger.';
  if (severity === 'medium') return 'Inspect command and dependencies before running.';
  if (severity === 'low') return 'Usually safe, but note local mutation or process spawning.';
  return 'Documented for awareness.';
}
export function isLifecycleScript(name: string): boolean {
  return /^(pre|post)(install|publish|pack|version|test)$/.test(name) || lifecycleHigh.has(name);
}
