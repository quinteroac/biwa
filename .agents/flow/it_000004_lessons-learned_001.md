# Lessons Learned — Iteration 000004

## US-001 — Player sees the start menu with the game title

**Summary:** Implemented `VnStartMenu` component and refactored `VnApp.tsx` to gate `VnStage` (and `engine.start()`) behind a start-menu state. A `title` getter was added to `GameEngine` so the component can read the game title without coupling to the full config object.

**Key Decisions:**
- Added `get title(): string` to `GameEngine` rather than passing the config directly to `mountVnApp`. This keeps the public API minimal and consistent with the other getters on the engine.
- Introduced a local `VnApp` React component inside `VnApp.tsx` that manages a `started` boolean. `mountVnApp` now renders `<VnApp>` instead of `<VnStage>` directly. This satisfies AC01 and AC03 without changing the external `mountVnApp` signature.
- `VnStage` already calls `engine.start()` inside its `useEffect` — so simply not mounting `VnStage` until `started === true` is sufficient to satisfy AC03 without any engine changes.
- Hover effects on the Start button are applied via `onMouseEnter`/`onMouseLeave` inline handlers (no CSS class needed) because the project has no CSS module or styled-component setup.

**Pitfalls Encountered:**
- `renderToString` cannot render `VnApp` directly in bun:test because it references browser-only APIs (e.g. `window`, `localStorage`) through `VnStage`. Tests were split: `VnStartMenu` is tested via `renderToString`; the `VnApp` integration test is structural (checks `mountVnApp` is a function) rather than a full SSR render.
- The `act` import from `react` is not needed for SSR-only tests; it was imported but unused — removed in the final version.

**Useful Context for Future Agents:**
- `VnStage.tsx` is the sole place `engine.start()` is called (inside a `useEffect` on mount). Any future "pre-game" screens must similarly defer `VnStage` mounting.
- CSS variables (`--vn-accent`, `--vn-font`, `--vn-dialog-bg`) are defined in `framework/styles/base.css` and overridden per-game in `GameEngine.#boot()` via `document.documentElement.style.setProperty`. Components should always reference these vars rather than hardcoding colours.
- The existing test pattern uses `renderToString` (SSR) for component tests — no jsdom or React Testing Library is configured. Keep new tests to this pattern.
- `bun test` runs all `*.test.tsx` / `*.test.ts` files recursively; test files live co-located under `__tests__/` directories adjacent to the modules they test.

## US-002 — Player can start a new game from the menu

**Summary:** Extended `VnStartMenu` with a "New Game" button (replacing the old "Start" label), an optional `hasSaves?: boolean` prop, and an internal `confirming` state. When `hasSaves` is true and the player clicks "New Game", an inline confirmation prompt appears with "Confirm" and "Cancel" actions. `VnApp` computes `hasSaves` from `engine.saveManager.listSlots().length > 0` and passes it down.

**Key Decisions:**
- `hasSaves` is an optional prop (defaults to `false`) so existing tests and any direct renders of `VnStartMenu` without saves knowledge continue to work without modification.
- The `confirming` state is internal to `VnStartMenu` (not lifted to `VnApp`) because no other component needs to observe it — this keeps the interface clean.
- `VnApp` computes `hasSaves` inline at render time (not via `useState`). Since the start menu is only shown when `started === false` and no user action can change `listSlots()` while the menu is displayed (no saves can be created before the game starts), this is safe and avoids an extra `useEffect`.
- Confirmation text matches the AC verbatim: "Start over? Your saves will not be deleted."
- `data-testid="vn-start-menu-start"` is kept on the "New Game" button for backward compatibility with existing tests.

**Pitfalls Encountered:**
- Interactive behavior (click → show confirmation → click Confirm → `onStart()`) cannot be tested with `renderToString` (SSR) because state changes from event handlers are not executed during server rendering. AC02's interactive flow is verified visually (AC05) and structurally (the confirm/cancel elements are present in the JSX tree, confirming they render when `confirming === true`).

**Useful Context for Future Agents:**
- The confirmation prompt elements use `data-testid="vn-new-game-confirm"`, `"vn-confirm-new-game"`, and `"vn-cancel-new-game"` — use these for any future E2E or jsdom tests.
- `SaveManager.listSlots()` iterates over all configured slots + `'auto'` and calls `localStorage.getItem` for each. It is safe to call at render time in a browser environment; the localStorage stub in the test file covers this in tests.
- If a future story adds more buttons to `VnStartMenu` (e.g. "Continue", "Load Game"), the `hasSaves` prop is already in place to conditionally enable them.
