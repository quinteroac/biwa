# Requirement: Audio Playback System (BGM, SFX, Ambience, Voice)

## Context
A partial audio implementation already exists but is incomplete and in the wrong architectural layer. `VnStage.tsx` contains an internal `AudioController` class that handles `playBgm`, `playSfx`, and `playAmbience` by creating `HTMLAudioElement` instances directly inside the React component. `GameEngine` already emits `engine:bgm`, `engine:sfx`, and `engine:ambience` events from Ink tags.

This implementation has four gaps: (1) the `voice` channel is entirely missing; (2) `stop` is not implemented for any channel; (3) `loop` is hardcoded (`bgm`/`ambience` always loop, `sfx` never does); (4) audio logic lives in the React layer instead of the engine layer, making it inaccessible outside of `VnStage`.

This iteration completes and relocates the audio system: a dedicated `AudioManager` engine class replaces the `AudioController` inside `VnStage`, adds the missing `voice` channel, and makes `loop`, `volume`, and `stop` fully controllable from Ink tags.

## Goals
- Move audio logic out of `VnStage.tsx` and into a dedicated `AudioManager` engine class.
- Complete the missing functionality: `stop` command, configurable `loop`, and `voice` channel.
- Keep full backwards compatibility with the existing `engine:bgm` / `engine:sfx` / `engine:ambience` EventBus events.
- Use no external audio libraries — only the browser's native `<audio>` element.

## User Stories

Each story covers one audio channel. All four channels share the same operations: **play** (with configurable `src`, `loop`, `volume`), **stop**, and **setVolume**. The tag format is consistent across channels.

### US-001: Developer can control BGM via Ink tags
**As a** game developer, **I want** to play and stop background music with configurable loop and volume from an Ink tag **so that** the game's soundtrack changes dynamically as the story progresses.

**Tag syntax:**
```
# bgm: play, src:audio/music/theme.mp3, loop:true, volume:0.8
# bgm: stop
# bgm: volume, level:0.5
```

**Acceptance Criteria:**
- [ ] Writing `# bgm: play, src:<path>, loop:true, volume:0.8` in Ink starts the BGM track at the given volume with looping enabled.
- [ ] Writing `# bgm: play, src:<path>, loop:false` plays the track once and stops when it ends.
- [ ] Writing `# bgm: stop` stops the BGM channel immediately.
- [ ] Writing `# bgm: volume, level:0.5` adjusts the BGM volume without stopping the track.
- [ ] Starting a new BGM while one is already playing stops the previous track before starting the new one.
- [ ] Typecheck / lint passes.
- [ ] Visually and aurally verified in browser: BGM plays, loops, and stops as expected.

### US-002: Developer can control SFX via Ink tags
**As a** game developer, **I want** to trigger sound effects with configurable loop and volume from an Ink tag **so that** key moments in the story are punctuated with audio feedback.

**Tag syntax:**
```
# sfx: play, src:audio/fx/click.mp3, volume:1.0
# sfx: stop
# sfx: volume, level:0.6
```

**Acceptance Criteria:**
- [ ] Writing `# sfx: play, src:<path>, volume:1.0` plays the sound effect at the given volume.
- [ ] `loop` parameter is supported (defaults to `false` if omitted).
- [ ] Writing `# sfx: stop` stops the SFX channel.
- [ ] Writing `# sfx: volume, level:<v>` adjusts volume without stopping the current sound.
- [ ] Typecheck / lint passes.
- [ ] Aurally verified in browser: SFX plays at the correct moment in the script.

### US-003: Developer can control Ambience via Ink tags
**As a** game developer, **I want** to set an ambient soundscape with configurable loop and volume from an Ink tag **so that** locations and moods are reinforced through continuous background audio distinct from the music track.

**Tag syntax:**
```
# ambience: play, src:audio/ambience/rain.mp3, loop:true, volume:0.4
# ambience: stop
# ambience: volume, level:0.3
```

**Acceptance Criteria:**
- [ ] Writing `# ambience: play, src:<path>, loop:true, volume:0.4` starts the ambience track looping.
- [ ] Writing `# ambience: stop` stops the ambience channel without affecting BGM, SFX, or Voice.
- [ ] Changing ambience via a new play tag stops the previous ambience before starting the new one.
- [ ] Writing `# ambience: volume, level:<v>` adjusts volume independently of other channels.
- [ ] Typecheck / lint passes.
- [ ] Aurally verified in browser: ambience runs independently alongside BGM.

