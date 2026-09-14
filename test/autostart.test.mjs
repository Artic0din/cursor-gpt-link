import test from 'node:test';
import assert from 'node:assert/strict';
import {bridgeCommandPattern, buildAutostart} from '../src/autostart.mjs';

test('bridge restart matches only the exact Node executable and installed bridge', () => {
  const node = '/opt/homebrew/bin/node';
  const bridge = '/Users/test/Library/Application Support/cursor-gpt-link/runtime/bridge.mjs';
  const matches = new RegExp(bridgeCommandPattern(node, bridge));
  assert.ok(matches.test(`"${node}" "${bridge}"`));
  assert.ok(matches.test(`"${node}" ${bridge}`));
  assert.equal(matches.test(`"${node}" "${bridge}.other"`), false);
  assert.equal(matches.test(`"${node}" "${bridge}" --unrelated`), false);
  assert.equal(matches.test(`"/other/node" "${bridge}"`), false);
  assert.equal(matches.test(`"${node}" "/Users/test/AnotherInstall/runtime/bridge.mjs"`), false);
});

test('autostart restarts the installed bridge with pkill on macOS', () => {
  const code = buildAutostart({nodePath:'/opt/homebrew/bin/node', bridgePath:"/Users/test/O'Brien/runtime/bridge.mjs", stateDir:"/Users/test/O'Brien"});
  assert.ok(code.includes('pkill'));
  assert.ok(code.includes('process.platform==="darwin"'));
  assert.ok(code.includes('CURSOR_GPT_LINK_HOME'));
  assert.ok(code.includes('["-f",'));
  assert.equal(code.includes('"-i"'), false);
  assert.equal(code.includes('powershell.exe'), false);
  assert.equal(code.includes('EncodedCommand'), false);
  assert.equal(code.includes('windowsHide'), false);
  assert.equal(code.includes('win32'), false);
});
