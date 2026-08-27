import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const workflowUrl = new URL('../.github/workflows/release.yml', import.meta.url);

async function loadReleaseWorkflow() {
  return parse(await readFile(workflowUrl, 'utf8'));
}

test('release workflow splits prepare and publish with least-privilege job permissions', async () => {
  const workflow = await loadReleaseWorkflow();
  assert.equal(
    workflow.permissions,
    undefined,
    'no workflow-level permissions block may remain; permissions must be job-scoped'
  );
  assert.deepEqual(Object.keys(workflow.jobs), ['prepare', 'publish']);
  assert.deepEqual(workflow.jobs.prepare.permissions, { contents: 'read' });
  assert.deepEqual(workflow.jobs.publish.permissions, {
    contents: 'write',
    'id-token': 'write',
  });
  assert.equal(workflow.jobs.publish.needs, 'prepare');
});

test('prepare job verifies the tag and preserves only the matching package and notes', async () => {
  const workflow = await loadReleaseWorkflow();
  const prepare = workflow.jobs.prepare;
  assert.equal(prepare.permissions.contents, 'read');
  assert.equal(prepare.needs, undefined, 'prepare must not depend on publish');
  const steps = prepare.steps.map((step, index) => ({ index, ...step }));
  const tagGuard = steps.findIndex((step) => step.run?.includes('assert-release-version.mjs'));
  const notes = steps.findIndex((step) => step.run?.includes('releasebox.js notes'));
  const pack = steps.findIndex((step) => step.run?.includes('npm pack --silent'));
  const verify = steps.findIndex((step) => step.run?.includes('assert-packaged-release-notes.mjs'));
  const upload = steps.findIndex((step) => step.uses === 'actions/upload-artifact@v4');
  assert.ok(tagGuard !== -1, 'prepare must verify GITHUB_REF_NAME against package.json');
  assert.ok(notes < pack && pack < verify && verify < upload, 'ordering must be notes -> pack -> verify -> upload');
  assert.equal(steps[pack].id, 'package', 'the package step must expose the exact tarball path');
  assert.equal(
    steps[upload].with.path,
    '${{ steps.package.outputs.tarball }}\nRELEASE_NOTES.md\n',
    'prepare must upload only the verified tarball and its matching notes'
  );
  const runs = prepare.steps.filter((step) => typeof step.run === 'string').map((step) => step.run);
  assert.ok(
    !runs.some((run) => run.includes('npm publish') || run.includes('gh release create')),
    'prepare must not publish or create releases'
  );
});

test('publish job restores artifacts before npm publish and creates the GitHub release last', async () => {
  const workflow = await loadReleaseWorkflow();
  const publish = workflow.jobs.publish;
  const steps = publish.steps.map((step, index) => ({
    index,
    run: step.run ?? '',
    name: step.name ?? '',
    uses: step.uses ?? '',
  }));
  const restore = steps.findIndex((step) => step.uses === 'actions/download-artifact@v4');
  const npmPublish = steps.findIndex((step) => step.run.includes('npm publish'));
  const createRelease = steps.findIndex((step) => step.run.includes('gh release create'));
  assert.ok(restore !== -1, 'publish must restore the verified release assets artifact');
  assert.ok(
    npmPublish !== -1 && steps[npmPublish].run === 'npm publish ./*.tgz --access public --provenance',
    'publish must publish the verified tarball with provenance'
  );
  assert.ok(createRelease !== -1, 'publish must create the GitHub release');
  assert.ok(
    restore < npmPublish && npmPublish < createRelease,
    'ordering must be restore -> npm publish -> GitHub release'
  );
});
