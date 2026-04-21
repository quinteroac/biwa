# Requirement: Save Controls Bar

## Context
The framework already exposes save functionality through two separate components (`VnSaveMenu` for slot management and `VnQuickSave` for one-shot quick saves), but neither provides a persistent, always-visible control surface during gameplay. Players must use the keyboard shortcut (Escape) to reach the save menu, and there is no in-game toggle for auto save. A `SaveControlsBar` component situated below the dialog box would consolidate these actions into a discoverable, always-accessible HUD strip.

## Goals
- Give players a single, visible strip of save-related controls without opening a modal.
- Expose quick save, slot menu access, and auto save toggle in one cohesive component.
- Let developers decide at mount time which controls are shown, defaulting to all enabled.
- Persist the auto save enabled/disabled preference across page reloads via localStorage.

## User Stories

### US-001: Player sees the Save Controls bar below the dialog box
**As a** player, **I want** to see a controls bar anchored just below the dialog box **so that** I can always access save actions without memorizing keyboard shortcuts.

**Acceptance Criteria:**
- [ ] `SaveControlsBar` renders as a horizontal strip positioned immediately below `VnDialog` inside `VnStage`.
- [ ] The bar is visible whenever the dialog is visible (not shown when dialog is null).
- [ ] The bar does not interfere with click-to-advance on the stage background.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser.

---

### US-002: Player can open the save/load slot menu from the controls bar
**As a** player, **I want** a "Save / Load" button in the controls bar **so that** I can open the slot menu without pressing Escape.

**Acceptance Criteria:**
- [ ] The bar renders a "Save / Load" button when `showSlotMenu` prop is `true` (default).
- [ ] Clicking the button opens `VnSaveMenu` (the existing slot overlay).
- [ ] The button is hidden (not rendered) when `showSlotMenu` is `false`.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser.

---

### US-003: Player can trigger quick save from the controls bar
**As a** player, **I want** a "Quick Save" button in the controls bar **so that** I can save immediately to slot 1 without navigating the slot menu.

**Acceptance Criteria:**
- [ ] The bar renders a "Quick Save" button when `showQuickSave` prop is `true` (default).
- [ ] Clicking the button saves to slot 1 via `SaveManager.save(1, getState())`.
- [ ] A brief toast or inline feedback confirms success or failure (reuses existing toast pattern from `VnQuickSave`).
- [ ] The button is hidden (not rendered) when `showQuickSave` is `false`.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser.

---

### US-004: Player can toggle auto save on/off from the controls bar
**As a** player, **I want** an "Auto Save" toggle in the controls bar **so that** the game automatically saves to the auto slot at each dialog step without manual action.

**Acceptance Criteria:**
- [ ] The bar renders an "Auto Save" toggle when `showAutoSave` prop is `true` (default).
- [ ] The toggle initial state is read from `localStorage` key `vn:autoSave` (defaults to `true` if absent).
- [ ] When enabled, the component saves to the `'auto'` slot on every `engine:dialog` bus event.
- [ ] When disabled, no automatic saves are triggered.
- [ ] Toggling the switch updates `localStorage` key `vn:autoSave` immediately.
- [ ] After a page reload, the toggle reflects the last persisted state.
- [ ] The toggle is hidden (not rendered) when `showAutoSave` is `false`.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: toggle state survives reload.

---

### US-005: Developer can configure which controls are visible at mount time
**As a** developer, **I want** to pass boolean props directly to `VnStage` to show or hide individual controls **so that** I can tailor the bar without mounting or wiring `SaveControlsBar` separately.

**Acceptance Criteria:**
- [ ] `VnStage` accepts optional props `showSlotMenu?: boolean`, `showQuickSave?: boolean`, `showAutoSave?: boolean` (all default to `true`).
- [ ] `VnStage` forwards those props to `SaveControlsBar`; no other mount-point is needed.
- [ ] Setting any prop to `false` on `VnStage` removes that control from the DOM entirely (not just visually hidden).
- [ ] A developer can disable quick save with `<VnStage engine={engine} showQuickSave={false} />` and TypeScript accepts it without errors in strict mode.
- [ ] When no visibility props are passed, all controls are shown (backward-compatible).
- [ ] Typecheck / lint passes.

---

## Functional Requirements
- FR-1: `SaveControlsBar` is a new file at `framework/components/SaveControlsBar.tsx`.
- FR-2: The component accepts `saveManager: SaveManager`, `getState: () => GameSaveState`, `onLoad: (state: GameSaveState) => void`, `bus: EventBus`, plus the three optional boolean visibility props.
- FR-3: Auto save subscribes to the `engine:dialog` event on the provided `EventBus` and unsubscribes on unmount.
- FR-4: The localStorage key for the auto save toggle is `vn:autoSave` (a plain `"true"` / `"false"` string).
- FR-5: The bar's visual style follows the existing CSS variable tokens (`--vn-dialog-bg`, `--vn-accent`, `--vn-font`) for consistency with the rest of the framework UI.
- FR-6: `VnStage` accepts optional props `showSlotMenu?: boolean`, `showQuickSave?: boolean`, `showAutoSave?: boolean` and forwards them to `SaveControlsBar`. Engine-level wiring (`saveManager`, `getState`, `restoreState`, `bus`) is done internally by `VnStage`; the developer never touches those.

## Non-Goals (Out of Scope)
- Configurable auto-save interval (time-based) — auto save fires on dialog events only.
- Persisting which individual controls were last shown — visibility is developer-controlled at mount.
- Quick-load button (load from slot 1 without opening the menu) — not requested.
- Animated entrance/exit of the bar itself.
- Any changes to `SaveLoadMenu.tsx` or `VnSaveMenu.tsx` internals.

## Open Questions
- None
