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
- `assets` CLI subcommands for Aseprite-compatible character and animation atlas JSON.
- `aseprite-atlas-v1` parser helpers and runtime fallback from frame names to expression tags.
- Subprocess CLI regression suite covering `new`, `doctor --json`, `build`, `list` and atlas generation.
- Fade-in, fade-out and crossfade support for persistent BGM and ambience playback.
- `preview` CLI command for serving `dist/<gameId>/`, including `--build` and `--port`.
- Dev server file watcher for story, data, assets, game config and framework source changes.
- `GameEngine.create(config)` and public idempotent `engine.boot()` for isolated runtime instances.
- `game.config.ts` JSON Schema diagnostics in `doctor` and build validation.
- `build --mode <standalone|static|portal|embedded>` with effective mode recorded in `manifest.json`.
- Portal and embedded distribution wrapper artifacts.
- `bun run coverage` for framework and manager coverage reporting.
- Player backlog/history API and default `VnBacklog` overlay.
- Auto mode and skip mode baseline controls in `VnStage`.
- Seen-dialog tracking for read-only skip behavior.
- `PlayerPreferences` service and default `VnSettings` panel for reading preferences.
- Configurable `VnStage` input map for player actions.
- Save/load slot delete controls and playtime metadata display.
- Player extras unlock storage with `gallery`, `music` and `replay` categories.
- `GameEngine` unlock API helpers and Ink unlock tags for player extras.
- Default `VnGallery` and `VnMusicRoom` overlays with `VnStage` override slots.
- Configurable `data.gallery`, `data.music` and `data.replay` folders with doctor validation.
- Player extras documentation for gallery, music room and replay metadata.
- Plugin manifest types, registry, runtime lifecycle and `GameEngine` plugin loading.
- `game.config.ts` plugin declarations with schema and doctor validation.
- Plugin contract documentation.
- `RendererRegistry` with external renderer dispatch for backgrounds, characters and transitions.
- `plugins` CLI subcommands for listing, validating and scaffolding plugin projects.
- Doctor diagnostics for undeclared external renderer types in scene, character and transition data.
- Build manifest plugin metadata including capabilities and renderer declarations.

### Changed

- Build now validates content before writing output and fails on doctor errors.
- Build compiles configured story entrypoints instead of every included `.ink` file.
- Build cleans `dist/<gameId>` before writing new output.
- Build rewrites production story entrypoints to compiled `.json` files.
- Save data now records `gameId` and `gameVersion` when available.
- Autosave preferences are namespaced by game id.
- `VnStage` delegates concrete audio playback to the engine `AudioManager`.
- `FEATURE_MAP.md` is now pending-work only; completed roadmap history is tracked here.
- `doctor` validates character spritesheet atlas JSON when present.
- Save-state audio restore marks persistent audio as restored so runtime playback skips unnecessary fades.
- Audio docs now distinguish implemented single-file playback from reserved adaptive/intro-loop metadata.
- Engine docs now define singleton versus isolated instance policy.
- Distribution docs now describe mode-specific wrapper contracts.
- Save snapshots now include dialog backlog state.
- `VnStage` now reads player mode state from unified player preferences.
- Save controls and player reading controls share the same bottom bar styling.
- `VnStage` exposes gallery and music-room access when player extras are configured.
- `VnStage` now groups settings, gallery and music room under a top-right gear menu beside audio controls.
- Built-in visual components now consult external renderer registrations before showing unsupported renderer fallbacks.
