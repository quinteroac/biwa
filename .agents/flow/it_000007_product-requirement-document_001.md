# Requirement: Improve Dialog-To-Choices Flow

## Context
The current visual novel framework can move from dialog to choices too quickly. In the reviewed flow, `VnDialog` immediately reveals dialog with `advanceMode: 'choices'` and calls completion, which lets `VnStage` call `engine.advance()` and causes `GameEngine` to emit choices without giving the player a normal read-and-confirm step. There is also no explicit guard against duplicate advances while async steps, tags, transitions, or completion callbacks are being processed.

This change should improve the dialog-to-options sequencing in the framework while keeping existing Ink stories, tags, game configuration, and `games/mi-novela` content compatible.

## Goals
- Ensure dialog that precedes choices is presented at the normal dialog pace instead of appearing and advancing instantly.
- Ensure choices appear only after the preceding dialog is complete and the player confirms advancement.
- Prevent duplicate advancement caused by rapid clicks, keyboard input, typing completion callbacks, or async engine work.
- Preserve compatibility with existing Ink files, tags, game configuration, and game content.

## User Stories
Each story must be small enough to implement in one focused session.

### US-001: Present Pre-Choice Dialog Normally
**As a** framework dialog flow, **I want** dialog that precedes choices to use the standard typing/reveal behavior **so that** the player can read the line before the choices become available.

**Acceptance Criteria:**
- [ ] When a story step contains dialog followed by choices, the dialog text is not revealed instantly because of `advanceMode: 'choices'`.
- [ ] The dialog uses the same typing cadence and skip behavior as normal dialog lines.
- [ ] Skipping a typing dialog reveals the full line but does not immediately show choices unless the player advances again.
- [ ] Existing non-choice dialog behavior remains unchanged.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser.

### US-002: Show Choices Only After Player Confirmation
**As a** framework dialog flow, **I want** choices to appear only after the player confirms that the preceding dialog can advance **so that** the player does not lose reading context before selecting an option.

**Acceptance Criteria:**
- [ ] When dialog has pending choices, the choices are stored until the player clicks or presses an accepted advance key after the dialog is fully revealed.
- [ ] Choices are not emitted from `engine:choices` automatically from a dialog completion callback.
- [ ] Click, Enter, Space, and ArrowRight reveal text first when typing, then show choices only on a later advance action.
- [ ] Existing Ink story files and tag/config formats require no changes.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser.

### US-003: Guard Against Duplicate Advances
**As a** framework engine, **I want** a clear guard around advancement processing **so that** rapid input, callbacks, tags, transitions, or async work cannot skip dialog lines or process multiple steps concurrently.

**Acceptance Criteria:**
- [ ] The engine ignores or queues duplicate advance requests while an advance operation is already in progress.
- [ ] Rapid repeated clicks or key presses do not skip multiple dialog lines.
- [ ] Advance requests are blocked while the engine is in non-dialog states such as `CHOICES`, `TRANSITION`, `MINIGAME`, or `ENDED`.
- [ ] Transition and minigame flows still complete and return control to dialog without deadlocking.
- [ ] Existing Ink story files and tag/config formats require no changes.
- [ ] Typecheck / lint passes.
- [ ] Visually verified in browser.

## Functional Requirements
- FR-1: The framework must remove the instant-complete behavior for dialog lines whose next step is choices.
- FR-2: The framework must keep pending choices hidden until the player explicitly advances after the preceding dialog is fully revealed.
- FR-3: The framework must preserve the current input contract: click, Enter, Space, and ArrowRight advance dialog, while choice selection remains handled by the choices UI.
- FR-4: The framework must prevent concurrent or duplicate calls into the engine advancement flow.
- FR-5: The framework must continue to process existing tags, transitions, minigames, audio events, saves, and end screens without requiring story or config migrations.
- FR-6: The implementation must stay within framework-level dialog/engine/UI flow files and must not require edits to `games/mi-novela` content.
- FR-7: The implementation must preserve existing public APIs unless a minimal internal API adjustment is required for the advance guard.

## Non-Goals (Out of Scope)
- Rewriting Ink story files or changing the Ink authoring format.
- Changing tag syntax, game configuration schema, or `games/mi-novela` data/content.
- Redesigning the visual appearance of the dialog box or choices UI.
- Adding a new auto-play mode, text speed settings, backlog, history view, or pause menu behavior.
- Refactoring unrelated save/load, audio, minigame, or CLI functionality.

## Open Questions
None.
