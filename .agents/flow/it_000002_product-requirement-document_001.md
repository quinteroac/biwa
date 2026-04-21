# Requirement: Save System UI Component

## Context
The framework has a fully functional `SaveManager` (slot persistence, load, delete, auto-save, schema migration) but no UI surface. Players have no way to trigger saves or loads during a game, and developers have no ready-made component to drop into their game. This feature closes that gap by providing a `VnSaveMenu` React component that connects the existing `SaveManager` API to the player UI.

## Goals
- Give players an in-game UI to save to a numbered slot, load from a slot, and perform a quick-save without opening the menu.
- Give developers a single mountable component that integrates with their existing `SaveManager` instance and game-state getter/setter.
- Verified to work end-to-end in a real browser with localStorage persistence.

## User Stories

### US-001: Open the save/load menu
**As a** player, **I want** to open a save/load menu during a game **so that** I can manage my saved progress without leaving the game.

**Acceptance Criteria:**
- [ ] An overlay or panel renders when `isOpen` prop is `true`.
- [ ] The menu closes when `onClose` prop is called (e.g. clicking a close button or pressing Escape).
- [ ] The menu lists all occupied slots returned by `saveManager.listSlots()`, showing `meta.displayName`, `meta.sceneName`, and a human-readable `timestamp`.
- [ ] Empty slots are also listed up to the configured slot count, showing a placeholder label ("Empty slot").
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: menu opens and closes correctly.

---

### US-002: Save to a slot
**As a** player, **I want** to save my current progress to a numbered slot **so that** I can return to this point later.

**Acceptance Criteria:**
- [ ] Each slot row has a "Save" button.
- [ ] Clicking "Save" calls `saveManager.save(slot, getState())` with the slot number and the current game state provided by the `getState` prop.
- [ ] After saving, the slot list refreshes and shows the updated `displayName` and `timestamp` for that slot.
- [ ] If writing to localStorage fails, a non-blocking warning is visible to the player (e.g. a brief error message in the UI).
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: slot shows updated data after saving; localStorage entry confirmed via DevTools.

---

### US-003: Load from a slot
**As a** player, **I want** to load a previously saved game from a slot **so that** I can resume from a saved point.

**Acceptance Criteria:**
- [ ] Each occupied slot row has a "Load" button.
- [ ] Clicking "Load" calls `saveManager.load(slot)` and, if the result is non-null, calls the `onLoad(saveSlot.state)` prop with the loaded `GameSaveState`.
- [ ] If `load()` returns `null` (missing or unreadable save), an error message is shown in the menu and `onLoad` is not called.
- [ ] The menu closes automatically after a successful load (calls `onClose`).
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: loading a slot resumes the game at the saved state.

---

### US-004: Developer mounts the component
**As a** developer, **I want** to mount `VnSaveMenu` with a minimal set of props **so that** I can add the save/load UI to my game without writing boilerplate.

**Acceptance Criteria:**
- [ ] `VnSaveMenu` accepts the following typed props:
  - `saveManager: SaveManager` — the game's existing `SaveManager` instance.
  - `getState: () => GameSaveState` — callback that returns the current serialisable game state.
  - `onLoad: (state: GameSaveState) => void` — callback invoked when the player loads a slot.
  - `isOpen: boolean` — controls visibility.
  - `onClose: () => void` — called when the player dismisses the menu.
- [ ] The component is exported from `framework/components/VnSaveMenu.tsx`.
- [ ] JSDoc is present on the component and all props.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: component mounts without errors in a sample game.

---

### US-005: Quick-save
**As a** player, **I want** to quick-save without opening the menu **so that** I can save progress instantly with a single action.

**Acceptance Criteria:**
- [ ] A `VnQuickSave` button component (or a `quickSave` export) is provided that, when triggered, calls `saveManager.save(1, getState())` (slot 1 is the designated quick-save slot).
- [ ] The component accepts `saveManager: SaveManager` and `getState: () => GameSaveState` as props.
- [ ] A brief, non-blocking confirmation message is shown to the player after a successful quick-save (e.g. "Game saved").
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: quick-save writes to slot 1; confirmation message appears and fades.

---

## Functional Requirements
- FR-1: `VnSaveMenu` must not modify `SaveManager` — it only calls existing public methods (`save`, `load`, `listSlots`).
- FR-2: All components must use TypeScript strict mode; no `any` types.
- FR-3: Components follow framework naming conventions: PascalCase, `.tsx` extension, exported as named exports.
- FR-4: Private state (slot list, error messages) is managed with React local state (`useState`); no external state library.
- FR-5: The slot list must be refreshed by calling `listSlots()` each time the menu opens or a save action completes.
- FR-6: Quick-save slot is always slot number `1`; this must be a named constant, not a magic number.

## Non-Goals (Out of Scope)
- Deleting save slots from the UI (covered by existing `deleteSlot` API but not part of this MVP).
- Keyboard navigation / accessibility enhancements beyond basic Escape-to-close.
- Custom theming or CSS framework integration.
- Modifying or extending `SaveManager` internals.
- Auto-save UI (auto-save already works silently via `SaveManager.autoSave`).

## Open Questions
- None
