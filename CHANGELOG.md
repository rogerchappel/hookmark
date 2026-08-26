# Changelog

All notable changes to HookMark will be documented here.

## [Unreleased]

### Changed

- Split the tag-triggered release workflow into least-privilege `prepare` (contents: read) and `publish` (contents: write, id-token: write) jobs that hand off verified tarball and release-notes artifacts, so checkout, install, and release checks no longer run with write or OIDC token permissions.

### Added

- Initial TypeScript CLI for scanning Git hooks, Husky, Lefthook, pre-commit, and package scripts.
- Markdown and JSON reports with deterministic severity rules.
- Config support for ignores, allows, and severity overrides.
- Fixtures, tests, smoke script, and validation workflow.
