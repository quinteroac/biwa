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

## US-004 — Developer mounts the component

**Summary:** Created `framework/components/VnSaveMenu.tsx` — a thin, well-documented public wrapper around `SaveLoadMenu`. The component accepts the same five props (`isOpen`, `onClose`, `saveManager`, `getState`, `onLoad`) and delegates rendering entirely to `SaveLoadMenu` via `createElement`. A co-located test file verifies mount, null-render, slot count, Save button count, and close-button presence.

**Key Decisions:**
- `VnSaveMenu` delegates 100% to `SaveLoadMenu` via `createElement(SaveLoadMenu, props)`. This avoids duplicating logic and keeps a single source of truth while providing a `Vn`-prefixed public API consistent with the rest of the framework's component naming.
- `VnSaveMenuProps` is a named, exported interface (not inlined) so consumers can reference the type directly when writing wrapper components or higher-order components.
- Return type annotated as `React.ReactElement | null` to accurately reflect the conditional rendering in the underlying `SaveLoadMenu`.

**Pitfalls Encountered:**
- Typo in the localStorage stub's `removeItem` lambda (`delete store[k]` instead of `delete store[key]`). Caught before running tests via code review; the fix was trivial but worth watching for when copy-pasting the stub pattern.
- The pre-existing `ScriptRunner.ts` typecheck error (`Identifier expected` at line 177) is unrelated to this story — `npx tsc --noEmit` will report it but it is not introduced by this change.

**Useful Context for Future Agents:**
- `VnSaveMenu` is the public-facing component; `SaveLoadMenu` is the internal implementation. New feature work on the save UI should extend `SaveLoadMenu` and the public contract propagates automatically through `VnSaveMenu`.
- The `VnSaveMenuProps` interface can be used directly in `VnApp` or any host component to type the props being forwarded into `VnSaveMenu`.
- Test pattern for `VnSaveMenu` mirrors `SaveLoadMenu.test.tsx` exactly (same localStorage stub, same `renderToString` approach, same `makeState` helper). Keep them in sync when the underlying component changes.

## US-005 — Quick-save

**Summary:** Created `framework/components/VnQuickSave.tsx` with two exports: the `VnQuickSave` React component (button + toast) and a headless `quickSave(saveManager, getState)` helper function. The component accepts `saveManager: SaveManager` and `getState: () => GameSaveState` as props, writes to slot 1, and shows a brief `role="status"` ARIA live-region toast for the confirmation message. The toast container is always mounted (opacity 0 when idle) so screen readers register the live region before it fires.

**Key Decisions:**
- Both a component (`VnQuickSave`) and a function (`quickSave`) are exported. The function satisfies the AC's "or a `quickSave` export" clause and also makes the slot-1 write logic directly testable without `renderToString` event simulation.
- The toast container (`role="status"`, `aria-live="polite"`) is always rendered with `opacity: 0` when no message is active. This ensures the ARIA live region is registered with the browser before any update fires, following best-practice for dynamic status regions.
- `useEffect` triggers a 2 000 ms `setTimeout` to clear the message, giving a visible but non-intrusive fade-out window.

**Pitfalls Encountered:**
- `renderToString` cannot fire `onClick` handlers, so AC01 (slot-1 write) is verified via the `quickSave` export directly: call it, then assert on `saveManager.load(1)`.
- The toast opacity in the rendered HTML from `renderToString` will always be `0` (initial state), so the AC03 test checks for structural presence (`role="status"`, `aria-live="polite"`, `opacity:0`) rather than message content.

**Useful Context for Future Agents:**
- `quickSave(saveManager, getState)` is the canonical headless entry-point; it returns `boolean` (same contract as `saveManager.save()`).
- `VnQuickSave` is self-contained — it has no dependency on `SaveLoadMenu` or `VnSaveMenu`.
- The `QUICK_SAVE_SLOT = 1` constant is module-level inside `VnQuickSave.tsx`; if the slot designation needs to be configurable, add an optional `slot?: number` prop and default it to `1`.
- CSS variables `--vn-accent` and `--vn-font` are reused for visual consistency with the rest of the framework.
