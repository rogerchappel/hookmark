# HookMark PRD

Status: in-progress

## Summary

A local Git hook and package-script auditor that explains what runs on commit, push, install, and release before agents trip a wire. 🪝

## Source attribution

Created during the twice-daily OSS factory run on 2026-05-13 after the current unbuilt idea pool had fewer than five candidates. Inspired by common supply-chain and agent-safety concerns around Git hooks, npm lifecycle scripts, Husky, Lefthook, pre-commit, and release scripts; this is a renamed/reframed offline explainer, not a copy of a specific repo. Web search was attempted during selection and was rate-limited by the provider.

## Target users

- Developers cloning unfamiliar repos.
- Agents deciding which commands are safe to run.
- Maintainers documenting local automation.

## Problem

Hooks and lifecycle scripts hide important side effects in dotfolders and package metadata. A repo may run networked installs, mutation-heavy release commands, or shell scripts that agents should inspect before executing.

## Goals

- Discover Git hooks and package lifecycle scripts offline.
- Classify likely side effects: network, filesystem writes, credential access, publish/deploy, process spawning.
- Produce a readable Markdown safety map and machine-readable JSON.
- Offer allow/ignore config for trusted local scripts.
- Never execute discovered hooks/scripts.

## Non-goals

- Malware detection guarantees.
- Sandboxing or executing scripts.
- Replacing code review.

## V1 CLI

```bash
hookmark scan . --out hooks.md
hookmark scan fixtures/risky --format json --fail-on high
hookmark explain package.json
```

## Functional requirements

1. Parse `.git/hooks`, `.husky`, `lefthook.yml`, `.pre-commit-config.yaml`, `package.json` scripts, and npm lifecycle names.
2. Tokenize shell-ish commands conservatively without execution.
3. Apply deterministic rules for risky commands, network tools, credential/env access, publishing, deploys, deletes, and install-time execution.
4. Emit Markdown/JSON with trigger, command, evidence, severity, and suggested review action.
5. Include fixtures for safe, risky, Husky, Lefthook, and npm lifecycle projects.

## Acceptance criteria

- `npm test`, `npm run check`, `npm run build`, and `npm run smoke` pass.
- `bash scripts/validate.sh` passes when present.
- Real CLI smoke scans checked-in fixtures and writes reports.
- README covers quick start, safety model, rule examples, config, and limitations.
- Public GitHub repo `rogerchappel/hookmark` has useful description and topics.
