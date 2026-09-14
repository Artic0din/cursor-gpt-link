import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildPatches} from './src/patches.mjs';
import {supportedBuild} from './src/supported-builds.mjs';
import {installFiles, restoreFiles, hash} from './src/installation.mjs';
import {stateDir, configPath} from './src/config.mjs';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
let build;
const manifestPath = path.join(stateDir, 'installed.json');
const args = process.argv.slice(2);
const command = args.shift() || 'help';
const options = {};
while (args.length) {
  const flag = args.shift();
  if (!['--cursor-root', '--codex-path', '--codex-home', '--port'].includes(flag) || !args.length || args[0].startsWith('--')) {
    throw new Error('Unknown or incomplete option: ' + flag);
  }
  options[flag.slice(2)] = args.shift();
}

function cursorRoot() {
  const candidates = options['cursor-root'] ? [options['cursor-root']] : [
    '/Applications/Cursor.app/Contents/Resources/app',
    path.join(os.homedir(), 'Applications/Cursor.app/Contents/Resources/app')
  ];
  const root = candidates.find(p => fs.existsSync(path.join(p, 'package.json')));
  if (!root) throw new Error('Cursor not found. Pass --cursor-root with the Cursor Resources/app directory.');
  return path.resolve(root);
}

export function macosMajorVersion() {
  const output = execFileSync('sw_vers', ['-productVersion'], {encoding:'utf8'}).trim();
  const major = Number(output.split('.')[0]);
  if (!Number.isInteger(major)) throw new Error('Cannot determine the macOS version from: ' + output);
  return major;
}

export function osMinimumMajor(manifest = build) {
  const major = Number(String(manifest?.osMinimum ?? '').split('.')[0]);
  if (!Number.isInteger(major) || major <= 0) throw new Error('Supported build is missing a valid osMinimum.');
  return major;
}

export function machineArch() {
  // process.arch reports the Node runtime, which is x64 when an Intel Node
  // runs under Rosetta on Apple Silicon. sysctl sees through translation:
  // proc_translated is 1 only inside a translated process, and
  // hw.optional.arm64 is 1 on every Apple Silicon Mac.
  try {
    if (execFileSync('sysctl', ['-n', 'sysctl.proc_translated'], {encoding:'utf8'}).trim() === '1') return 'arm64';
  } catch {}
  try {
    const arm64 = execFileSync('sysctl', ['-n', 'hw.optional.arm64'], {encoding:'utf8'}).trim();
    if (arm64 === '1') return 'arm64';
    if (arm64 === '0') return 'x64';
  } catch {}
  return process.arch;
}

export function appBundlePath(root) {
  const bundle = path.dirname(path.dirname(path.dirname(path.resolve(root))));
  if (path.extname(bundle) !== '.app' || !fs.existsSync(bundle)) throw new Error('Cannot locate the Cursor.app bundle for ' + root + '. Re-sign it manually: codesign --force --deep --sign - <Cursor.app>.');
  return bundle;
}

function resignAppBundle(root) {
  const bundle = appBundlePath(root);
  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', bundle], {stdio:'pipe'});
  } catch (error) {
    throw new Error('Patched files are installed but re-signing ' + bundle + ' failed. Restore with node patcher.mjs restore, then re-sign manually: codesign --force --deep --sign - ' + bundle);
  }
  console.log('Re-signed ' + bundle + ' (ad-hoc) so Gatekeeper accepts the patched bundle.');
}

