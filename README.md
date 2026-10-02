# cursor-gpt-link

An experimental patch that adds models from your local Codex catalog to Cursor's model picker and routes them through your existing ChatGPT sign-in. It uses Cursor's local agent runtime. It does not install an extension.

This release targets Cursor 3.21.13 on macOS 26+ Apple Silicon.
It is not a general patch for every Cursor version, operating system, subscription, or model.
Windows and Linux are not supported.

## Status

| Item | Current status |
| --- | --- |
| Cursor | 3.21.13, macOS 26+ (Apple Silicon, arm64) |
| Latest Cursor commit | `e44a49c17e334d442e58bbde931d791200f014a0` (3.21.13) |
| Latest local test date | September 19, 2026; native IDE write/read-back, installation and original Mac hashes verified |
| Node.js used for testing | 26.8.2 |
| Codex CLI used for testing | 0.154.0 |
| macOS signing | Installed 3.21.13 signature, hardened runtime, entitlements and native loading checked |
| Bridge startup | Final Cursor restart automatically started both installed bridges; authenticated health checks passed |
| Reasoning selection | Forwarding verified in both local runtimes |
| IDE and Agents Window | Native IDE write/read-back passed on 3.21.13 with a ChatGPT Subscription model; Agents Window live testing is pending |
| Remote SSH sessions | Routing checked in both bundles; live macOS SSH testing is pending |
| Agent Host runtime | Shared runtime supported; independent runtime temporarily unsupported |
| Fast mode | Selector and request forwarding verified; actual priority processing not confirmed |

This fork targets Cursor **3.21.13** only.
The darwin/arm64 hashes were captured from an original signature-verified Mac app.
Older Cursor versions are not supported.
Use a local workspace with **This Mac**. Cloud, Remote Machine and **This Mac (Remote Control)** cannot reach these local bridges and remain unsupported.
With Agent Host enabled, subscription models currently require Cursor's shared execution runtime: both `cursor_agent_host_move_exec` and `agent_host_local_loop` must be off.
Independent runtime modes return a clear unsupported-mode error for subscription requests; their support is pending.
The patch preserves Cursor's runtime flags and ordinary model routes.
The installer checks the exact version, commit and all six original-file hashes before writing.
See [testing notes](docs/testing.md) for current macOS results and separately labelled upstream history.

The 3.21.13 pipeline forwards **Explore Subagent Model** selections, matches native model tooltips, connects context and MAX selection to the runtime budget, cancels active subagents with the parent chat, refreshes subagent transcripts, and forwards queued follow-ups when starting Build.
See [Context and MAX mode](docs/model-modes.md).
Local subscription subagents also receive a missing parent Task entry before Cursor waits for its registration, and empty optional subagent model selections are treated as inherited.

## What it adds

OAuth models appear with a small OpenAI symbol before their names in the model picker, in their own **ChatGPT Subscription** section. Native Cursor models stay under **Cursor Models**. If cursor-claude-link is also installed, Claude models appear under **Claude Subscription**. Install ChatGPT first and Claude second. Remove them in reverse order because both modify the same Cursor files. The list comes from your local Codex model catalog, including each model's supported reasoning levels. The patch does not ship a fixed model list or grant access to models your account cannot use.

The model picker offers reasoning levels such as Low, Medium, High, Very high and Max when the model advertises them. Fast appears when the model metadata advertises a speed tier. Each reasoning level can be combined with Fast independently. Fast is off by default.

A partial catalog refresh preserves previously seen models so entries such as Astra do not disappear just because one cache update omits them. An explicit hidden entry removes the model. The saved catalog is separated by account. A visible cached entry is not proof of current entitlement; the service still decides whether to accept a request.

Text added by this patch is English and does not follow the account language. Existing Cursor controls, including parts of the parameter popover, still use Cursor's own localization. Model descriptions come from the local catalog. The patch does not change the language of the rest of Cursor.

