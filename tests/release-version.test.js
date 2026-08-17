import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/assert-release-version.mjs", import.meta.url));

test("accepts a release tag matching the package version", () => {
  const output = execFileSync(process.execPath, [script, "v0.1.0"], { encoding: "utf8" });
  assert.match(output, /matches package version 0\.1\.0/);
});

test("rejects a release tag that does not match the package version", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "hookmark-release-version-"));
  const packageFile = join(fixtureRoot, "package.json");
  writeFileSync(packageFile, JSON.stringify({ version: "2.0.0" }));

  const result = spawnSync(process.execPath, [script, "v2.0.1", packageFile], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release tag v2\.0\.1 does not match package version 2\.0\.0/);
});
