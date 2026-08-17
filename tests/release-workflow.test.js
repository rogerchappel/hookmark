import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const release = readFileSync(".github/workflows/release.yml", "utf8");
const dryRun = readFileSync(".github/workflows/release-dry-run.yml", "utf8");

test("release verifies and publishes the same tarball before attaching it", () => {
  const steps = [
    "Verify release version",
    "Generate release notes",
    "Build package",
    "Verify packaged release notes",
    "Publish package to npm",
    "Create GitHub release",
  ];

  let previous = -1;
  for (const step of steps) {
    const position = release.indexOf(`- name: ${step}`);
    assert(position > previous, `${step} must follow the preceding release step`);
    previous = position;
  }

  assert.match(release, /npm publish "\$\{\{ steps\.package\.outputs\.tarball \}\}" --provenance --access public/);
  assert.match(release, /gh release create[^\n]+"\$\{\{ steps\.package\.outputs\.tarball \}\}"/);
});

test("dry run exercises package verification and npm publish arguments", () => {
  assert.match(dryRun, /assert-packaged-release-notes\.mjs "\$tarball" RELEASE_NOTES\.md/);
  assert.match(dryRun, /npm publish "\$\{\{ steps\.package\.outputs\.tarball \}\}" --dry-run --access public/);
});