Cursor's **Plan & Usage** settings include a **ChatGPT Subscription** card showing the subscription plan, used allowance and reset time for each reported usage window. It refreshes every minute while the page is open. The bridge retrieves these values from ChatGPT's internal usage endpoint using the existing local sign-in. If retrieval fails, the card shows an unavailable status.

Quota errors are returned as non-retryable errors so Cursor does not remain on "Planning Next Moves" while repeatedly retrying a full usage window. HTTP 429 responses are also converted to HTTP 402 for this reason, including temporary rate limits; retry those requests manually later.

## Fast mode limitation

Fast sends `service_tier: "priority"` in the request. In our live tests, the service returned `service_tier: "default"`, including a direct request outside the bridge. Selecting Fast therefore does not currently establish that the request will run faster.

Do not assume a fixed twofold speed increase or a fixed usage multiplier. Availability, processing speed and subscription usage depend on the model and account. See OpenAI's [speed documentation](https://learn.chatgpt.com/docs/agent-configuration/speed). The selector tooltip explains the limitation as well.

## Requirements

* macOS 26 or newer on an Apple Silicon (arm64) Mac and the exact Cursor 3.21.13 build listed above.
  The machine architecture is detected through Rosetta, so an Intel Node.js running under translation is accepted.
* Node.js 22 or newer on PATH.
* A Codex executable and a ChatGPT account with access to the requested models.
* Existing file-based Codex authentication in `auth.json` and a populated `models_cache.json` in the same Codex home.
* A Cursor app owned by your macOS user and an existing Apple signing identity in Keychain.

This release reads file-based Codex authentication only. It does not read the macOS Keychain or import browser cookies. API-key-only authentication is not supported. Refer to OpenAI's [authentication documentation](https://learn.chatgpt.com/docs/auth) for sign-in and credential storage options.

## Install

Clone this repository into a local directory, then open a terminal there:

```bash
git clone https://github.com/Artic0din/cursor-gpt-link.git
cd cursor-gpt-link
node patcher.mjs check
```

If you have not signed in, run `codex login` and complete the ChatGPT sign-in. Open Codex once so it refreshes its model catalog. There are no npm dependencies to install.

Run `security find-identity -v -p codesigning` and set `CURSOR_MACOS_SIGN_IDENTITY` to the 40-character SHA-1 of the Apple identity to use.
The selection is saved locally for later restoration.
Close all Cursor windows and background processes, then run:

```bash
npm run install-patch
```

This is equivalent to `node patcher.mjs install`. Install on original supported Cursor files. If a Claude patch is already present, restore it with its own installer first, install ChatGPT, then install Claude again.

Start Cursor again and select a model with the OpenAI symbol. The bridge starts with Cursor and listens only on `127.0.0.1`. On macOS, startup replaces the existing worker for this exact bridge installation so code changes take effect. Other Node.js processes and bridge installations are not selected. A `ChatGPT: Sign in (subscription)` command is also added to the command palette. If that command does not open a browser, use `codex login` in a terminal.

The installer detects the standard macOS Cursor locations. It looks for the Codex desktop executable, then for `codex` on PATH. For other locations:

```bash
node patcher.mjs install --cursor-root "/Applications/Cursor.app/Contents/Resources/app" --codex-path "/opt/homebrew/bin/codex" --codex-home "$HOME/MyCodexHome" --port 43187
```

`--cursor-root` must point to `Contents/Resources/app` inside `Cursor.app`, not the `Cursor.app` bundle itself. `--codex-path` must resolve to the `codex` executable.

Configuration, a copy of the bridge runtime, model catalogs and original-file backups are stored in `~/Library/Application Support/cursor-gpt-link`. Set `CURSOR_GPT_LINK_HOME` before running the patcher to choose a different state directory. Use the same value for subsequent status and restore commands. The runtime is copied during installation, so moving the repository afterwards does not break autostart. The Node.js executable must stay at its installation path.

