import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {supportedBuild} from '../src/supported-builds.mjs';

test('historical Windows manifests cannot be mistaken for verified Mac builds', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-build-test-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  for (const version of ['3.20.7', '3.20.11', '3.20.21', '3.20.23', '3.21.1', '3.21.9', '3.21.12']) {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version}));
    assert.throws(() => supportedBuild(root), /no verified macOS arm64 metadata/);
  }
});

test('unknown Cursor versions remain unsupported', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-unknown-build-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version:'9.9.9'}));
  assert.throws(() => supportedBuild(root), /Unsupported Cursor version/);
});
