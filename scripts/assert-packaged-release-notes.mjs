import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const [tarball, notesFile = "RELEASE_NOTES.md"] = process.argv.slice(2);

assert(tarball, "usage: node scripts/assert-packaged-release-notes.mjs <tarball> [notes-file]");

const expected = readFileSync(notesFile);
const packaged = execFileSync("tar", ["-xOf", tarball, "package/RELEASE_NOTES.md"]);

assert.deepEqual(
  packaged,
  expected,
  `packaged RELEASE_NOTES.md does not match ${notesFile}`,
);

process.stdout.write(`packaged release notes match ${notesFile}\n`);
