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

test('prepare job builds and preserves verified assets without publish permission', async () => {
  const workflow = await loadReleaseWorkflow();
  const prepare = workflow.jobs.prepare;
  assert.equal(prepare.permissions.contents, 'read');
  assert.equal(prepare.needs, undefined, 'prepare must not depend on publish');
  assert.ok(
    prepare.steps.some((step) => step.name === 'Build package' && step.run === 'npm pack'),
    'prepare must build the tarball with npm pack'
  );
  assert.ok(
    prepare.steps.some(
      (step) => step.name === 'Preserve verified release assets' && step.uses === 'actions/upload-artifact@v4'
    ),
    'prepare must upload the verified tarball and release notes'
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