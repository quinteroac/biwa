# Lessons Learned — Iteration 000001

## US-001 — Save game state to a slot

**Summary:** Introduced a typed `GameSaveState` interface (with `meta` and `state` fields) in `framework/types/save.d.ts` and updated `SaveManager.ts` to use it, replacing the previous `unknown` parameter. Tests cover all four acceptance criteria using a lightweight in-memory localStorage stub.

**Key Decisions:**
- `SaveData` (the persisted shape) and `GameSaveState` (the caller's payload) are kept as separate types: `SaveData` adds `version` and `timestamp` which the manager controls, while `GameSaveState` carries only `meta` + `state` (what the game developer provides).
- `SlotInfo` was moved from a local interface in `SaveManager.ts` into `framework/types/save.d.ts` to keep all persistence-related types co-located and importable by other modules.
- All type imports use verbatim module syntax with `.d.ts` extension (project convention).

**Pitfalls Encountered:**
- Bun's `bun:test` exposes `spyOn` but requires `.mockImplementation(() => {})` chained immediately — calling `spyOn` alone without mocking doesn't suppress the original function output.
- `Object.defineProperty` with `writable: true` is necessary when re-assigning `globalThis.localStorage` inside a test to simulate a failing storage object; a plain assignment throws in strict mode.

**Useful Context for Future Agents:**
- `framework/types/save.d.ts` is now the canonical source for `GameSaveState`, `SaveData`, `SaveMeta`, and `SlotInfo` — import from there rather than declaring local duplicates.
- `SaveManager.load()` still casts the JSON parse result as `SaveData` without runtime validation; a future story may want to add a schema-version guard or Zod parsing.
- Tests live in `framework/__tests__/` — this is the first test file in the repo, establishing the pattern for co-located `__tests__` directories.

## US-002 — Load game state from a slot

**Summary:** Updated `SaveManager.load()` to return `SaveSlot | null` instead of `SaveData | null`. Added `registerMigration(fromVersion, fn)` method and a `#migrations` map. The returned `SaveSlot.state` is typed as `GameSaveState`. Also added `SaveSlot` to `save.d.ts` and updated `SlotInfo.data` from `SaveData` to `SaveSlot`.

**Key Decisions:**
- `SaveSlot` is the caller-facing shape: `{ version, timestamp, state: GameSaveState }`. `SaveData` remains the internal localStorage serialisation format.
- Migrations are keyed by `fromVersion` (integer) and applied in a `while (v < SCHEMA_VERSION)` loop, supporting multi-step chains without extra complexity.
- `SlotInfo.data` was updated from `SaveData` to `SaveSlot` so that `listSlots()` stays consistent with the `load()` return type — this is a breaking change for callers relying on the old `SlotInfo.data.meta` access pattern (no external callers currently).

**Pitfalls Encountered:**
- The migration `while` loop increments `v` unconditionally, so unregistered version gaps are silently skipped. This is intentional but should be documented if future stories add strict gap validation.
- `store` (the test's raw backing object for the localStorage mock) can be written directly in tests to inject old-format saves without going through `save()` — useful for migration tests.

**Useful Context for Future Agents:**
- `SaveSlot` is now the canonical load return type — import from `framework/types/save.d.ts`.
- `SCHEMA_VERSION` is a module-level constant in `SaveManager.ts`; bump it there when the save schema evolves.
- Tests for `load()` live in the `SaveManager.load` describe block in `framework/__tests__/SaveManager.test.ts`, immediately after the `SaveManager.save` block.

## US-003 — List all occupied slots

**Summary:** Implemented `listSlots()` returning a flat `SlotInfo[]` with `slot`, `meta` (SaveMeta fields + `timestamp`), and `state`. Updated `SlotInfo` in `save.d.ts` from `{ slot, data: SaveSlot }` to `{ slot, meta: SaveMeta & { timestamp }, state }`. The method iterates `['auto', 1..N]` slots in order, calls `load()` on each, and maps present results to the flat shape.

**Key Decisions:**
- `SlotInfo` was redesigned from a nested `{ slot, data: SaveSlot }` to a flat UI-friendly shape, merging `timestamp` into `meta` rather than leaving it at the top level — this matches the AC02 spec precisely and makes slot-picker rendering straightforward.
- Ordering (`'auto'` first, then ascending numerics) is guaranteed by the slot iteration order in `listSlots()`, not by sorting after the fact.
- `listSlots()` reuses `load()` internally, so migrations apply automatically when listing.

**Pitfalls Encountered:**
- The previous `SlotInfo` (from US-002) had `data: SaveSlot` which conflicted with the flat shape required by AC02. Updating it is a breaking change but there were no external callers.
- `timestamp` lives on `SaveSlot` (not on `SaveMeta`), so the merge `{ ...loaded.state.meta, timestamp: loaded.timestamp }` is necessary to satisfy AC02.

**Useful Context for Future Agents:**
- `SlotInfo` is now a flat structure: `{ slot, meta: SaveMeta & { timestamp }, state }` — do not expect a nested `data` field.
- Tests for `listSlots()` live in the `SaveManager.listSlots` describe block, inserted between the `SaveManager.save` and `SaveManager.load` blocks in `framework/__tests__/SaveManager.test.ts`.
