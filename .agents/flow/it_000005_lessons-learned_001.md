# Lessons Learned — Iteration 000005

## US-001 — Player sees the end screen when the story reaches its conclusion

**Summary:** Implemented the `# end_screen` Ink tag that causes the visual novel to display a full-screen end screen. This involved: confirming `TagParser` already handled bare tags correctly (no change needed); adding an `end_screen` case to `GameEngine#processTags` that sets state to `ENDED` and emits an `'end_screen'` event on `EventBus`; creating a new `VnEndScreen` React component; and updating `VnApp` to subscribe to the `'end_screen'` event and swap `VnStage` for `VnEndScreen`.

**Key Decisions:**
- `TagParser` required no modification — bare tags like `# end_screen` already produce `{ type: "end_screen" }` via the existing `colonIdx === -1` branch.
- `end_screen` tag params (`title`, `message`) flow through as-is since the parser handles `key: value` pairs in the same tag.
- `VnApp` uses `useEffect` to subscribe to `engine.bus` on mount; when the event fires it sets local state (`endScreen`) and the component re-renders to show `VnEndScreen`, unmounting `VnStage`.
- The `end_screen` payload is typed as `{ title?: string; message?: string }` to allow optional customisation from the Ink script.

**Pitfalls Encountered:**
- None significant. The existing `TagParser` and `EventBus` architecture made this straightforward.

**Useful Context for Future Agents:**
- `TagParser` handles bare single-word tags (no colon) with `{ type: rawWord }`. Any new Ink tag that follows `# tag_name` pattern needs no parser changes.
- `GameEngine#processTags` is the central dispatch for all tag-based side effects — add new cases there.
- Tests use `renderToString` from `react-dom/server` for component unit tests (no DOM required) — this is the established pattern in this codebase.
- `VnApp` is the right place to manage top-level UI state transitions (start menu → stage → end screen). State changes driven by `EventBus` should be subscribed via `useEffect` with a cleanup return.
- `data-testid` attributes on root elements are the convention for component identity in tests (e.g. `data-testid="vn-end-screen"`).

## US-002 — Developer can configure the title and message shown on the end screen

**Summary:** Added `endScreen?: { title?: string; message?: string }` to the `GameConfig` type, and updated `GameEngine#processTags` to merge `config.endScreen` defaults with any values provided in the Ink `# end_screen` tag (tag values take precedence via `??`). `VnEndScreen` already accepted these props, so no component changes were needed.

**Key Decisions:**
- The merge happens in `GameEngine#processTags` — Ink tag values override config defaults via `??` operator. This is the right layer since `GameEngine` owns both the config and the event emission.
- `VnEndScreen` was already correctly implemented (title default "The End", conditional message element) — no changes needed there.
- Tests are co-located in a new `VnEndScreen.us002.test.tsx` file, consistent with the project convention of per-story test files for new acceptance criteria.

**Pitfalls Encountered:**
- None. The architecture made this a clean 2-file change (type + engine).

**Useful Context for Future Agents:**
- `GameConfig` is defined in `framework/types/game-config.d.ts` and has a catch-all `[key: string]: any` index signature — new optional fields should still be declared explicitly for type safety.
- The `end_screen` event payload merging pattern (`tag value ?? config default`) established here can be reused for other config-driven tag defaults.
- When testing `GameConfig` type acceptance, construct typed objects in test bodies — TypeScript strict-checks them at compile time, and Bun runs the type-checker as part of `bun test`.

## US-003 — Player can return to the main menu from the end screen

**Summary:** Added an optional `onReturnToMenu` prop to `VnEndScreen` that renders a "Return to Menu" button styled consistently with `VnStartMenu` buttons. Updated `VnApp` to wire a `handleReturnToMenu` callback that resets `endScreen`, `started`, and `resumeSave` state — causing the component to re-render `VnStartMenu` with a fresh `hasSaves` value derived from `engine.saveManager.listSlots()`.

**Key Decisions:**
- `onReturnToMenu` is optional — when omitted, no button is rendered, preserving backward compatibility with existing tests and any usage that doesn't need the button.
- `VnApp.handleReturnToMenu` resets all three state pieces: `endScreen → null`, `started → false`, `resumeSave → null`. This is sufficient to navigate back to the start menu; `hasSaves` is computed inline from `engine.saveManager.listSlots()` so it is always fresh on re-render.
- Button styling matches `VnStartMenu.MENU_STYLES.button` exactly: transparent background, `--vn-accent` color/border, uppercase text, `Georgia` font, hover invert effect via `onMouseEnter`/`onMouseLeave`.
- Keyboard accessibility (AC03) is free: the button is a native `<button>` element, so Enter/Space activation and focus are built-in with no extra ARIA needed.

**Pitfalls Encountered:**
- None significant. The opt-in `onReturnToMenu` pattern avoided breaking any existing test that renders `VnEndScreen` without the prop.

**Useful Context for Future Agents:**
- `VnApp` manages the top-level screen state via three `useState` values: `started`, `resumeSave`, and `endScreen`. Resetting all three on return-to-menu is the correct approach to fully clear story session state.
- `hasSaves` in `VnApp` is not stateful — it's recomputed on every render from `engine.saveManager.listSlots().length > 0`. So returning to the menu automatically reflects the current save state without extra logic.
- Test pattern for optional-prop-driven rendering: write one test asserting the button renders when prop is provided and one asserting it does not render when prop is omitted.
