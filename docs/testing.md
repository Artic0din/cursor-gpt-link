# Testing and compatibility

## Target macOS build

This tree recognizes Cursor **3.21.12** only (`05ddb9e824590e2c1db6bd2548dd71bf67ac9d20`).
Installation stays fail-closed until `scripts/capture-hashes.mjs` records darwin/arm64 hashes from an original, signature-verified Mac app.
[The 3.21.12 metadata](../src/supported-build-3.21.12.json) is still Windows upstream data and is rejected on macOS.
Older Cursor versions are not install targets. Restore of an already patched app uses the existing installation manifest rather than that version's hash file.
The minimum supported OS is macOS 26.

## Current checks

All local tests passed, covering authentication, request normalization, context and MAX picker variants, subagent registration, Explore settings, conversation actions, legacy installation roots, installation/restore failures, CLI symlinks and startup after the launching host exits.

Both links installed directly in `/Applications/Cursor.app` on an earlier Mac build, GPT first and Claude second, with an existing Apple signing identity.
Signing fixtures still verify preservation of hardened runtime and entitlements after patching and resource restoration.
The fixture uses a disposable executable and an injected test signer; production requires an available Apple identity and refuses ad-hoc signing.
The checks also reject a correctly signed Intel-only executable, leave preflight permissions unchanged and restore the recorded app mode only after restoration finishes.
Interrupted restoration keeps the app private and its recovery manifest available.
Legacy manifests without an original mode retain current permissions; official reinstallation recovers the vendor defaults.

A detached launcher owns the complete stop/start sequence on macOS. Lifecycle tests cover cold startup and replacement of an existing fixture worker after the launching process exits, plus startup and launcher failure reporting. These checks use temporary workers, not account credentials or model requests.

## Repeatable checks

```bash
npm test
node patcher.mjs status
```

Tests use synthetic data and do not make model requests.
CI runs on macOS 26 with Node.js 22, 24 and 26; those runners do not contain a real Cursor installation.

For an original supported app, run `node scripts/verify-build.mjs "/Applications/Cursor.app/Contents/Resources/app"`.
It validates hashes, generates candidates, checks syntax and invokes native routing and parameter normalization without modifying Cursor.
For 3.21.12 on a Mac, capture original files with `scripts/capture-hashes.mjs`, review the complete metadata and patch anchors, then run build verification.
Capture rejects missing files, invalid signatures and executables without arm64 support.

With the bridge running, `npm run test:attachments` makes real image and PDF requests and consumes subscription usage.
Bridge checks alone do not establish complete Cursor UI coverage.

## Cursor updates and recovery

1. Close Cursor and restore Claude before restoring GPT.
2. Restore validates every resource backup before writing and re-signs the app before reporting success.
3. Retry an interrupted restore while its manifest remains present; unknown file changes stop restoration.
4. Reinstall official Cursor to recover its vendor signature or a failed signing operation.
5. Install GPT followed by Claude on the recognized 3.21.12 Mac build once hashes exist; stale manifests are archived only after original files or a valid companion installation are verified.

Never restore old resources over a newer build or edit hashes to bypass compatibility checks.
A new Mac build needs original-file capture, a new table row and separate validation.
The six resource backups do not contain the original vendor code signature.

## Historical upstream results and remaining coverage

Earlier September 10–18 notes were inherited from the Windows implementation and from the previous 3.20.17 Mac target.
They described later Cursor builds, bridge tool calls, local and SSH file edits, image/PDF input, Explore settings, context and MAX mode, subagent lifecycle and queued follow-ups.
They do not establish macOS installer coverage for 3.21.12.
The preceding test history remains in Git.

Fresh macOS SSH file edits, live subagents, cancellation, fresh sign-in/renewal and other account layouts remain unverified.
Fast forwards `service_tier: "priority"`, but historical requests returned `default`; actual priority processing remains unverified.
