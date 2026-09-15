# Changelog

All notable changes to this project are documented in this file.
The format follows Keep a Changelog.

## [Unreleased]

### Fixed

- Enabled installation in Cursor 3.20.17 on macOS Apple Silicon with verified Mac hashes and Apple code signing that preserves hardened runtime and entitlements.
- Kept restore state until signing succeeds and required removal of a companion Claude patch before restoring ChatGPT.
- Rejected incomplete hash captures and fixed CLI invocation through symlinks, imports with unrelated arguments and bridge restart after the host exits.
- Recovered app roots from legacy installation manifests and kept Keychain-specific assertions on macOS.
- Checked the selected executable for Apple Silicon support and restored recorded app permissions after final removal, leaving preflight permissions unchanged.

### Changed

- Restricted installation to the verified macOS build; retained Windows metadata is explicitly unsupported on Mac.
- Patched the selected app directly, without requiring a full-app backup.