The installer patches the selected app directly; it does not make a full-app copy.
It signs the native binaries and app bundle with the selected Apple identity while preserving entitlements and hardened-runtime flags.
Signature verification and an Electron native-loading check must pass before installation succeeds.
The app and state directory are restricted to their owner because patched bundles contain local bridge keys.
App preflight leaves permissions unchanged; the restriction is applied only when the prepared patch is written.

## This Mac (Remote Control)

Remote Control runs on this computer, but Cursor registers those agents through its cloud agent service so other devices can control them.
That service rejects `chatgpt-codex/` model IDs (`BAD_MODEL_NAME`) and cannot reach the local bridge.
Rerouting to the local repository would drop the cloud registration and silently turn the run into a plain **This Mac** agent.
Instead, the patch stops a subscription-model submit on Remote Control with an error that points to **This Mac**.
Cursor-native models on Remote Control are unchanged.

## Remote SSH

The inherited Remote SSH routing sends model requests through Cursor's dedicated local runtime to the bridge on your Mac.
Tool calls use Cursor's existing workspace execution path, so file edits and commands still run on the SSH host.
The existing approval and cancellation paths are retained.

The remote host does not need Codex CLI, a ChatGPT sign-in, copied account credentials or a forwarded bridge port. Use your existing local sign-in and reload the SSH window after applying the patch.

The earlier patch ran model requests in the workspace extension host.
In an SSH session that process runs on the remote machine, where `127.0.0.1` refers to that machine rather than your Mac.
This patch selects Cursor's dedicated local runtime for ChatGPT models in remote workspaces.
Other models retain their existing runtime selection.

Both workbench routing methods passed synthetic checks against the supported Mac build.
Earlier upstream SSH file-edit reports came from Windows; fresh macOS SSH testing is pending.

To upgrade an existing public installation, close Cursor, run `node patcher.mjs restore` using the same state directory, update this repository with `git pull`, then run `node patcher.mjs install`. For a private prototype, use its original restore command first.

## Check or remove the patch

```bash
node patcher.mjs status
```

To remove only this ChatGPT patch, close Cursor and run:

```bash
npm run uninstall
```

This is equivalent to `node patcher.mjs restore`. If Claude is also installed, remove it first with `npm run uninstall` in its repository. Then remove ChatGPT. Backups restore the state before each patch; removing the underlying patch first can invalidate the other installation manifest.

Restore validates the six file backups, restores those resources, and signs the app again before reporting success.
It retains recovery state if signing fails, so restoration can be retried.
New manifests record the original app permissions and restore them after final removal.
Older manifests without this record retain the current permissions until official reinstallation.
These file backups do not restore the vendor's original code signature; reinstall official Cursor for that.
If signing is interrupted or an update replaces the application, reinstall the supported official Cursor build and run the installers again, GPT first and Claude second.
Installation archives stale state only after verifying the freshly installed original files.
The patcher has no force option.

Restoring removes the autostart code. An already running bridge can remain until it is stopped or macOS is restarted. It accepts requests only with its local key. You can inspect its process command line for the `cursor-gpt-link/runtime/bridge.mjs` path before stopping that process. The patcher does not stop unrelated Node.js processes.

Cursor updates can remove this patch. New builds need separate review, new anchors and new verification. Do not change the supported version number to bypass the checks.

If you used an earlier private prototype, restore it using its own installer before installing this release. Its backups and state are separate.

## How it works

The patch changes the desktop workbench, the Agents Window workbench, both local agent runtime bundles, the main-process startup file and the corresponding workbench checksum in `product.json`.

Only model IDs beginning with `chatgpt-codex/` use the bridge. Cursor continues to run its local agent and handle tools and approvals. The bridge translates the request into the streaming Responses format and sends it to `https://chatgpt.com/backend-api/codex/responses`. This is an internal service endpoint, not a supported public integration contract.
Regular, resumed and summarized ChatGPT turns select Cursor's local client even when Agent Host is enabled.
Other model selections retain their existing execution strategy.
The native workspace execution provider remains available alongside Agent Host so subscription requests and their tools can start.

