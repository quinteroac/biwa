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
