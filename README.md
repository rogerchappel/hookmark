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

- Executable native Git hooks from the repository's effective hooks directory. HookMark honors `core.hooksPath` (including repository-relative paths) and otherwise scans the shared common hooks directory used by linked worktrees. Non-executable hooks and `*.sample` files are excluded.
- `.husky/*` hook scripts.
- `lefthook.yml` / `lefthook.yaml` indented `run:` fields.
- `.pre-commit-config.yaml` indented `entry:` fields, associated with the nearest preceding indented `id:` field.
- `package.json` scripts, with npm lifecycle names and defined `pre<name>` / `post<name>` companions highlighted. For example, when `build` exists, npm automatically runs defined `prebuild` and `postbuild` scripts around `npm run build`; `build` itself remains an ordinary, explicit package script.

## Safety model

HookMark is deterministic and offline. It tokenizes shell-like commands conservatively, applies pattern-based rules, and emits review guidance. It never executes hooks, package scripts, or config-defined commands.

Severity categories include:

- **high**: credential access, publishing, deploys, dangerous deletes, install-time lifecycle scripts.
- **medium**: network-capable commands, remote URLs, implicit hook and npm lifecycle triggers.
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

The config root must be a JSON object. `allow` and `ignore` must be arrays of string patterns and match against path, trigger, and command text. Empty arrays are valid; non-object roots, non-array values, and non-string entries are rejected with a config-path diagnostic. `severityOverrides` must be an object mapping patterns to valid severity values; empty mappings are valid, while null, arrays, and other shapes exit with code `1` and a config-path diagnostic. Valid overrides can lower or raise a known pattern after human review.

Automatic config discovery is optional. When `--config` is supplied explicitly, it must point to an existing, readable file; an invalid path exits with code `1` and a diagnostic instead of silently using an empty configuration.

## CLI

```sh
hookmark scan <dir> [--out hooks.md] [--format markdown|json] [--fail-on high] [--config file]
hookmark explain <path-or-dir> [--format json|markdown]
```

`--fail-on` exits with code `2` when the maximum non-ignored severity meets or exceeds the threshold.
Both commands require the target to be an existing, readable file or directory. Invalid or unsupported targets exit with code `1` and print a diagnostic to stderr; a file target scans its containing directory.

## Reports

Markdown reports are intended for PRs, READMEs, and handoffs. JSON reports include `summary`, `findings`, trigger, command, evidence, severity, category, and suggested action for automation.
## CLI Help Smoke

Confirm the packaged command starts and prints its help text before relying on a release tarball or downstream automation:

```bash
npm run build
node ./dist/cli.js --help
```

The command should exit successfully, print the available options, and avoid reading project files or contacting external services.

## Limitations

HookMark is not malware detection, sandboxing, or a substitute for code review. Lefthook and pre-commit discovery intentionally supports the ordinary, line-oriented YAML fields described above rather than parsing the complete YAML language; comment-only lines are ignored, while unusual quoting, multiline values, anchors, aliases, or generated scripts may need manual inspection. Shell parsing is intentionally conservative. Resolving `core.hooksPath` requires Git to be installed; if Git cannot read the setting, HookMark falls back to the repository's ordinary hooks directory. Always review high-severity findings before running install, commit, push, release, or deploy commands.

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

Use `npm run package:smoke` to rebuild and pack into a disposable directory, verify the documented files and CLI/runtime entrypoints, confirm the packaged release notes match `RELEASE_NOTES.md`, install the tarball outside the checkout, and run the installed `hookmark --help` command.

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
