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
