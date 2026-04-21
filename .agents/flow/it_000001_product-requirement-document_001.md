# Save System (Headless)

## Context

The framework already has a minimal `SaveManager.ts` with `state: unknown` — functional but untyped and not integrated with the engine's actual state shape. There is no defined contract for what "game state" means across the `VariableStore`, `ScriptRunner` (Ink story), and `GameEngine`. Before building any save/load UI, the save system needs a solid, typed, headless foundation that the engine can call directly.

## Goals

- Define a canonical `GameSaveState` type that captures everything needed to fully restore a session.
- Replace the `state: unknown` field in `SaveManager` with the typed `GameSaveState`.
- Add slot metadata (display name, scene name, timestamp, playtime) to support a future menu UI without changing the core API.
- Expose a clean public API: `save`, `load`, `listSlots`, `deleteSlot`, `autoSave`.
- Support schema versioning with a migration hook so future state shape changes don't break existing saves.

## User Stories

### US-001: Save game state to a slot
**As a** game developer, **I want** to call `saveManager.save(slot, state)` with a fully typed payload **so that** the complete game state is persisted to `localStorage` without runtime type errors.

**Acceptance Criteria:**
- [ ] `save(slot, state)` accepts a `GameSaveState` object (not `unknown`) and serializes it to `localStorage` under the key `vn:{gameId}:save:{slot}`.
- [ ] The persisted JSON includes `version`, `timestamp`, `meta` (displayName, sceneName, playtime), and `state` fields.
- [ ] Calling `save` on a slot that already has data overwrites it silently.
- [ ] If `localStorage` is unavailable or throws, a `console.warn` is emitted and no uncaught exception propagates.

### US-002: Load game state from a slot
**As a** game developer, **I want** to call `saveManager.load(slot)` and receive a typed `SaveSlot` object or `null` **so that** I can restore the engine state without manual casting.

**Acceptance Criteria:**
- [ ] `load(slot)` returns `SaveSlot | null` — `null` when the slot is empty or the stored JSON is unparseable.
- [ ] If the stored `version` is older than the current schema version, the registered migration function is called before the data is returned.
- [ ] The returned object's `state` field is typed as `GameSaveState`.

### US-003: List all occupied slots
**As a** game developer, **I want** to call `saveManager.listSlots()` and get an array of occupied slots with metadata **so that** I can render a slot picker in the future without coupling the UI to localStorage keys.

**Acceptance Criteria:**
- [ ] `listSlots()` returns `SaveSlot[]` containing only slots that have data (empty slots are omitted).
- [ ] Each entry exposes `slot` (number | `'auto'`), `meta` (displayName, sceneName, playtime, timestamp), and `state`.
- [ ] The list is ordered: `'auto'` slot first, then numeric slots ascending.

### US-004: Delete a save slot
**As a** game developer, **I want** to call `saveManager.deleteSlot(slot)` **so that** I can programmatically clear a slot (e.g. "New Game" overwrite confirmation flow).

**Acceptance Criteria:**
- [ ] `deleteSlot(slot)` removes the entry from `localStorage` and emits no error if the slot was already empty.
- [ ] The existing `delete(slot)` method is kept as a deprecated alias to avoid breaking current call sites, and logs a `console.warn` pointing to `deleteSlot`.

### US-005: Auto-save
**As a** game developer, **I want** to call `saveManager.autoSave(state)` at scene transitions **so that** the player's progress is preserved without manual intervention.

**Acceptance Criteria:**
- [ ] `autoSave(state)` calls `save('auto', state)` only when `autoSaveEnabled` is `true`.
- [ ] `autoSave` accepts the same typed `GameSaveState` as `save`.
- [ ] If `autoSaveEnabled` is `false`, calling `autoSave` is a no-op with no error.

### US-006: Schema version migration
**As a** framework maintainer, **I want** to register a migration function on `SaveManager` **so that** saves written with an older schema version are automatically upgraded on load without data loss.

**Acceptance Criteria:**
- [ ] `SaveManager` exports a static `CURRENT_VERSION` constant (initially `2`, incrementing the existing `1`).
- [ ] A `registerMigration(fromVersion, fn)` method accepts a function `(oldData: unknown) => GameSaveState`.
- [ ] When `load` reads a slot with `version < CURRENT_VERSION`, it runs all registered migrations in order and returns the upgraded data.
- [ ] If no migration is registered for an old version, `load` returns `null` and logs a warning.

---

## Functional Requirements

- FR-1: Define and export a `GameSaveState` interface in `framework/types/save.d.ts` with fields: `inkState: string` (Ink story JSON from `story.state.ToJson()`), `variables: Record<string, unknown>` (from `VariableStore.snapshot()`), `sceneId: string`, and `engineState: string`.
- FR-2: Define and export a `SaveSlotMeta` interface in `framework/types/save.d.ts` with fields: `displayName: string`, `sceneName: string`, `playtime: number` (seconds), `timestamp: number` (Unix ms).
- FR-3: Define and export a `SaveSlot` interface in `framework/types/save.d.ts` combining `slot: number | 'auto'`, `version: number`, `meta: SaveSlotMeta`, and `state: GameSaveState`.
- FR-4: Update `SaveManager.ts` to replace all `state: unknown` / `SaveData` references with the new typed interfaces.
- FR-5: Implement `registerMigration(fromVersion: number, fn: (old: unknown) => GameSaveState): void` on `SaveManager`.
- FR-6: Add `static readonly CURRENT_VERSION = 2` to `SaveManager`.
- FR-7: Rename `delete` → `deleteSlot`; keep `delete` as a deprecated alias with a `console.warn`.
- FR-8: All public methods must have JSDoc comments documenting parameters, return type, and side effects.

## Non-Goals

- No UI components (slot picker, save confirmation dialog, thumbnails/screenshots).
- No IndexedDB or cloud save integration — `localStorage` only in this iteration.
- No automatic save triggering from inside the engine — callers invoke `save`/`autoSave` explicitly.
- No compression or encryption of save data.

## Open Questions

- Should `playtime` be tracked by `SaveManager` internally (requires a clock reference) or passed in by the caller? Recommendation: passed in by the caller to keep `SaveManager` stateless.
- Should `engineState` be typed as the `EngineState` union from `GameEngine` or kept as `string` to avoid a circular import? Recommendation: `string` for now, narrowed later.
