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

### Changed

- Build now validates content before writing output and fails on doctor errors.
- Build compiles configured story entrypoints instead of every included `.ink` file.
- Build cleans `dist/<gameId>` before writing new output.

### Known Gaps

- Demo assets still report known doctor warnings for missing optional files.
- Portal/embedded builds share the static output strategy but do not yet emit specialized wrappers.
- Browser-level E2E smoke tests are not yet configured.
