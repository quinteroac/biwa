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
