# HookMark

HookMark is a local-first TypeScript CLI that audits Git hooks, hook-manager files, and package scripts before you or an agent run them. It explains what can run on commit, push, install, and release without executing any discovered command.

## Quick start

```sh
npm install
npm run build
node dist/cli.js scan . --out hooks.md
node dist/cli.js scan fixtures/risky --format json --fail-on high
node dist/cli.js explain package.json --format markdown
```

## What HookMark scans

- `.git/hooks` executable hook files, excluding `*.sample`.
- `.husky/*` hook scripts.
- `lefthook.yml` / `lefthook.yaml` `run:` commands.
- `.pre-commit-config.yaml` `entry:` commands.
- `package.json` scripts, with npm lifecycle names highlighted.

## Safety model

HookMark is deterministic and offline. It tokenizes shell-like commands conservatively, applies pattern-based rules, and emits review guidance. It never executes hooks, package scripts, or config-defined commands.

Severity categories include:

- **high**: credential access, publishing, deploys, dangerous deletes, install-time lifecycle scripts.
- **medium**: network-capable commands, remote URLs, implicit hook triggers.
- **low**: filesystem writes or process spawning.
- **info**: discovered automation with no risky pattern match, or ignored by config.

## Configuration

Create `hookmark.config.json`, `.hookmarkrc`, or pass `--config`:

```json
{
  "ignore": ["package.json test"],
  "allow": [".husky/pre-commit npm test"],
  "severityOverrides": {
    "internal-release-dry-run": "medium"
  }
}
```

`allow` and `ignore` match against path, trigger, and command text. `severityOverrides` can lower or raise a known pattern after human review.

## CLI

```sh
hookmark scan <dir> [--out hooks.md] [--format markdown|json] [--fail-on high] [--config file]
hookmark explain <path-or-dir> [--format json|markdown]
```

`--fail-on` exits with code `2` when the maximum non-ignored severity meets or exceeds the threshold.

## Reports

Markdown reports are intended for PRs, READMEs, and handoffs. JSON reports include `summary`, `findings`, trigger, command, evidence, severity, category, and suggested action for automation.

## Limitations

HookMark is not malware detection, sandboxing, or a substitute for code review. Shell parsing is intentionally conservative; unusual quoting or generated scripts may need manual inspection. Always review high-severity findings before running install, commit, push, release, or deploy commands.

## Verify

```sh
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```
## Release readiness

Run the same checks expected before opening or cutting a release:

```sh
npm run check
npm run test
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```

Use `npm pack --dry-run` to confirm the published package contains the CLI/runtime files plus README, license, security, support, and release notes.

## Development

Run the same checks maintainers use before opening a PR:

```sh
npm test
npm run check
npm run typecheck
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```
## License
MIT
