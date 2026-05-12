# Security Policy

HookMark is a local auditing tool. It does not execute discovered hooks, package scripts, or hook-manager commands.

## Supported versions

| Version | Supported |
| --- | --- |
| 0.x | Best-effort while the project is pre-1.0 |

## Reporting vulnerabilities

Please do not publish exploit details in public issues. Open a minimal public issue asking for a private reporting path, or contact the maintainer through an established private channel.

Useful reports include affected version, operating system, input fixture, expected behavior, observed behavior, and potential impact.

## Scope

In scope: command discovery, report generation, CLI behavior, and unsafe defaults in this repository.

Out of scope: malware verdicts for third-party repositories, sandbox escapes outside HookMark, and general security review of scanned projects.
