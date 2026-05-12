# Rule examples

HookMark rules are deterministic string-pattern checks over discovered commands.

| Category | Examples | Default severity |
| --- | --- | --- |
| network | `curl`, `wget`, `git clone`, install commands | medium |
| credential-access | `TOKEN`, `SECRET`, `.env`, `npmrc` | high |
| publish | `npm publish`, `gh release`, `docker push` | high |
| deploy | `kubectl`, `terraform apply`, `wrangler deploy` | high |
| dangerous-delete | `rm -rf /`, `rm -rf $TARGET` | high |
| install-time | `preinstall`, `install`, `postinstall`, `prepare` | high |
| process-spawn | `bash`, `node`, `python`, `make`, `docker run` | low |

Rules intentionally err toward review. Trusted local automation can be documented with config ignores or severity overrides.
