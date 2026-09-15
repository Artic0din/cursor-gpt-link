import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bridgeCommandPosixPattern} from '../src/autostart.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-macos-regression-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  return dir;
}

test('hash capture rejects an incomplete app without printing metadata', t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({version:'3.20.17'}));
  fs.writeFileSync(path.join(dir, 'product.json'), JSON.stringify({commit:'fixture'}));
  const result = spawnSync(process.execPath, ['scripts/capture-hashes.mjs', dir], {cwd:repo, encoding:'utf8'});
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
});

test('the CLI runs through a symlink and imports with unrelated arguments', t => {
  const dir = fixture(t), link = path.join(dir, 'patcher.mjs');
  fs.symlinkSync(path.join(repo, 'patcher.mjs'), link);
  const options = {cwd:repo, encoding:'utf8', env:{...process.env, CURSOR_GPT_LINK_HOME:dir}};
  const help = spawnSync(process.execPath, [link, 'help'], options);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage:/);
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./patcher.mjs')", '--', 'importer', '--reporter', 'spec'], options);
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, '');
});

test('POSIX matching preserves literal backslashes in paths', {skip:process.platform !== 'darwin'}, () => {
  const node = String.raw`/tmp/\scratch/node`, bridge = '/tmp/bridge.mjs';
  const result = spawnSync('/usr/bin/grep', ['-E', '--', bridgeCommandPosixPattern(node, bridge)], {input:node + ' ' + bridge + '\n', encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
});
