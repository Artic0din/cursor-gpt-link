# Testing and compatibility

## Verified macOS build

The September 15, 2026 checks used macOS 27.0 on Apple Silicon, Node.js 25.2.1 and Cursor 3.20.17.
The exact Cursor commit is `0c32194e3fb5ffaced9fb36430b860ec301e1fc0`.
The minimum supported OS is macOS 26; live application checks were performed on macOS 27.
Codex CLI 0.154.0 was signed into ChatGPT.

[The 3.20.17 metadata](../src/supported-build-3.20.17.json) records six hashes captured from the original, signature-verified Mac application.
The 3.20.11 and 3.20.7 metadata, and the later 3.20.21 through 3.21.12 files, describe Windows bundles and are rejected on macOS.
A matching version label alone is insufficient to establish compatibility.

## Current checks

All local tests passed, covering authentication, request normalization, context and MAX picker variants, subagent registration, Explore settings, conversation actions, legacy installation roots, installation/restore failures, CLI symlinks and startup after the launching host exits.
Native build verification passed for both workbenches, both runtime parameter normalizers, SSH resource/cancellation forwarding, startup code and the workbench checksum.

Both links installed directly in `/Applications/Cursor.app`, GPT first and Claude second, with an existing Apple signing identity.
Strict signature verification, Electron native loading and both installation manifests passed after combined installation.
Both bridge workers started automatically with Cursor and appeared in the native model picker.
Cloud agents are unsupported: use a local workspace and the This Mac environment.

Signing fixtures verify preservation of hardened runtime and entitlements after patching and resource restoration.
The fixture uses a disposable executable and an injected test signer; production requires an available Apple identity and refuses ad-hoc signing.
The checks also reject a correctly signed Intel-only executable, leave preflight permissions unchanged and restore the recorded app mode only after restoration finishes.
Interrupted restoration keeps the app private and its recovery manifest available.
Legacy manifests without an original mode retain current permissions; official reinstallation recovers the vendor defaults.
No full-app backup is required; six resource backups and recovery manifests are retained.

Combined removal was tested on the real app: GPT refused removal before Claude, Claude restoration preserved GPT, and final GPT restoration recovered all six original resource hashes.
Both restoration steps passed strict signature verification and native loading.

GPT-5.6 Luna completed a native IDE file edit and read-back in a disposable local folder.
The file contained exactly `GPT_NATIVE_OK` followed by a newline.

A detached launcher owns the complete stop/start sequence on macOS. Lifecycle tests cover cold startup and replacement of an existing fixture worker after the launching process exits, plus startup and launcher failure reporting. These checks use temporary workers, not account credentials or model requests.

## Later Cursor patch definitions

The macOS installer still only accepts Cursor 3.20.17.
The following later versions have reviewed patch definitions and Windows hash files from upstream. They cannot be installed until `scripts/capture-hashes.mjs` records a matching original Mac app:

| Cursor | Commit | Patch file |
| --- | --- | --- |
| 3.20.21 | `f09fca384ceca23f7bf21f9c23655b162641d740` | [patches-3.20.21.mjs](../src/patches-3.20.21.mjs) |
| 3.20.23 | `b23e0e2d3c0fc9bb9311f4390230a120ccc9aa50` | [patches-3.20.23.mjs](../src/patches-3.20.23.mjs) |
| 3.21.1 | `74f717017ddcbf0554cd8c91ec7e2fb56983a070` | [patches-3.21.1.mjs](../src/patches-3.21.1.mjs) |
| 3.21.9 | `9998796a6096ce83d83a9332bfe7473b985db750` | [patches-3.21.9.mjs](../src/patches-3.21.9.mjs) |
| 3.21.12 | `05ddb9e824590e2c1db6bd2548dd71bf67ac9d20` | [patches-3.21.12.mjs](../src/patches-3.21.12.mjs) |

Those later files include Explore model forwarding, native tooltips, context and MAX budgets, subagent lifecycle and transcript refresh, queued follow-ups and Plan-to-Build message preservation. 3.21.1 and later also re-derive rotated workbench and runtime symbols. Unit tests cover those helpers; they do not install a later Mac Cursor build.

## Repeatable checks

```bash
npm test
node patcher.mjs status
```

Tests use synthetic data and do not make model requests.
CI runs on macOS 26 with Node.js 22, 24 and 26; those runners do not contain a real Cursor installation.

For an original supported app, run `node scripts/verify-build.mjs "/Applications/Cursor.app/Contents/Resources/app"`.
It validates hashes, generates candidates, checks syntax and invokes native routing and parameter normalization without modifying Cursor.
For a new build, capture its original files with `scripts/capture-hashes.mjs`, review the complete metadata and patch anchors, then run build verification.
Capture rejects missing files, invalid signatures and executables without arm64 support.

With the bridge running, `npm run test:attachments` makes real image and PDF requests and consumes subscription usage.
Bridge checks alone do not establish complete Cursor UI coverage.

## Cursor updates and recovery

1. Close Cursor and restore Claude before restoring GPT.
2. Restore validates every resource backup before writing and re-signs the app before reporting success.
3. Retry an interrupted restore while its manifest remains present; unknown file changes stop restoration.
4. Reinstall official Cursor to recover its vendor signature or a failed signing operation.
5. Install GPT followed by Claude on the recognized build; stale manifests are archived only after original files or a valid companion installation are verified.

Never restore old resources over a newer build or edit hashes to bypass compatibility checks.
A new Mac build needs original-file capture, anchor review and separate validation.
The six resource backups do not contain the original vendor code signature.

## Historical upstream results and remaining coverage

Earlier September 10–18 notes were inherited from the Windows implementation.
They described later Cursor builds, bridge tool calls, local and SSH file edits, image/PDF input, Explore settings, context and MAX mode, subagent lifecycle and queued follow-ups.
They do not establish macOS installer, GUI, authentication renewal or SSH coverage for those later builds.
The preceding test history remains in Git.

Fresh macOS SSH file edits, live subagents, cancellation, fresh sign-in/renewal and other account layouts remain unverified.
Fast forwards `service_tier: "priority"`, but historical requests returned `default`; actual priority processing remains unverified.