### US-004: Developer can control Voice via Ink tags
**As a** game developer, **I want** to play voiced dialog lines with configurable volume from an Ink tag **so that** character voice acting accompanies the written dialog.

**Tag syntax:**
```
# voice: play, src:audio/voice/char01_line03.mp3, volume:1.0
# voice: stop
# voice: volume, level:0.9
```

**Acceptance Criteria:**
- [ ] Writing `# voice: play, src:<path>, volume:1.0` plays the voice file once (loop defaults to `false`).
- [ ] Writing `# voice: stop` stops voice playback immediately.
- [ ] Starting a new voice line while one is playing stops the previous line first.
- [ ] Writing `# voice: volume, level:<v>` adjusts voice volume without stopping playback.
- [ ] Typecheck / lint passes.
- [ ] Aurally verified in browser: voice line plays in sync with the corresponding dialog step.

### US-005: Dead audio code is removed from AssetLoader
**As a** framework maintainer, **I want** `AssetLoader` to handle only image assets **so that** audio element lifecycle is owned exclusively by `AudioManager` with no ambiguity.

**Acceptance Criteria:**
- [ ] `AUDIO_EXTS` constant is removed from `AssetLoader.ts`.
- [ ] The `HTMLAudioElement` branch inside `AssetLoader.#loadOne` is removed.
- [ ] `LoadedAsset` type is updated to `HTMLImageElement` only.
- [ ] No existing call site passes an audio URL to `AssetLoader.preload()` or `AssetLoader.get()` (verified by grep).
- [ ] Typecheck / lint passes.

## Functional Requirements

- **FR-1:** Create `framework/engine/AudioManager.ts` — a class that owns four named channels: `bgm`, `sfx`, `ambience`, `voice`.
- **FR-2:** Each channel wraps a single `HTMLAudioElement` and exposes `play(src: string, loop: boolean, volume: number): void`, `stop(): void`, and `setVolume(volume: number): void`.
- **FR-3:** All four channels are single-track: calling `play()` on a channel that is already playing stops and replaces the current audio.
- **FR-4:** `AudioManager` uses the native HTML5 `<audio>` element exclusively — no external audio libraries.
- **FR-5:** `GameEngine` instantiates `AudioManager` and holds a reference to it. The existing `AudioController` class inside `VnStage.tsx` is removed.
- **FR-6:** `GameEngine` detects `TagCommand` objects whose `type` is `bgm`, `sfx`, `ambience`, or `voice` and delegates them to `AudioManager`. The existing `engine:bgm`, `engine:sfx`, `engine:ambience` EventBus emissions in `GameEngine` are replaced by direct `AudioManager` calls; `VnStage` no longer subscribes to those events for audio purposes.
- **FR-6b:** `GameEngine` adds handling for the `voice` tag type (currently absent) following the same delegation pattern.
- **FR-7:** `AudioManager` interprets `id: 'play'` (with `src`, optional `loop`, optional `volume`), `id: 'stop'`, and `id: 'volume'` (with `level`) within each channel.
- **FR-8:** The `src` path in audio tags is treated as a URL relative to the page's base URL, consistent with how `AssetLoader` resolves asset paths.
- **FR-9:** Volume values are floating-point numbers in the range `[0, 1]`. Values outside this range are clamped.
- **FR-10:** Missing optional parameters fall back to sensible defaults: `loop` → `false`, `volume` → `1.0`.
- **FR-11:** `AudioManager` emits typed `EventBus` events on every channel state change: `audio:<channel>:play` (payload: `{ src, loop, volume }`) and `audio:<channel>:stop` (no payload) — e.g., `audio:bgm:play`, `audio:sfx:stop`.
- **FR-12:** Remove `AUDIO_EXTS`, the `HTMLAudioElement` branch in `AssetLoader.#loadOne`, and update the `LoadedAsset` type to `HTMLImageElement` only. `AssetLoader` becomes image-only.

## Non-Goals (Out of Scope)

- Fade in / fade out or crossfade transitions between tracks.
- Multiple concurrent sounds on the SFX channel (polyphonic SFX).
- Persisting or restoring audio state as part of save/load slots.
- A player-facing volume mixer or settings UI.
- Mobile audio unlock handling (AudioContext resume on first gesture).
- Audio captions or accessibility subtitles.
- Playlist / track sequencing.

## Open Questions

- None.
