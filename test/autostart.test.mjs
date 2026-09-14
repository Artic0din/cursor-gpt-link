import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {bridgeCommandPattern, bridgeCommandPosixPattern, buildAutostart} from '../src/autostart.mjs';

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

test('bridge restart matching stays case-sensitive', () => {
  const node = '/opt/homebrew/bin/node';
  const bridge = '/Users/test/Library/Application Support/cursor-gpt-link/runtime/bridge.mjs';
  const matches = new RegExp(bridgeCommandPattern(node, bridge));
  assert.equal(matches.test(`"${node.toUpperCase()}" "${bridge}"`), false);
  assert.equal(matches.test(`"${node}" "${bridge.toUpperCase()}"`), false);
});

function ereMatches(pattern, commandLine) {
  try {
    execFileSync('grep', ['-E', '-e', pattern], {input:commandLine, stdio:['pipe', 'pipe', 'pipe']});
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    throw error;
  }
}

test('pkill pattern uses POSIX classes macOS pkill understands', () => {
  const node = '/opt/homebrew/bin/node';
  const bridge = '/Users/test/Library/Application Support/cursor-gpt-link/runtime/bridge.mjs';
  const pattern = bridgeCommandPosixPattern(node, bridge);
  assert.equal(pattern.includes('\\s'), false);
  assert.ok(pattern.includes('[[:space:]]'));
  assert.ok(ereMatches(pattern, `"${node}" "${bridge}"`));
  assert.ok(ereMatches(pattern, `${node} ${bridge}`));
  assert.equal(ereMatches(pattern, `"${node}" "${bridge}" --unrelated`), false);
  assert.equal(ereMatches(pattern, `"/other/node" "${bridge}"`), false);
});

test('autostart restarts the installed bridge with pkill on macOS', () => {
  const code = buildAutostart({nodePath:'/opt/homebrew/bin/node', bridgePath:"/Users/test/O'Brien/runtime/bridge.mjs", stateDir:"/Users/test/O'Brien"});
  assert.ok(code.includes('pkill'));
  assert.ok(code.includes('process.platform==="darwin"'));
  assert.ok(code.includes('CURSOR_GPT_LINK_HOME'));
  assert.ok(code.includes('["-f",'));
  assert.ok(code.includes('[[:space:]]'));
  assert.equal(code.includes('"-i"'), false);
  assert.equal(code.includes('\\s'), false);
  assert.equal(code.includes('powershell.exe'), false);
  assert.equal(code.includes('EncodedCommand'), false);
  assert.equal(code.includes('windowsHide'), false);
  assert.equal(code.includes('win32'), false);
});
