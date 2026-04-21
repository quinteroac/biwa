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
