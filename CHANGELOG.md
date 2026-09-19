# Changelog

All notable changes to this project are documented in this file.
The format follows Keep a Changelog.

## [Unreleased]

### Added

- Targeted Cursor 3.21.12 only, with one workbench symbol row and one patch pipeline, including Explore settings, context and MAX selection, transcript refresh and queued follow-ups.
- Copied model tooltip and context-option helpers into the installed macOS bridge runtime.

### Fixed

- Filtered Explore model IDs by the ChatGPT prefix before adding them to the local catalog.
- Restored an older patched app from its existing manifest without requiring that Cursor version to still be an install target.
- Kept restore state until signing succeeds and required removal of a companion Claude patch before restoring ChatGPT.
- Rejected incomplete hash captures and fixed CLI invocation through symlinks, imports with unrelated arguments and bridge restart after the host exits.
- Recovered app roots from legacy installation manifests and kept Keychain-specific assertions on macOS.
- Checked the selected executable for Apple Silicon support and restored recorded app permissions after final removal, leaving preflight permissions unchanged.

### Changed

- Restricted installation to Cursor 3.21.12 on macOS; that version stays fail-closed until darwin/arm64 hashes are captured.
- Removed 3.20.x and earlier 3.21.x builders, hash files and feature gates.
- Patched the selected app directly, without requiring a full-app backup.