Codex is used for sign-in and token renewal, not as the agent harness. The bridge reads the existing access token and account ID and asks Codex to refresh authentication after an unauthorized response. It does not implement a separate OAuth client or bundle anyone's credentials.

Prompts, attachments and tool data in the forwarded request are sent to OpenAI. The bridge does not add request logging. Account credentials are not inserted into Cursor bundles; a generated local bridge key is inserted instead. Local programs running as your user can read that key and the state directory. Do not share your state directory, patched bundles, authentication files or backups.

## Attachments

The Responses request preserves image and file content, including PDFs. Vision support in the picker follows the account's model catalog. Image color recognition and PDF content reading were verified through the local subscription bridge on September 11, 2026. Cursor controls which attachment formats reach the runtime; this does not add every upload feature from the ChatGPT website.

The bridge accepts requests up to 64 MiB including JSON and base64 overhead. Provider file-size and model-context limits still apply. Files remain in memory for forwarding; the bridge does not add an upload cache or fetch local paths.

Run `npm run test:attachments` against an installed bridge to repeat the image and PDF checks. It consumes subscription usage and uses the same `CURSOR_GPT_LINK_HOME` as the installer.

## Limitations

* Live macOS SSH responses and file edits remain unverified; both workbench routing methods have synthetic coverage.
* Only the listed macOS 26+ (Apple Silicon) client build is supported. Windows and Linux clients, Cloud, and Remote Machine are unsupported.
* Later Cursor versions are unsupported until this tree gains reviewed patch anchors, Mac hashes and verification for the new build.
* Native IDE tool calls and file edits passed on macOS. Agents Window, approvals and cancellation still need separate live checks.
* Authentication formats, model metadata and the internal endpoint can change independently of Cursor.
* The bridge uses Codex's local model cache. After switching accounts, open Codex to refresh its cache and reload the Cursor window. A stale cache may temporarily show models the new account cannot use.
* Initial model entries are embedded when installing. Refreshing the picker normally replaces them with the bridge catalog; an unavailable bridge can leave stale entries visible.
* The bridge is a Responses adapter, not an implementation of every OpenAI API feature. Voice, video, image generation and every model-specific feature have not been validated.

## Development

```bash
npm test
node scripts/verify-build.mjs "/Applications/Cursor.app/Contents/Resources/app"
```

Unit tests use synthetic credentials and model data and do not make requests to OpenAI.
The optional build verification reads original Cursor files locally, validates hashes, generates candidates, checks syntax and exercises reasoning and Fast forwarding without modifying Cursor.
For a new supported build, run `node scripts/capture-hashes.mjs` with its original `Contents/Resources/app` path, review and copy the complete output into the matching metadata, then run build verification.
Capture rejects incomplete apps, invalid signatures and executables without arm64 support; it also accepts an Intel Node process running through Rosetta on an Apple Silicon Mac.
No Cursor binaries, bundled source, model caches or account files are distributed here.

When reporting a problem, include your Cursor version and commit, operating system, Node.js version and a redacted error message. Do not attach `auth.json`, `config.json`, model caches, patched application files or backup directories.

## Legal Disclaimer & Terms of Service Notice

- **Educational & PoC Only:** This project is an independent open-source proof-of-concept for educational purposes.
- **No Affiliation:** This project is not affiliated with, maintained, sponsored, or endorsed by Anysphere (Cursor) or OpenAI.
- **Use at Your Own Risk:** Modifying software binaries or patching client environments may violate the Terms of Service of Cursor and/or OpenAI.
- **Account Safety:** The maintainers are not responsible for suspended accounts, lost access, or any damages caused by using this patch.

## License

The patcher and bridge source are provided under the [MIT license](LICENSE). That license does not apply to Cursor, Codex or OpenAI services. See [third-party notices](THIRD_PARTY_NOTICES.md) for the icon source.
