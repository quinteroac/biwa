# Lessons Learned — Iteration 000003

## US-001 — Player sees the Save Controls bar below the dialog box

**Summary:** Implemented `SaveControlsBar`, a slim horizontal strip with Quick Save and Save Menu buttons, anchored below the dialog box inside `VnStage`. The dialog and controls bar are wrapped in a shared bottom-panel flex column so they stack naturally with zero extra measurement or z-index fighting.

**Key Decisions:**
- Removed `position: absolute; bottom: 0; left: 0; right: 0` from `VnDialog`'s outer wrapper so it becomes a normal flow element inside the bottom-panel flex column. This is the minimal touch needed — the inner dialog box CSS is untouched.
- Added a `position: absolute; bottom: 0; flex-column` wrapper in `VnStage` that holds `VnDialog` (first child) and `SaveControlsBar` (second child). The column grows upward from the screen's bottom edge, so dialog is visually above the bar.
- `SaveControlsBar` container uses `pointerEvents: none`; individual buttons use `pointerEvents: auto` plus `e.stopPropagation()` so clicks never bubble up to the stage's click-to-advance handler.
- Reused `quickSave()` from `VnQuickSave.tsx` rather than duplicating the save logic.

**Pitfalls Encountered:**
- `VnDialog` had `position: absolute` on its outer wrapper, which would escape the flex column if left unchanged. Stripping that one style property is sufficient — the inner layout (`display: flex; justifyContent: center; padding: 24`) handles centring the dialog box.
- Pointer-event pass-through requires both `pointerEvents: none` on the container AND `e.stopPropagation()` on button handlers; relying on only one breaks either the button clicks or the stage advance.

