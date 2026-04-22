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
