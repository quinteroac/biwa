# Visual Novel Experiment

A TypeScript visual novel framework built around Ink, React and Bun.

The project includes:

- `framework/`: engine, React components, save/load, audio, minigames and docs.
- `manager/`: CLI commands for `new`, `dev`, `doctor`, `build` and `list`.
- `games/mi-novela/`: richer demo game.
- `games/smoke-fixture/`: tiny fixture used by CI.

## Quick Start

```bash
bun install
bun manager/cli.ts new my-novel "My Novel"
bun manager/cli.ts doctor my-novel
bun manager/cli.ts dev my-novel
```

Open the dev server URL printed by the CLI.

## Core Commands

```bash
bun run check                  # tests + typecheck
bun run e2e                    # browser smoke against the built smoke fixture
bun manager/cli.ts doctor mi-novela
bun manager/cli.ts doctor mi-novela --json
bun manager/cli.ts assets character-atlas mi-novela kai
bun manager/cli.ts build mi-novela
bun run verify                 # CI-style check against smoke-fixture
```

## Distribution

Production builds are static ESM packages:

```bash
bun manager/cli.ts build mi-novela
```

Output is written to `dist/mi-novela/` with a post-build smoke check and `manifest.json` size report.

See [framework/docs/distribution.md](framework/docs/distribution.md).

## Creator Docs

- [First game guide](framework/docs/first-game.md)
- [GameEngine API](framework/docs/game-engine-api.md)
- [Diagnostics](framework/docs/diagnostics.md)
- [Aseprite atlas JSON](framework/docs/aseprite-atlas.md)
- [Ink tag guide](framework/docs/ink-tags.md)
- [Project structure](framework/docs/project-structure.md)
- [Customizing components](framework/docs/customizing-components.md)
- [Distribution](framework/docs/distribution.md)

## Feature Matrix

| Area | Status |
|---|---|
| Ink story runtime | Stable baseline |
| Unified tag parser | Implemented |
| Data pipeline | Recursive indexes, doctor validation, build conversion |
| Save/load | Story, variables, visual scene, characters, audio and locale |
| Audio | Extracted runtime manager, persisted master/bgm/ambience/sfx/voice volumes |
| UI customization | Typed app and stage component overrides |
| Distribution | Static ESM build with import map and smoke checks |
| Portal/embedded packaging | Planned |
| Browser E2E smoke | Implemented |

## Quality Gate

Before opening a PR, run:

```bash
bun run verify
```

This executes tests, typecheck, doctor, a production build of the lightweight fixture and Playwright browser smoke.
