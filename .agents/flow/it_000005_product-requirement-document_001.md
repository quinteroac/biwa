# Requirement: End Screen Component

## Context
The visual novel framework currently has no way to signal the story's conclusion to the player. When the Ink script finishes, the UI stays on the last scene with no clear closure. This feature adds a `VnEndScreen` component that is shown when the story ends, giving the player a proper conclusion moment and a path back to the main menu.

## Goals
- Provide a clear, configurable end-of-story screen consistent with the existing framework visual style.
- Let game developers trigger the end screen declaratively from the Ink script via a tag.
- Allow developers to set default end screen copy in `GameConfig`, keeping game-specific content out of framework code.

## User Stories

### US-001: Player sees the end screen when the story reaches its conclusion
**As a** player, **I want** the end screen to appear when the Ink story emits the `# end_screen` tag **so that** I know the story has concluded.

**Acceptance Criteria:**
- [ ] When the Ink script contains the tag `# end_screen`, `TagParser` produces a `TagCommand` with `type: "end_screen"`.
- [ ] `GameEngine` processes this command and emits an `"end_screen"` event on `EventBus`.
- [ ] `VnApp` listens for the `"end_screen"` event and transitions the UI state from `VnStage` to `VnEndScreen` (VnStage is unmounted).
- [ ] `VnEndScreen` renders over a full-screen dark background with a title and optional message.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: playing through a story to `# end_screen` shows the end screen.

### US-002: Developer can configure the title and message shown on the end screen
**As a** game developer, **I want** to set the default end screen title and message in `GameConfig` **so that** each game can have custom end-of-story copy without modifying framework code.

**Acceptance Criteria:**
- [ ] `GameConfig` has an optional `endScreen?: { title?: string; message?: string }` field.
- [ ] `VnEndScreen` displays `GameConfig.endScreen.title` (fallback: `"The End"`) as the heading.
- [ ] `VnEndScreen` displays `GameConfig.endScreen.message` as a subtitle when provided; the element is absent when the field is omitted.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: setting `endScreen.title` and `endScreen.message` in config renders correctly.

### US-003: Player can return to the main menu from the end screen
**As a** player, **I want** a "Return to Menu" button on the end screen **so that** I can go back to the start menu after finishing the story.

**Acceptance Criteria:**
- [ ] `VnEndScreen` renders a "Return to Menu" button styled consistently with `VnStartMenu` buttons.
- [ ] Clicking "Return to Menu" unmounts `VnEndScreen` and re-renders `VnStartMenu` (engine state is reset so `hasSaves` reflects current saves).
- [ ] The button is keyboard-focusable and activatable with Enter/Space.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser: clicking the button navigates back to `VnStartMenu`.

## Functional Requirements
- **FR-1:** `TagParser` must recognise the tag type `end_screen` and return a `TagCommand` with `type: "end_screen"`. Optional key-value fields (`title`, `message`) on the tag are forwarded as-is on the command object.
- **FR-2:** `GameEngine` must handle a `TagCommand` of `type: "end_screen"` by emitting an `"end_screen"` event on `EventBus`, carrying an optional payload `{ title?: string; message?: string }`.
- **FR-3:** `VnApp` must subscribe to the `"end_screen"` event on mount and transition to a new `"ended"` UI state when it fires.
- **FR-4:** A new `VnEndScreen` component must be created at `framework/components/VnEndScreen.tsx`. It accepts props: `title: string`, `message?: string`, `onReturnToMenu: () => void`.
- **FR-5:** `VnApp` must resolve the `title` shown on `VnEndScreen` by preferring the event payload, then `GameConfig.endScreen.title`, then the fallback string `"The End"`.
- **FR-6:** The optional `endScreen` field must be added to the `GameConfig` interface in `framework/types/game-config.d.ts`.
- **FR-7:** `VnEndScreen` visual style must match `VnStartMenu` — same dark gradient background, same accent colour variable (`--vn-accent`), same font variable (`--vn-font`).

## Non-Goals (Out of Scope)
- Animated transitions into or out of the end screen (fade-in/out).
- A save prompt before displaying the end screen.
- Multiple named ending variants rendered differently (beyond title/message copy differences).
- Auto-play credits or scrolling text.

## Open Questions
- Should the `# end_screen` tag allow per-invocation title/message overrides (e.g. `# end_screen, title: Good Ending, message: You saved everyone`) that take precedence over `GameConfig.endScreen`? FR-1 and FR-5 are written to support this, but it is not covered by a dedicated user story — confirm whether a test/AC is needed.
