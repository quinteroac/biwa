# Changelog

All notable changes are tracked here. The project uses semantic-versioning language even before a public package is published.

## Unreleased

### Added

- Unified `TagParser` used by runtime and validation.
- `doctor` command for config, data, asset and Ink reference validation.
- Recursive data indexes in dev and build.
- Visual save/load snapshots for scene, characters, audio and locale.
- Persistent `VolumeController` with mute support.
- Scene variants, background fit/position/poster handling and renderer fallbacks.
- Typed component override slots for `mountVnApp` and `VnStage`.
- Static ESM distribution build with import map, manifest and smoke checks.
- `smoke-fixture` game for CI-friendly validation.
- Public docs for first game, Ink tags, customization and distribution.
- Typed engine event map and public `GameEngine` API docs.
- Structured diagnostics with suppressions and build-manifest output.
- Browser E2E smoke test for the static `smoke-fixture` build.
- `AudioManager` runtime facade with independent `ambience` volume channel.
- `doctor --json` output and diagnostics reference docs.
- Save slot thumbnails, namespaced autosave, game id and game version metadata.
- `smoke-fixture` Playwright browser smoke as part of `bun run verify`.
- CI workflow that runs the repository quality gate on pushes and pull requests.

### Changed

- Build now validates content before writing output and fails on doctor errors.
- Build compiles configured story entrypoints instead of every included `.ink` file.
- Build cleans `dist/<gameId>` before writing new output.
- Build rewrites production story entrypoints to compiled `.json` files.
- Save data now records `gameId` and `gameVersion` when available.
- Autosave preferences are namespaced by game id.
- `VnStage` delegates concrete audio playback to the engine `AudioManager`.
- `FEATURE_MAP.md` is now pending-work only; completed roadmap history is tracked here.
