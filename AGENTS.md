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
- Build / tooling: Bun bundler (`moduleResolution: bundler`); CLI entry at `manager/cli.ts`; production build transpiles framework/game TS to static ESM output under `dist/<gameId>/`

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

## Theming / CSS Variables Convention
All components use CSS custom properties (variables) for every color and font value, never hardcoded literals.
`GameEngine.applyTheme()` sets variables on `document.documentElement` from `game.config.ts → theme`.
Games override any variable via `theme.cssVars` in their `game.config.ts`.

### Available CSS variables (with fallbacks)
| Variable | Fallback | Controls |
|---|---|---|
| `--vn-font` | `"Georgia", serif` | All component fonts |
| `--vn-accent` | `#c084fc` | Buttons, borders, arrow indicator |
| `--vn-dialog-bg` | `rgba(10,10,20,0.85)` | Dialog box and unfocused choices |
| `--vn-dialog-text` | `#f8f8f8` | Dialog body text, choice text |
| `--vn-name-color` | `#e2e8f0` | Speaker name in dialog |
| `--vn-choice-hover` | `rgba(192,132,252,0.15)` | Focused/hovered choice background |
| `--vn-menu-bg` | `linear-gradient(160deg, #0a0014 …)` | Start menu full background |
| `--vn-menu-bg-solid` | `#0a0014` | Hover text color on accent buttons (start menu) |
| `--vn-menu-text` | `#e2e8f0` | Start menu general text and Cancel hover text |
| `--vn-menu-text-muted` | `#cbd5e1` | Start menu confirmation message |
| `--vn-menu-cancel-hover-bg` | `rgba(226,232,240,0.1)` | Cancel button hover background |
| `--vn-end-bg` | `#000` | End screen background and button hover text |
| `--vn-end-color` | `#fff` | End screen text color |
| `--vn-stage-bg` | `#000` | Stage base container background |

### Pattern — DO / DON'T
```ts
// ✅ correct
color: 'var(--vn-dialog-text, #f8f8f8)'

// ❌ wrong — breaks theming
color: '#f8f8f8'
```

## Component Customization Strategy

Games **never modify framework source files**. Two levels are available:

1. **CSS variables** — override colors, fonts, spacing via `game.config.ts → theme.cssVars`. All framework components read every visual value from CSS custom properties. This is always the first option.
2. **Component overrides** — pass `components` to `mountVnApp` or `VnStage` to replace start menu, end screen, stage internals, dialog, choices, save UI, volume UI, transitions, background or characters without forking framework source.

`GameEngine`, `ScriptRunner`, `SaveManager`, and `EventBus` have no React dependency and can be used without any framework UI component.

> Full guide: [`framework/docs/customizing-components.md`](../framework/docs/customizing-components.md)