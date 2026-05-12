# Contributing

Thanks for improving HookMark. Keep changes small, reviewable, and verified.

## Workflow

1. Open an issue or explain the intent in the PR.
2. Use Conventional Commits for focused changes.
3. Add or update fixtures when scanner behavior changes.
4. Update README/docs for user-visible behavior.
5. Run the relevant verification command before review.

## Verification

```sh
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Scanner changes

Rule changes should include:

- A fixture that demonstrates the command pattern.
- A test covering severity/category behavior.
- Documentation in `docs/RULES.md` when the category is new or materially changed.

## Safety

Do not add code paths that execute discovered commands. HookMark should remain offline and inspect-only by default.
