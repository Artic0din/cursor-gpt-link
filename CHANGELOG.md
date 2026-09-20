# Changelog

All notable changes to this project are documented in this file.
The format follows Keep a Changelog.

## [Unreleased]

### Added

- Added Cursor 3.21.13 support on Apple Silicon with verified original Mac hashes and refreshed native model picker, subscription usage and subagent symbols.
- Targeted one Cursor build with one workbench symbol row and one patch pipeline, including Explore settings, context and MAX selection, transcript refresh and queued follow-ups.
- Copied model tooltip and context-option helpers into the installed macOS bridge runtime.

### Fixed

- Routed ChatGPT turns through the local bridge in Cursor's shared Agent Host runtime, including resumed and summarized conversations, while retaining other models' existing execution strategy.
- Registered Cursor's native execution provider during the shared Agent Host activation while retaining its context, dependencies and cleanup ownership.
- Reported unsupported independent Agent Host modes immediately for subscription requests, without starting a second runtime or changing ordinary model routes.
- Passed the renderer's required feature-gate options when checking subscription runtime compatibility.
- Filtered Explore model IDs by the ChatGPT prefix before adding them to the local catalog.
- Updated local build-verification fixtures to use subscription-prefixed Explore models and the native `modelId` catalog field, while checking that foreign-provider models remain inherited.
- Restored an older patched app from its existing manifest without requiring that Cursor version to still be an install target.
- Kept restore state until signing succeeds and required removal of a companion Claude patch before restoring ChatGPT.
- Rejected incomplete hash captures and fixed CLI invocation through symlinks, imports with unrelated arguments and bridge restart after the host exits.
- Recovered app roots from legacy installation manifests and kept Keychain-specific assertions on macOS.
- Checked the selected executable for Apple Silicon support and restored recorded app permissions after final removal, leaving preflight permissions unchanged.

### Changed

- Restricted installation to the reviewed Cursor 3.21.13 Mac build and rejected different commits before patching.
- Removed 3.20.x and earlier 3.21.x builders, hash files and feature gates.
- Patched the selected app directly, without requiring a full-app backup.
