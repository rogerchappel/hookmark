import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [tag, packageFile = "package.json"] = process.argv.slice(2);

assert(tag, "usage: node scripts/assert-release-version.mjs <tag> [package-file]");

const { version } = JSON.parse(readFileSync(packageFile, "utf8"));
assert.equal(tag, `v${version}`, `release tag ${tag} does not match package version ${version}`);

process.stdout.write(`release tag ${tag} matches package version ${version}\n`);
