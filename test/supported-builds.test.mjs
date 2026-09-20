import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CURSOR_VERSION, supportedBuild} from '../src/supported-builds.mjs';
import {supportedMacHost} from '../src/macos.mjs';

test('the reviewed Cursor 3.21.13 Mac build is recognized and other commits are rejected', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-build-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version:'3.21.13'}));
  fs.writeFileSync(path.join(root, 'product.json'), JSON.stringify({commit:'e44a49c17e334d442e58bbde931d791200f014a0'}));
  const build = supportedBuild(root);
  assert.equal(CURSOR_VERSION, '3.21.13');
  assert.equal(build.platform, 'darwin');
  assert.equal(build.arch, 'arm64');
  assert.equal(build.osMinimum, '26.0');
  assert.equal(Object.keys(build.files).length, 6);
  fs.writeFileSync(path.join(root, 'product.json'), JSON.stringify({commit:'unreviewed'}));
  assert.throws(() => supportedBuild(root), /Unsupported Cursor commit/);
});

test('older and unknown Cursor versions remain unsupported', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-unknown-build-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  for (const version of ['3.20.7', '3.20.17', '3.20.21', '3.21.1', '3.21.9', '3.21.12', '9.9.9']) {
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
