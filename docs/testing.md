# Testing and compatibility

## Target macOS build

This tree recognizes Cursor **3.21.13** only (`e44a49c17e334d442e58bbde931d791200f014a0`).
[The Mac metadata](../src/supported-build-3.21.13.json) contains all six original-file hashes captured with `scripts/capture-hashes.mjs` from a signature-verified arm64 app on September 19, 2026.
Older Cursor versions are not install targets. Restore of an already patched app uses the existing installation manifest rather than that version's hash file.
The minimum supported OS is macOS 26.

## Current checks

All 108 local tests passed with Node.js 26.8.2, covering authentication, request normalization, context and MAX picker variants, subagent registration, Explore settings, conversation actions, Remote Control createAgent routing, legacy installation roots, installation/restore failures, CLI symlinks and startup after the launching host exits.
The new-build acceptance test first reproduced rejection of 3.21.13 and now verifies that the captured build is recognized while a different commit is rejected.
`node patcher.mjs check` verified the original installed 3.21.13 Mac app without modifying it.
`node scripts/verify-build.mjs` generated all six patch candidates and passed syntax, unique-anchor and workbench-checksum checks.
It exercised both workbench surfaces and runtimes for subscription settings, login registration, routing, Explore selection, Task registration, subagent cancellation and transcripts, queued conversation actions, context/MAX and reasoning/Fast forwarding.
AgentCompat regression tests reproduced the injected Agent Host strategy bypassing ChatGPT's local client, then verified per-model routing across regular, resumed and summarized turns.
The actual generated constructor and native strategy preserve request argument identity, while unit checks preserve cancellation, errors, return values, host disposal and ordinary/default model dispatch.
Provider-activation regressions cover all combinations of `cursor_agent_host_move_exec` and `agent_host_local_loop`, plus Agent Host disabled.
Shared host-owned initialization retains its exact context, runtime extension path, optional git/MCP dependencies and cleanup ownership.
The patch does not start the legacy runtime when either independent-mode gate is on, avoiding duplicate commands and singleton providers.
Subscription requests in those independent modes reject before local execution; ordinary/default models keep their injected strategy and null/undefined strategies retain the native fallback.
These regressions first failed for unintended legacy initialization and absent independent-mode rejection, then passed with the bounded shared-runtime patch.
The routing verifier executes the bundle's actual renderer `ExperimentService.checkFeatureGate` method, reproduces its missing-options `TypeError`, and checks both gate calls with the required options object.
The shared provider patch is applied once when both subscription links are installed.
On September 19, 2026, native Cursor 3.21.13 IDE validation passed with a Codex model from **ChatGPT Subscription**, with High reasoning effort and a displayed 272K context window.
The native Write tool created `gpt-bridge-smoke.txt` in a temporary local workspace with exactly `GPT_32113_OK\n`; the native Read tool read line 1 and the final reply was `GPT_32113_OK`.
An independent disk read confirmed the exact file bytes.
Cursor's startup log confirmed the shared Agent Host runtime with move-exec off.
This verifies a native local IDE tool round trip; Agents Window, SSH and live subagent checks remain pending.

Independent Agent Host execution remains a temporary compatibility limitation.
Subscription support currently requires both independent-mode gates off when Agent Host is enabled; the patch does not change those flags.

Both links installed directly in `/Applications/Cursor.app` on Cursor 3.21.13, GPT first and Claude second, with an existing Apple signing identity.
Installed patch statuses, the app signature, native loading and authenticated bridge health checks passed after the final installation.
The final Cursor restart automatically started both installed bridges after the previous listeners exited, using the configured Node.js 26.8.2 executable and the generated startup launchers.
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
For a new Mac build, capture original files with `scripts/capture-hashes.mjs` and copy its JSON into `src/supported-build-<version>.json` with the captured macOS metadata.
Update `CURSOR_VERSION` and the workbench symbols in `src/patch-symbols.mjs`, and register the matching version builder in `src/patches.mjs` before running verification.
Review the complete metadata and patch anchors, then run build verification before claiming support for that build.
Capture rejects missing files, invalid signatures and executables without arm64 support.

With the bridge running, `npm run test:attachments` makes real image and PDF requests and consumes subscription usage.
Bridge checks alone do not establish complete Cursor UI coverage.

## Cursor updates and recovery

1. Close Cursor and restore Claude before restoring GPT.
2. Restore validates every resource backup before writing and re-signs the app before reporting success.
3. Retry an interrupted restore while its manifest remains present; unknown file changes stop restoration.
4. Reinstall official Cursor to recover its vendor signature or a failed signing operation.
5. Install GPT followed by Claude on the recognized 3.21.13 Mac build; stale manifests are archived only after original files or a valid companion installation are verified.

Never restore old resources over a newer build or edit hashes to bypass compatibility checks.
A new Mac build needs original-file capture, a new table row and separate validation.
The six resource backups do not contain the original vendor code signature.

## Historical upstream results and remaining coverage

Earlier September 10–18 notes were inherited from the Windows implementation and from the previous 3.20.17 Mac target.
They described later Cursor builds, bridge tool calls, local and SSH file edits, image/PDF input, Explore settings, context and MAX mode, subagent lifecycle and queued follow-ups.
They do not establish macOS installer coverage for 3.21.13.
The preceding test history remains in Git.

Fresh macOS SSH file edits, live subagents, cancellation, fresh sign-in/renewal and other account layouts remain unverified.
Fast forwards `service_tier: "priority"`, but historical requests returned `default`; actual priority processing remains unverified.
