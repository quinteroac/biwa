# Requirement: Start Menu Component

## Context
The framework boots directly into `VnStage` the moment `mountVnApp` is called, giving
the player no chance to choose whether to start fresh or resume a saved session.
A `VnStartMenu` component is needed to sit between app mount and stage start,
presenting the title and core navigation actions before gameplay begins.

## Goals
- Give players a clear entry point before the game script starts executing.
- Allow players to resume progress without navigating through mid-game save menus.
- Let developers control which menu options are exposed, following the same
  `show*` prop pattern already established by `SaveControlsBar`.

## User Stories

### US-001: Player sees the start menu with the game title
**As a** player, **I want** to see a styled start menu with the game's title when I open the game **so that** I know what I'm about to play and have a moment to choose my action.

**Acceptance Criteria:**
- [ ] `VnStartMenu` is rendered by `VnApp` before `VnStage` mounts.
- [ ] The game title is displayed prominently on screen.
- [ ] `VnStage` is not rendered (and `engine.start()` is not called) until the player picks an action.
- [ ] Visually verified in browser: title is readable, layout matches the dark/purple VN aesthetic (`--vn-accent: #c084fc`, Georgia font).

---

### US-002: Player can start a new game from the menu
**As a** player, **I want** to click "New Game" **so that** the story begins from the very first line.

**Acceptance Criteria:**
- [ ] A "New Game" button is visible and clickable on the start menu.
- [ ] If `SaveManager` reports at least one existing save, clicking "New Game" first shows an inline confirmation prompt ("Start over? Your saves will not be deleted.") with "Confirm" and "Cancel" actions.
- [ ] If no saves exist, clicking "New Game" proceeds immediately without a confirmation step.
- [ ] Confirming (or clicking "New Game" with no saves) unmounts `VnStartMenu`, mounts `VnStage`, and calls `engine.start()`.
- [ ] Visually verified in browser: clicking "New Game" transitions to the stage and the first dialog line appears.

---

### US-003: Player can continue a saved game from the menu
**As a** player, **I want** to click "Continue" to resume from my last save **so that** I don't have to replay content I've already seen.

**Acceptance Criteria:**
- [ ] A "Continue" button is visible on the start menu.
- [ ] The button is **disabled** (non-interactive, visually dimmed) when `SaveManager` reports no saves exist across any slot.
- [ ] When at least one save exists, clicking "Continue" loads the most recently written save slot, then mounts `VnStage`.
- [ ] Visually verified in browser: button is dimmed with no saves; clicking it with a save restores game state on the stage.

---

### US-004: Developer can configure which menu options are visible
**As a** developer, **I want** to pass props to control which buttons appear in the start menu **so that** I can tailor the menu to my game's needs (e.g. hide "Continue" in a demo build).

**Acceptance Criteria:**
- [ ] `VnStartMenu` accepts `showNewGame?: boolean` (default `true`) — hides the "New Game" button when `false`.
- [ ] `VnStartMenu` accepts `showContinue?: boolean` (default `true`) — hides the "Continue" button when `false`.
- [ ] `mountVnApp` (in `VnApp.tsx`) is updated to accept and forward these props.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: passing `showContinue={false}` removes the button from the DOM.

---

## Functional Requirements
- FR-1: `VnApp` must track a boolean state (`started`) that switches from `false` to `true` when the player selects "New Game" or "Continue". Only when `started === true` is `VnStage` rendered.
- FR-2: `VnStartMenu` receives `engine` (for `SaveManager` access), `onNewGame: () => void`, and `onContinue: (state: GameSaveState) => void` callbacks.
- FR-3: "Most recent save" is defined as the slot with the highest `savedAt` timestamp among all non-empty slots returned by `SaveManager`.
- FR-4: The game title displayed in the menu must come from a `title` prop passed to `VnStartMenu` (or forwarded from `mountVnApp`).
- FR-5: Visual style must follow the existing convention: dark background, `var(--vn-accent, #c084fc)` borders/text accents, `var(--vn-font, "Georgia", serif)` typography, inline styles (no external CSS).
- FR-6: `mountVnApp` is updated to accept and forward `showSlotMenu`, `showQuickSave`, and `showAutoSave` to `VnStage`, so all display configuration is available from the single framework entry point.

## Non-Goals (Out of Scope)
- A settings/options screen or volume controls accessible from the menu.
- Animated transitions between the menu and the stage (fade-in, etc.).
- A "Load Game" slot-picker within the start menu (players can use the in-game `VnSaveMenu` for that).
- Persisting the "last played slot" index separately — use `savedAt` ordering on existing slots.

## Open Questions
- None.
