import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {osMinimumMajor, machineArch, appBundlePath} from '../patcher.mjs';

test('macOS threshold comes from the build manifest', () => {
  assert.equal(osMinimumMajor({osMinimum:'26.0'}), 26);
  assert.equal(osMinimumMajor({osMinimum:'27.1'}), 27);
  assert.throws(() => osMinimumMajor({}), /osMinimum/);
  assert.throws(() => osMinimumMajor({osMinimum:'tahoe'}), /osMinimum/);
});

test('machine architecture reports a supported value', () => {
  assert.ok(['arm64', 'x64'].includes(machineArch()));
});

test('bundle path resolves Cursor.app from the resources directory', t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-gpt-link-bundle-test-'));
  t.after(() => fs.rmSync(base, {recursive:true, force:true}));
  const root = path.join(base, 'Cursor.app', 'Contents', 'Resources', 'app');
  fs.mkdirSync(root, {recursive:true});
  assert.equal(appBundlePath(root), path.join(base, 'Cursor.app'));
  assert.throws(() => appBundlePath(path.join(base, 'plain-dir')), /Re-sign it manually/);
});
