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