function validate(root) {
  build=supportedBuild(root);
  if (process.platform !== 'darwin' || build.platform !== 'darwin') {
    throw new Error('Only macOS 26+ (Apple Silicon) is supported by this release.');
  }
  if (machineArch() !== 'arm64' || build.arch !== 'arm64') {
    throw new Error('Only macOS 26+ (Apple Silicon) is supported by this release.');
  }
  const minimum = osMinimumMajor();
  let major;
  try {
    major = macosMajorVersion();
  } catch {
    throw new Error('Only macOS ' + minimum + '+ (Apple Silicon) is supported by this release.');
  }
  if (major < minimum) {
    throw new Error('Only macOS ' + minimum + '+ (Apple Silicon) is supported by this release. Detected macOS ' + major + '.');
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const product = JSON.parse(fs.readFileSync(path.join(root, 'product.json'), 'utf8'));
  if (pkg.version !== build.version || product.commit !== build.commit) {
    throw new Error('Unsupported Cursor build. Expected ' + build.version + ' (' + build.commit + ').');
  }
  for (const [relative, expected] of Object.entries(build.files)) {
    const bytes = fs.readFileSync(path.join(root, relative));
    if (hash(bytes) === expected) continue;
    throw new Error('Original file does not match the reviewed macOS build: ' + relative + '. Restore existing patches first, or record fresh macOS hashes with node scripts/capture-hashes.mjs.');
  }
}

function codexPath() {
  if (options['codex-path']) {
    const selected = path.resolve(options['codex-path']);
    if (!fs.existsSync(selected) || path.basename(selected) !== 'codex') throw new Error('--codex-path must point to the codex executable.');
    if (/\.exe$/i.test(selected)) throw new Error('--codex-path must point to the macOS codex executable, not codex.exe.');
    return selected;
  }
  for (const candidate of [
    '/Applications/Codex.app/Contents/MacOS/codex',
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
    path.join(os.homedir(), '.codex', 'bin', 'codex')
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  try {
    const found = execFileSync('which', ['codex'], {encoding:'utf8'}).trim().split(/\r?\n/)[0];
    if (found && fs.existsSync(found)) return found;
  } catch {}
  throw new Error('Codex executable not found. Pass --codex-path with the path to codex.');
}

function requireClosedCursor() {
  try {
    execFileSync('pgrep', ['-x', 'Cursor'], {encoding:'utf8', stdio:'pipe'});
  } catch (error) {
    if (error?.status === 1) return;
    throw error;
  }
  throw new Error('Close all Cursor windows and background processes before installing or restoring.');
}

async function availablePort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error('Loopback port is already in use. Stop the old bridge or choose --port.')));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

async function prepare(root, cfg) {
  const {pickerModels} = await import('./src/bridge.mjs');
  const models = pickerModels();
  if (!models.length) throw new Error('No models found. Sign in and open Codex once to refresh its model catalog.');
  return buildPatches({root, cfg, models, nodePath:process.execPath,
    bridgePath:path.join(stateDir, 'runtime/bridge.mjs'), stateDir});
}

async function main() {
  if (command === 'help' || command === '--help') {
    console.log(`Usage: node patcher.mjs <check|install|status|restore> [options]

  --cursor-root PATH   Cursor resources/app directory (detected by default)
  --codex-path PATH    Codex executable used for sign-in and token renewal
  --codex-home PATH    Existing Codex home containing auth.json and models_cache.json
  --port NUMBER        Loopback port (default 43187)

State and backups: ${stateDir}
Set CURSOR_GPT_LINK_HOME before running to override that directory.
check verifies the original build without changing Cursor files.
Close Cursor before install or restore. See README.md for requirements.`);
    return;
  }
  if (command === 'status') {
    if (!fs.existsSync(manifestPath)) { console.log('No installation recorded in ' + stateDir); return; }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const valid = manifest.files.every(f => fs.existsSync(f.path) && hash(fs.readFileSync(f.path)) === f.patchedHash);
    console.log('Cursor ' + manifest.version + ': ' + (valid ? 'patched files verified' : 'files changed; possibly updated or installation incomplete'));
    if (!valid) process.exitCode = 1;
    return;
  }
  if (command === 'restore') {
    requireClosedCursor();
    restoreFiles(manifestPath);
    console.log('ChatGPT patch removed. Backups retained.');
    const claudeDir=[path.join(sourceDir,'../cursor-claude-link'),path.join(os.homedir(),'cursor-claude-link')].find(dir=>fs.existsSync(path.join(dir,'install.mjs')));
    if(claudeDir)console.log('If Claude models disappear, run npm run install:patch in '+path.resolve(claudeDir));
    return;
  }
  if (!['check', 'install'].includes(command)) throw new Error('Unknown command: ' + command);
  const root = cursorRoot();
  validate(root);
  if (command === 'check') { console.log('Supported original Cursor ' + build.version + ' build verified.'); return; }
  requireClosedCursor();
  if (fs.existsSync(manifestPath)) throw new Error('Installation already recorded. Use status or restore first.');
  const port = Number(options.port || 43187);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be an integer between 1024 and 65535.');
  await availablePort(port);
  const cfg = {port, key:crypto.randomBytes(32).toString('hex'), codex:codexPath(),
    codexHome:path.resolve(options['codex-home'] || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'))};
  fs.mkdirSync(stateDir, {recursive:true});
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), {mode:0o600});
  // The bridge module is imported only after writing configuration.
  // config.mjs was loaded earlier, so update the shared object before importing it.
  const {config} = await import('./src/config.mjs');
  Object.assign(config, cfg);
  const pending = await prepare(root, cfg);
  const backupDir = path.join(stateDir, 'backups', build.version + '-' + Date.now());
  fs.mkdirSync(backupDir, {recursive:true});
  for (let n = 0; n < pending.length; n++) {
    const file = pending[n];
    if (!file.path.endsWith('.js')) continue;
    const candidate = path.join(backupDir, 'candidate-' + n + '.mjs');
    fs.writeFileSync(candidate, file.content);
    execFileSync(process.execPath, ['--check', candidate], {stdio:'pipe'});
    fs.unlinkSync(candidate);
  }
  const runtime = path.join(stateDir, 'runtime');
  fs.mkdirSync(runtime, {recursive:true});
  for (const name of ['bridge.mjs', 'config.mjs', 'openai-icon.mjs']) fs.copyFileSync(path.join(sourceDir, 'src', name), path.join(runtime, name));
  installFiles(pending, {backupDir, manifestPath, version:build.version, commit:build.commit});
  // Patching JavaScript under Contents invalidates the bundle seal, so
  // Gatekeeper can reject Cursor as damaged. Re-sign ad-hoc after writing.
  resignAppBundle(root);
  console.log('Installed. Start Cursor and select a model with the OpenAI symbol.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
