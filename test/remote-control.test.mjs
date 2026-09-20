import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {patchRemoteControlRouting, remoteControlPrelude} from '../src/remote-control.mjs';

const choose = new Function(remoteControlPrelude + '\nreturn __subscriptionRemoteControlEnvironment;')();
const localWorkspace = {id: 'this-mac-workspace'};
const remoteControl = {type: 'new', environment: {usePrivateWorker: true, privateWorkspaceIdentifier: localWorkspace}};
const cloudVm = {type: 'new', environment: {id: 'github.com/example/repo'}};
const thisMac = {type: 'existing', environment: localWorkspace};

function modelConfig(modelId) {
  return {modelConfig: {selectedModels: [{modelId}], modelName: modelId}};
}

test('Remote Control subscription turns reuse the This Mac workspace; cloud VMs stay on the cloud repo', () => {
  assert.deepEqual(choose(remoteControl, modelConfig('chatgpt-codex/test-model')), thisMac);
  assert.deepEqual(choose(remoteControl, modelConfig('claude-subscription/opus')), thisMac);
  assert.equal(choose(remoteControl, modelConfig('grok-4.6')), remoteControl);
  assert.equal(choose(cloudVm, modelConfig('chatgpt-codex/test-model')), cloudVm);
  assert.equal(choose(thisMac, modelConfig('chatgpt-codex/test-model')), thisMac);
  assert.equal(choose(remoteControl, {}), remoteControl);
  const unlabeled = {type: 'new', environment: {usePrivateWorker: true}};
  assert.equal(choose(unlabeled, modelConfig('chatgpt-codex/test-model')), unlabeled);
  assert.deepEqual(
    choose(unlabeled, {...modelConfig('chatgpt-codex/test-model'), privateWorkspaceIdentifier: localWorkspace}),
    thisMac
  );
});

test('Remote Control checks every selected model and modelName without changing the configuration', () => {
  for (const prefix of ['chatgpt-codex/', 'claude-subscription/']) {
    for (const config of [
      {selectedModels: [{modelId: 'ordinary-model'}, {modelId: prefix + 'selected'}]},
      {selectedModels: [{modelId: 'ordinary-model'}], modelName: prefix + 'named'},
      {selectedModels: [null, {modelId: 'ordinary-model'}, {modelId: prefix + 'selected'}], modelName: 'ordinary-model'},
      {modelName: prefix + 'named'}
    ]) {
      const options = {modelConfig: config}, original = structuredClone(options);
      assert.deepEqual(choose(remoteControl, options), thisMac);
      assert.strictEqual(choose(cloudVm, options), cloudVm);
      assert.strictEqual(choose(thisMac, options), thisMac);
      const nonPrivate = {type: 'new', environment: {usePrivateWorker: false, privateWorkspaceIdentifier: localWorkspace}};
      assert.strictEqual(choose(nonPrivate, options), nonPrivate);
      assert.deepEqual(options, original);
    }
  }
  assert.strictEqual(choose(remoteControl, {modelConfig: {selectedModels: [null, {}, {modelId: 42}, {modelId: 'ordinary-model'}], modelName: 'other-model'}}), remoteControl);
});

const combinedFixture = `class Combined{constructor(localRepo,cloudRepo){this.localRepo=localRepo;this.cloudRepo=cloudRepo}
resolveEnvironmentRepo(e){switch(e.type){case"existing":return this.localRepo;case"new":return this.cloudRepo;default:throw new Error("Unknown environment type")}}
async createAgent(e,n,i){const r=this.resolveEnvironmentRepo(n);return r.createAgent(e,n,i)}}`;

test('glass createAgent sends Remote Control subscription models through localRepo', async () => {
  const source = patchRemoteControlRouting(combinedFixture, 'glass');
  execFileSync(process.execPath, ['--check', '--input-type=module'], {input: source, stdio: 'pipe'});
  const Combined = new Function(source + '\nreturn Combined;')();
  const calls = [];
  const repo = new Combined(
    {createAgent: (...args) => { calls.push(['local', ...args]); return 'local'; }},
    {createAgent: (...args) => { calls.push(['cloud', ...args]); return 'cloud'; }}
  );
  assert.equal(await repo.createAgent('prompt', remoteControl, modelConfig('chatgpt-codex/test-model')), 'local');
  assert.deepEqual(calls.at(-1)[2], thisMac);
  assert.equal(await repo.createAgent('prompt', remoteControl, modelConfig('claude-subscription/opus')), 'local');
  assert.equal(await repo.createAgent('prompt', remoteControl, modelConfig('grok-4.6')), 'cloud');
  assert.equal(await repo.createAgent('prompt', cloudVm, modelConfig('chatgpt-codex/test-model')), 'cloud');
  assert.equal(await repo.createAgent('prompt', thisMac, modelConfig('chatgpt-codex/test-model')), 'local');
  const unlabeled = {type: 'new', environment: {usePrivateWorker: true}};
  assert.equal(await repo.createAgent('prompt', unlabeled, {...modelConfig('chatgpt-codex/test-model'), privateWorkspaceIdentifier: localWorkspace}), 'local');
});

test('desktop workbenches without the combined repo are unchanged; a missing glass anchor fails closed', () => {
  assert.equal(patchRemoteControlRouting('desktop-workbench', 'desktop'), 'desktop-workbench');
  assert.throws(() => patchRemoteControlRouting('desktop-workbench', 'glass'), /anchor missing/);
  const patched = patchRemoteControlRouting(combinedFixture, 'glass');
  assert.equal(patchRemoteControlRouting(patched, 'glass'), patched);
  assert.throws(() => patchRemoteControlRouting(combinedFixture + combinedFixture, 'glass'), /not unique/);
});

test('all structural createAgent anchors must be unique even when parameter names differ', () => {
  const distinctAnchor = 'class Other{async createAgent(prompt,environment,options){const repo=this.resolveEnvironmentRepo(environment);return repo}}';
  for (const surface of ['desktop', 'glass']) {
    assert.throws(() => patchRemoteControlRouting(combinedFixture + distinctAnchor, surface), /anchor not unique/);
  }
});
