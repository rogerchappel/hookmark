import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageRoot = process.cwd();
const smokeRoot = mkdtempSync(join(tmpdir(), "hookmark-package-smoke-"));

try {
  const packOutput = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", smokeRoot],
    { cwd: packageRoot, encoding: "utf8" },
  );
  const [packed] = JSON.parse(packOutput);
  assert(packed?.filename, "npm pack did not report a tarball filename");

  const packagedFiles = new Set(packed.files.map(({ path }) => path));
  const expectedFiles = [
    "package.json",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "SUPPORT.md",
    "RELEASE_NOTES.md",
  ];
  for (const file of expectedFiles) {
    assert(packagedFiles.has(file), `${file} is missing from the package`);
  }

  const tarball = join(smokeRoot, packed.filename);
  const installRoot = join(smokeRoot, "consumer");
  mkdirSync(installRoot);
  execFileSync("npm", ["install", "--ignore-scripts", tarball], {
    cwd: installRoot,
    stdio: "inherit",
  });

  const installedRoot = join(installRoot, "node_modules", "hookmark");
  const manifest = JSON.parse(
    readFileSync(join(installedRoot, "package.json"), "utf8"),
  );
  assert.equal(manifest.bin?.hookmark, "./dist/cli.js");
  assert.equal(manifest.main, "./dist/index.js");
  assert.equal(manifest.types, "./dist/index.d.ts");
  assert.equal(manifest.exports?.["."]?.import, "./dist/index.js");
  assert.equal(manifest.exports?.["."]?.types, "./dist/index.d.ts");

  for (const entrypoint of [
    manifest.bin.hookmark,
    manifest.main,
    manifest.types,
    manifest.exports["."].import,
    manifest.exports["."].types,
  ]) {
    assert(
      packagedFiles.has(entrypoint.replace(/^\.\//, "")),
      `${entrypoint} is missing from the package`,
    );
  }

  const help = execFileSync(join(installRoot, "node_modules", ".bin", "hookmark"), ["--help"], {
    cwd: installRoot,
    encoding: "utf8",
  });
  assert.match(help, /Usage:\s+hookmark/);
  process.stdout.write("package smoke ok\n");
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
