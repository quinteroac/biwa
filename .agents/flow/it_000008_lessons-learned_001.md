# Lessons Learned — Iteration 000008

## US-003 — VnVolumeControl UI Component

**Summary:** Implemented a `VnVolumeControl` React component in `framework/components/VnVolumeControl.tsx` that renders per-channel volume sliders (master, BGM, SFX, voice) with labels and percentage display. Uses CSS custom properties for all styling, accepts an `onVolumeChange` callback prop, and injects slider thumb styles at mount time (inline styles can't target pseudo-elements).

**Key Decisions:**
- Used `useState` internally for local volume state management; the component is a controlled UI that reports changes via `onVolumeChange` but tracks its own display state.
- Slider fill percentage is rendered via `linear-gradient` in inline styles (CSS vars for colors), avoiding the need for a separate CSS file.
- Slider thumb pseudo-elements (`::-webkit-slider-thumb`, `::-moz-range-thumb`) are styled by injecting a `<style>` element at mount via `useEffect` — inline styles cannot target pseudo-elements. The injection is idempotent (checks for existing style element by ID).
- All 14 CSS custom properties follow the `--vn-vol-*` naming convention with sensible defaults matching the project's minimal aesthetic.
- Used `AudioChannel` type imported from `VolumeController.ts` rather than duplicating the channel definition.

**Pitfalls Encountered:**
- Initial test for "100%" display matched 20 occurrences because the CSS gradient string also contains "100%" — fixed by checking `aria-valuenow="100"` instead.
- Range input thumb styling requires pseudo-element CSS; inline styles only affect the track. Solved with runtime style injection.

**Useful Context for Future Agents:**
- Games can add this component to their start menu or settings overlay by importing `VnVolumeControl` and wiring `onVolumeChange` to a `VolumeController.setVolume()` call.
- If the CSS variables need to be themed, games can set them via `game.config.ts → theme.cssVars` (e.g., `--vn-vol-track-fill: 'rgba(255,255,255,0.4)'`).
- The component is designed to be self-contained — it does not depend on `GameEngine`, `EventBus`, or any engine pieces.

## US-004 — Per-Channel Volume (Master, BGM, SFX, Voice)

**Summary:** Implemented 4-channel volume control system with master multiplier, channel independence, `getChannelNames()` API, and Ink tag parsing for `# volume <channel> <value>`.

**Key Decisions:**
- Moved `AudioChannel` type to `framework/types/audio.d.ts` (co-located with `AudioCategory`) per project convention of types in `framework/types/*.d.ts`. VolumeController re-exports it via `export type { AudioChannel }` for backward compatibility.
- `getChannelNames()` is a static method returning the frozen `#CHANNELS` array directly — no copy needed since the array is already `Object.freeze`'d.
- Extended TagParser's no-colon branch to handle space-separated `volume <channel> <value>` format. This is type-specific: only the `volume` command gets special treatment; other space-separated tags continue returning bare `{ type }` as before.
- The `value` in the parsed volume command is stored as a parsed float (`parseFloat`), not as a string — downstream consumers (e.g., GameEngine) can use it directly.

**Pitfalls Encountered:**
- Initial `export { AudioChannel }` caused TS1205 error with `verbatimModuleSyntax` — needed `export type { AudioChannel }` instead.
- The project has many pre-existing TypeScript errors (import extension issues, exactOptionalPropertyTypes mismatches, manager CLI issues) unrelated to this story. Only the verbatim module syntax error on my re-export was new and needed fixing.

**Useful Context for Future Agents:**
- The controllers (BgmController, SfxController, VoiceController) currently manage volume independently via per-instance `audio.volume` assignments. They are not yet wired up to VolumeController. Future stories may need to integrate them so that VolumeController's effective volume (master × channel) is applied at playback time.
- `AudioChannel` in audio.d.ts = `('master' | 'bgm' | 'sfx' | 'voice')` — note this differs from `AudioCategory` which includes `'ambience'` but excludes `'master'`. Use `AudioChannel` for volume control, `AudioCategory` for asset metadata.
