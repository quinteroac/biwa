# Project Context

<!-- Created or updated by `bun nvst create project-context`. Cap: 250 lines. -->

## Conventions
- Naming: PascalCase for classes and React components (`GameEngine`, `VnApp`); camelCase for methods and variables; `.d.ts` for pure type files
- File extensions: `.ts` for modules, `.tsx` for React components, `.d.ts` for type declarations
- Git flow: trunk on `master`; no branching strategy enforced yet
- Imports: verbatim module syntax — include explicit `.ts`/`.tsx` extensions on all local imports

## Tech Stack
- Language: TypeScript 5.8 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`)
- Runtime: Bun (latest)
- Frameworks: React 19 (JSX transform `react-jsx`), inkjs 2.x (Ink narrative engine)
- Key libraries: `js-yaml` (YAML parsing in manager CLI)
- Package manager: Bun (`bun.lock`)
- Build / tooling: Bun bundler (`moduleResolution: bundler`); CLI entry at `manager/cli.ts`; no separate transpile step

## Code Standards
- Style patterns: private fields via `#field` (not `_field`); no `public` keyword; `Object.freeze` for constants
- Error handling: non-fatal IO (localStorage, fetch) uses `try/catch` + `console.warn`; fatal config errors throw
- Module organisation: one class per file; types co-located in `framework/types/*.d.ts`
- Forbidden patterns: `any`; `state: unknown` without a narrowing type (being replaced by `GameSaveState`)
- JSDoc: required on all public methods (parameter, return type, side effects)

## Testing Strategy
- Approach: critical paths only (no TDD enforced yet)
- Runner: Bun built-in (`bun test`) — no vitest/jest configured
- Test location: co-located or `__tests__/` adjacent to the module under test
- Coverage targets: none set

## Product Architecture
```
GameEngine (singleton)
  ├── ScriptRunner  — inkjs Story, tag parsing, step/choose
  ├── VariableStore — reactive key/value store, snapshot/restore
  ├── SaveManager   — localStorage slot persistence, schema versioning
  ├── AssetLoader   — fetch-based asset loading
  ├── MinigameRegistry — dynamic minigame loader
  └── EventBus      — typed pub/sub backbone

React UI (framework/components/)
  VnApp → VnStage → VnBackground, VnCharacter, VnDialog, VnChoices, VnTransition
```
- Data flow: `GameEngine` emits events on `EventBus`; React components subscribe and re-render
- Persistence: `localStorage` keyed as `vn:{gameId}:save:{slot}`

## Modular Structure
- `framework/engine/` — core engine classes (GameEngine, ScriptRunner, VariableStore, EventBus)
- `framework/components/` — React UI layer, stateless consumers of EventBus
- `framework/types/` — shared `.d.ts` type declarations (game-config, characters, scenes, audio, minigames, **save**)
- `framework/SaveManager.ts` — slot-based save/load with localStorage
- `framework/AssetLoader.ts` — async asset fetch helper
- `framework/minigames/` — MinigameBase, MinigameRegistry
- `framework/TagParser.ts` — Ink tag → command object parser
- `games/` — individual game instances consuming the framework
- `manager/` — CLI tooling (`bun run dev/build/new/list`)

## Implemented Capabilities
<!-- Updated at the end of each iteration -->
- (none yet — populated after first Refactor)
