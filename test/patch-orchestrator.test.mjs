import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceOnce, wrapRuntime} from '../src/patch-orchestrator.mjs';
import {CURSOR_VERSION, workbench} from '../src/patch-symbols.mjs';
import {maxModeVariant} from '../src/max-mode.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

test('the patch table has one row for the recognized Cursor version', () => {
  assert.deepEqual(Object.keys(workbench), [CURSOR_VERSION]);
  assert.ok(workbench[CURSOR_VERSION].desktop);
  assert.ok(workbench[CURSOR_VERSION].glass);
  assert.equal(workbench[CURSOR_VERSION].commit, 'e44a49c17e334d442e58bbde931d791200f014a0');
});

test('wrapRuntime reads the minified parameter list and fails closed without an anchor', () => {
  const source = '}(n);if(void 0===a)return;if(void 0!==i&&"openai_compatible"===x)';
  const patched = wrapRuntime(source);
  assert.match(patched, /t\.startsWith\("chatgpt-codex\/"\)/);
  assert.match(patched, /n\?\.find\(p=>p\.id==="reasoning"\)/);
  assert.equal(wrapRuntime(patched), patched);
  assert.throws(() => wrapRuntime('no-anchor'), /Reasoning effort anchor missing/);
});

test('replaceOnce refuses missing or repeated anchors', () => {
  assert.equal(replaceOnce('ab', 'a', 'x'), 'xb');
  assert.throws(() => replaceOnce('aa', 'a', 'x'), /not unique/);
  assert.throws(() => replaceOnce('b', 'a', 'x'), /not unique/);
});

test('serialized max-mode helper does not close over Node imports', () => {
  const source = maxModeVariant.toString();
  assert.equal(source.includes('requireSubscriptionPrefix'), false);
  assert.equal(source.includes('GPT_PREFIX'), false);
});

test('glass Remote Control routing is wired into the shared workbench pipeline', () => {
  const orchestrator = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/patch-orchestrator.mjs'), 'utf8');
  assert.match(orchestrator, /import \{patchRemoteControlRouting\} from '\.\/remote-control\.mjs'/);
  assert.match(orchestrator, /patchRemoteControlRouting\(source, surfaceName\)/);
  const helper = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/remote-control.mjs'), 'utf8');
  assert.equal(helper.includes('requireSubscriptionPrefix'), false);
  assert.match(helper, /chatgpt-codex\//);
  assert.match(helper, /claude-subscription\//);
});
