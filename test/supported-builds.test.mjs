import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CURSOR_VERSION, supportedBuild} from '../src/supported-builds.mjs';
import {supportedMacHost} from '../src/macos.mjs';

test('the recognized Cursor version is rejected without darwin/arm64 hashes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-build-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version: CURSOR_VERSION}));
  assert.throws(() => supportedBuild(root), /no verified macOS arm64 metadata/);
});

test('older and unknown Cursor versions remain unsupported', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-unknown-build-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  for (const version of ['3.20.7', '3.20.17', '3.20.21', '3.21.1', '3.21.9', '9.9.9']) {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version}));
    assert.throws(() => supportedBuild(root), /Unsupported Cursor version/);
  }
});

test('restore host checks do not depend on a Cursor version build file', () => {
  assert.equal(supportedMacHost.platform, 'darwin');
  assert.equal(supportedMacHost.arch, 'arm64');
  assert.equal(supportedMacHost.osMinimum, '26.0');
  assert.equal('version' in supportedMacHost, false);
});