**Useful Context for Future Agents:**
- `VnDialog` no longer manages its own absolute positioning. Its parent (`VnStage`'s bottom panel div) owns `position: absolute; bottom: 0`. Any future component that needs to coexist at the bottom of `VnStage` should be added as another child of that flex-column panel.
- `quickSave()` is exported from `VnQuickSave.tsx` as a bare utility function (not tied to the button component); it is safe to call imperatively from `SaveControlsBar` or any other component.
- Tests use `renderToString` from `react-dom/server` (SSR snapshot style) — no DOM environment or `jsdom` required. Follow the same pattern for new component tests.

## US-002 — Player can open the save/load slot menu from the controls bar

**Summary:** Added `showSlotMenu?: boolean` prop (defaulting to `true`) to `SaveControlsBar`. Renamed the existing "Save Menu" button to "Save / Load" to match the user story copy. When `showSlotMenu` is `false`, the button is not rendered (returns `null` for that slot); Quick Save is unaffected.

**Key Decisions:**
- `showSlotMenu` defaults to `true` via destructuring default (`showSlotMenu = true`), so all existing call sites remain valid without changes.
- Renamed button text "Save Menu" → "Save / Load" as required by AC01. The `aria-label` stays `"Open save menu"` (descriptive, unchanged).
- No new wiring was needed for VnSaveMenu — the existing `onOpenMenu` callback already handles it; the prop just gates rendering.

**Pitfalls Encountered:**
- The existing test assertion `expect(html).toContain('Save Menu')` needed updating to `'Save / Load'` after the rename; forgetting this causes a silent regression in the test suite.

**Useful Context for Future Agents:**
- `SaveControlsBar` now conditionally renders the slot-menu button. Use `showSlotMenu={false}` in game scenes where the player should not be able to save (e.g., during a cutscene or minigame).
- The `onOpenMenu` callback signature is unchanged; any parent that already provided it continues to work as-is.

## US-003 — Player can trigger quick save from the controls bar

**Summary:** Added `showQuickSave?: boolean` prop (default `true`) to `SaveControlsBar`. When `false`, the Quick Save button is not rendered. Added toast feedback (ARIA live region + opacity toggle) reusing the same pattern from `VnQuickSave`. `handleQuickSave` now captures the boolean return of `quickSave()` and sets a toast message accordingly.

**Key Decisions:**
- Added `useState<string | null>` + `useEffect` with `setTimeout` (2000 ms) for toast — same pattern as `VnQuickSave` so UX is consistent.
- Added `useEffect` import alongside `useState`; `createElement` was already imported.
- Toast `div` (role=`status`, aria-live=`polite`) is always rendered (opacity toggles) so screen readers receive save feedback.
- `showQuickSave` defaults to `true` via destructuring default, keeping all existing call sites valid.

**Pitfalls Encountered:**
- None significant. The component was already structured with `createElement`; adding hooks was straightforward.

**Useful Context for Future Agents:**
- `SaveControlsBar` is now fully stateful (uses hooks). It cannot be rendered in a pure SSR context without the React hooks shim, but `renderToString` in tests still works because hooks are allowed server-side in React 18+.
- Both `showQuickSave` and `showSlotMenu` are independent boolean props. Either button can be hidden separately.
- The pre-existing `framework/engine/ScriptRunner.ts(177,72): error TS1003` is a baseline error unrelated to this story.

## US-004 — Player can toggle auto save on/off from the controls bar

**Summary:** Added `showAutoSave?: boolean` and `eventBus?: EventBus` props to `SaveControlsBar`. The toggle reads initial state from `localStorage` key `vn:autoSave` (defaults to `true`). When enabled, it subscribes to `engine:dialog` on the bus (via `useEffect`) and calls `saveManager.save('auto', getState())` on each event. Toggling persists to `localStorage`. The toggle uses an `aria-checked` role=switch label with an animated knob, consistent with the existing visual style.

**Key Decisions:**
- Used `useRef` to capture latest `saveManager`/`getState`/`autoSaveEnabled` values inside the event handler closure, avoiding stale-closure bugs without re-subscribing on every render.
- `eventBus` is optional — when absent, the `useEffect` returns early so the component works in SSR tests and contexts without a bus.
- Toggle UI uses a styled `<label>` with `role="switch"` and `aria-checked` (not a native `<input type="checkbox">`) to keep the visual consistent with the `createElement` approach already in use.
- `AUTO_SAVE_KEY = 'vn:autoSave'` is a module-level constant to avoid magic strings.

**Pitfalls Encountered:**
- SSR tests (`renderToString`) don't run `useEffect`, so the event subscription cannot be tested via SSR rendering. The AC03 test verifies the toggle renders correctly; the actual save-on-emit behaviour is best tested in a DOM environment. The test covers the render path only.
- `aria-checked` in SSR output is `aria-checked="true"` / `aria-checked="false"` (stringified boolean), which is what the test assertions check.

**Useful Context for Future Agents:**
- `SaveControlsBar` now has three independent visibility props: `showQuickSave`, `showSlotMenu`, `showAutoSave` — all default to `true`.
- Pass `eventBus={engine.eventBus}` when mounting `SaveControlsBar` in a live game context for auto-save to function.
- The `localStorage` key `vn:autoSave` is global (not per-game-id), intentionally, since auto-save preference is a player-level setting.

## US-005 — Developer can configure which controls are visible at mount time

**Summary:** Added `showSlotMenu?`, `showQuickSave?`, and `showAutoSave?` optional boolean props (all defaulting to `true`) to `VnStage`. These are forwarded directly to `SaveControlsBar`, meaning developers can now pass `<VnStage engine={engine} showQuickSave={false} />` to hide individual controls without mounting `SaveControlsBar` separately.

**Key Decisions:**
- Introduced a `VnStageProps` interface (exported) to hold the engine + three visibility props, replacing the inline `{ engine: GameEngine }` type.
- Defaults of `true` via destructuring (`showSlotMenu = true` etc.) preserve backward compatibility — no existing call sites need updating.
- Also forwarded `eventBus={engine.bus}` to `SaveControlsBar` at the same time, since that prop existed on `SaveControlsBar` but was previously not wired from `VnStage`.

**Pitfalls Encountered:**
- `VnStage` only renders `SaveControlsBar` when `dialog !== null` (dialog-gated). In SSR (`renderToString`), `useEffect` doesn't run and state stays at its initial value (`dialog = null`), so `SaveControlsBar` never appears in the SSR snapshot. Tests for AC02/AC03 must therefore target `SaveControlsBar` directly rather than via VnStage's rendered output.

**Useful Context for Future Agents:**
- `VnStage` now also passes `eventBus={engine.bus}` to `SaveControlsBar`. Previously this was omitted, meaning auto-save would not function even when `SaveControlsBar` was rendered from VnStage.
- The `VnStageProps` interface is exported from `VnStage.tsx` — use it if you need to type a wrapper or higher-order component around `VnStage`.
- For SSR-compatible tests of VnStage's prop forwarding, test `SaveControlsBar` directly with the same prop values; the forwarding is validated by TypeScript's strict checking at compile time.
