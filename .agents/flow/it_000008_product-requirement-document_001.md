# Requirement: Audio Volume Controls Framework

## Context
The visual novel framework currently has no built-in way to control audio volume. Game developers cannot offer players per-channel volume adjustment or a global mute toggle, which is a standard expectation for any visual novel experience. This feature adds a `VolumeController` module, a `VnVolumeControl` React component, and per-channel audio management (master, BGM, SFX, voice) with persistence via `localStorage`.

## Goals
- Provide game developers with a ready-to-use volume control system (framework-level)
- Support 4 independent audio channels: master, BGM, SFX, voice
- Persist volume settings across sessions via `localStorage`
- Offer a drop-in React component (`VnVolumeControl`) for start menus and overlays
- Include a global mute toggle that restores previous levels on unmute

## User Stories

### US-001: VolumeController Module
**As a** game developer, **I want** a `VolumeController` class that can set and get volume per channel **so that** I can control audio levels programmatically in my game.

**Acceptance Criteria:**
- [ ] `VolumeController` class in `framework/engine/VolumeController.ts`
- [ ] Methods: `setVolume(channel, value)` and `getVolume(channel)` for channels: master, bgm, sfx, voice
- [ ] Volume values are normalized 0.0–1.0
- [ ] Setting volume on a channel applies it to all active audio sources in that channel
- [ ] Throws if channel name is invalid
- [ ] Typecheck / lint passes

### US-002: Volume Persistence
**As a** game developer, **I want** volume settings to persist across browser sessions **so that** players don't have to re-adjust volume every time they play.

**Acceptance Criteria:**
- [ ] Volume settings saved to `localStorage` under key `vn:{gameId}:volume`
- [ ] Settings auto-load on `VolumeController` instantiation
- [ ] Default values: all channels at 1.0 (full volume), mute = false
- [ ] Settings saved after every `setVolume` call
- [ ] Typecheck / lint passes

### US-003: VnVolumeControl UI Component
**As a** game developer, **I want** a `VnVolumeControl` React component with per-channel sliders **so that** I can add a volume settings UI to my game's start menu or overlay without building it from scratch.

**Acceptance Criteria:**
- [ ] `VnVolumeControl` component in `framework/components/VnVolumeControl.tsx`
- [ ] Renders a slider (range input) for each channel: master, BGM, SFX, voice
- [ ] Each slider shows channel label and current volume percentage
- [ ] All sliders use CSS custom properties for styling (per theming convention)
- [ ] Component accepts `onVolumeChange` callback prop
- [ ] Visually verified in browser
- [ ] Typecheck / lint passes

### US-004: Per-Channel Volume (Master, BGM, SFX, Voice)
**As a** game developer, **I want** 4 independent audio channels (master, BGM, SFX, voice) **so that** players can fine-tune their audio experience (e.g., lower SFX while keeping BGM loud).

**Acceptance Criteria:**
- [ ] 4 channels defined in `framework/types/audio.d.ts` or equivalent type definition
- [ ] Master volume acts as a multiplier on all other channels (effective volume = master × channel)
- [ ] Changing one channel does not affect others
- [ ] `VolumeController.getChannelNames()` returns the list of available channels
- [ ] Ink tag `# volume <channel> <value>` is supported via TagParser (e.g. `# volume bgm 0.5`)
- [ ] Typecheck / lint passes

### US-005: Mute Toggle
**As a** game developer, **I want** a global mute toggle that silences all audio and restores previous levels when unmuted **so that** players can quickly silence the game without losing their volume configuration.

**Acceptance Criteria:**
- [ ] `VolumeController.setMuted(boolean)` and `VolumeController.isMuted()` methods
- [ ] When muted, all channels output silence (volume effectively 0)
- [ ] Previous per-channel volumes are preserved while muted
- [ ] When unmuted, channels restore to their pre-mute levels
- [ ] `VnVolumeControl` includes a mute button alongside the sliders
- [ ] Mute state persists in `localStorage`
- [ ] Visually verified in browser
- [ ] Typecheck / lint passes

## Functional Requirements
- FR-1: `VolumeController` must be a singleton accessible via `GameEngine.getVolumeController()`
- FR-2: Volume values are floating-point numbers in range [0.0, 1.0]; values outside range are clamped
- FR-3: All volume operations must emit events on the `EventBus` (e.g., `volume:changed`, `volume:muted`)
- FR-4: `localStorage` key must follow the existing pattern: `vn:{gameId}:volume`
- FR-5: `VnVolumeControl` must be themeable via CSS custom properties (no hardcoded colors or fonts)
- FR-6: Mute must be a binary override — individual channel volumes remain unchanged internally while muted
- FR-7: `VolumeController` must handle the case where no audio is loaded (no-op, no errors)
- FR-8: Ink tag `# volume <channel> <value>` must be parsed by TagParser and routed to `VolumeController.setVolume(channel, value)`
- FR-9: Invalid Ink volume tags (bad channel, out-of-range value) must log a warning and not crash

## Non-Goals (Out of Scope)
- Audio asset management or loading (remains in `AssetLoader`)
- Spatial / 3D audio, Dolby, or surround sound support
- Per-scene or per-line volume automation (can be added later via tags)
- Keyboard shortcuts for volume adjustment
- Accessibility features beyond standard slider labels

## Resolved Decisions
- Mute button will be a toggle icon integrated inside `VnVolumeControl` (not a separate component)
- `VolumeController` will integrate with the Ink tag parser — developers can write `# volume bgm 0.5` in narrative scripts to adjust volume at runtime
