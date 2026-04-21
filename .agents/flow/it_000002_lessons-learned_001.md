# Lessons Learned — Iteration 000002

## US-001 — Open the save/load menu

**Summary:** Implemented `SaveLoadMenu`, a React overlay component that lists all save slots (occupied and empty) for a given `SaveManager` instance. Added a `slotCount` getter to `SaveManager` so the component can enumerate the full slot range without accessing private state. Also created `formatTimestamp` (exported helper) using `Intl.DateTimeFormat`. Tests use `react-dom/server`'s `renderToString` — no DOM environment needed.

**Key Decisions:**
- Added `get slotCount(): number` to `SaveManager` (minimal, targeted) rather than passing a separate `totalSlots` prop to the component, keeping the slot configuration in one place.
- Used `Intl.DateTimeFormat` with `dateStyle: 'medium'` + `timeStyle: 'short'` for locale-aware human-readable timestamps.
- Rendered the overlay `role="dialog" aria-modal="true"` for accessibility.
- Clicking the backdrop (the overlay itself, not the panel) also calls `onClose`, matching typical modal UX.
- Component renders `null` when `isOpen` is `false`, keeping it mount-friendly.

**Pitfalls Encountered:**
- `useEffect` keyboard listeners don't execute during `renderToString`, so the Escape-key path cannot be tested via server rendering. Tested the close-button's presence via `aria-label` attribute instead.
- `Intl.DateTimeFormat` output varies by locale/timezone, so the timestamp test checks for the year substring rather than an exact string match.

**Useful Context for Future Agents:**
- React component tests in this repo use `renderToString` from `react-dom/server` (no jsdom or happy-dom configured). Check HTML string output for content assertions.
- The `localStorage` mock pattern (define on `globalThis` with `writable: true`) is established in `SaveManager.test.ts` — reuse the same pattern in component tests that exercise save logic.
- `SaveManager.slotCount` returns the numeric slot count (excludes the `'auto'` slot). The full slot list is `['auto', 1, 2, …, slotCount]`.
- CSS variables `--vn-dialog-bg`, `--vn-accent`, `--vn-choice-hover`, and `--vn-font` are used by the existing components; `SaveLoadMenu` reuses them for visual consistency.

## US-002 — Save to a slot

**Summary:** Extended `SaveLoadMenu` with a `getState: () => GameSaveState` prop and a Save button on every slot row. `SaveManager.save()` now returns `boolean` (true = success, false = failure) so the component can surface a non-blocking `role="alert"` error banner when localStorage is unavailable. A `saveCount` state variable forces re-renders after every save attempt so `listSlots()` is re-evaluated and the UI reflects the latest saved data.

**Key Decisions:**
- Changed `SaveManager.save()` return type from `void` to `boolean` — minimal, backward-compatible (callers that ignored the return value still compile).
- Used two `useState` hooks in `SaveLoadMenu`: `saveError` (string | null) for the error banner and `saveCount` (number) as a re-render trigger after save. The `void saveCount` line suppresses the "unused variable" lint warning while ensuring the value is read so React's dependency tracking stays correct.
- Error banner uses `role="alert"` for accessibility; no auto-dismiss timer (keeps implementation simple and avoids `setTimeout` cleanup in SSR-render tests).
- Save button styled with the existing `--vn-accent` CSS variable for visual consistency; `aria-label="Save to {label}"` enables slot-specific accessibility labels and is used in tests.

**Pitfalls Encountered:**
- The previous test file had the old `SaveLoadMenu` signature (without `getState`). All existing render calls needed the new prop; the whole test file was rewritten in one shot to avoid partial-match failures with the `edit` tool.
- `void saveCount` pattern is required because TypeScript strict mode flags unused variables, but the value must be read to trigger a re-render when it changes. Documenting this avoids future confusion.

**Useful Context for Future Agents:**
- `SaveManager.save()` now returns `boolean`. Update any callers (e.g., `autoSave`) if they need to surface errors too (currently `autoSave` ignores the return value, which is intentional for a fire-and-forget path).
- The component re-reads `saveManager.listSlots()` synchronously on every render — no caching or memoisation. This is fine for a small slot count but may need a `useMemo` if slot counts grow large.
- The `getState` prop is required (not optional) to enforce that every consumer provides the current game state; do not make it optional without also providing a sensible default.
- Tests for click-handler behaviour (AC02 integration) use indirect verification: call `saveManager.save()` directly and assert on `saveManager.load()`, since `renderToString` cannot fire events.

## US-003 — Load from a slot

**Summary:** Extended `SaveLoadMenu` with an `onLoad: (state: GameSaveState) => void` required prop. Added a "Load" button rendered only on occupied slot rows. `handleLoad` calls `saveManager.load(slot)` — on success it calls `onLoad(saveSlot.state)` then `onClose()`; on null it sets a `loadError` state shown as a `role="alert"` banner. Added `LOAD_BTN_STYLE` (visually distinct from Save) and a separate `loadError` state alongside the existing `saveError`.

**Key Decisions:**
- `onLoad` is a required prop (not optional) to match the pattern established by `getState` — every consumer must handle the loaded state.
- Load button is only rendered when `isOccupied` (checked via `occupiedByKey.has(String(slotKey))`) — empty slots show no Load button at all (AC01).
- Separate `loadError` state (not merged with `saveError`) so both can co-exist if the user saves to one slot then tries to load a missing one.
- `onClose()` is called after `onLoad()`, matching typical "perform action then dismiss" modal UX (AC04).
- `render` helper in tests updated to accept optional `onLoad` (defaulting to `() => {}`), avoiding changes to all 15+ existing test invocations.

**Pitfalls Encountered:**
- The `render` helper function signature needed updating to allow `onLoad` to be optional so all prior tests compiling against the old `SaveLoadMenuProps` didn't need mass-editing. Using `Omit<...> & { onLoad?: ... }` with a spread default in the helper solved this cleanly.
- Event-handler tests (AC02, AC04) remain indirect (unit-level verification via `sm.load()`) since `renderToString` cannot fire click events. The structural tests (Load button presence in rendered HTML) confirm wiring for AC01 and AC03.

**Useful Context for Future Agents:**
- `SaveLoadMenu` now requires both `getState` and `onLoad` props. Any consumer (e.g., `VnApp`) must provide both.
- `handleLoad` is the authoritative function for load logic: it calls `saveManager.load()`, passes `saveSlot.state` to `onLoad`, calls `onClose()`, or sets `loadError` on failure.
- The `LOAD_BTN_STYLE` constant uses a muted white border/color to visually distinguish Load from Save (accent-colored) at a glance.
- `loadError` and `saveError` are independent states — both banners may appear simultaneously if the user interleaves failed saves and loads.
