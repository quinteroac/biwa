# Packaging Roadmap

This document records the package publishing decision for the framework. It is a plan, not an npm publishing implementation.

## Package Names

Use scoped packages when the project is ready to publish:

| Package | Contents | Current local source |
|---|---|---|
| `@vn-experiment/core` | Engine, React components, renderer registry, save/audio/player services and public types. | `framework/` |
| `@vn-experiment/manager` | CLI commands: `new`, `dev`, `doctor`, `build`, `preview`, `assets`, `plugins`. | `manager/` |
| `@vn-experiment/plugins` | Official prebuilt plugin factories and catalog metadata. | `framework/plugins/prebuilt/` |
| `@vn-experiment/templates` | Starter game templates and smoke fixture seeds. | `games/smoke-fixture/` plus CLI template files |

The current local imports stay supported during development:

```ts
import { officialPlugins } from '../../framework/plugins/prebuilt/index.ts'
```

Future published-game imports should become:

```ts
import { officialPlugins } from '@vn-experiment/plugins'
```

## Versioning Policy

The framework packages share one release version until the first public package split proves it needs independent cadence.

Semver rules:

- Patch: bug fixes, documentation clarifications, internal refactors, diagnostics that do not change valid game content.
- Minor: additive APIs, new official plugins, new renderer types, new CLI commands, new optional config fields.
- Major: breaking runtime behavior, removed APIs, required data shape changes, incompatible `pluginApi` changes.

Official plugin statuses remain independent from package semver:

- `stable`: public plugin contract follows semver strictly.
- `experimental`: usable and tested, but options may change in a minor before 1.0.
- `planned`: catalog placeholder only; not callable at runtime.

## Plugin Changelogs

Keep a top-level `CHANGELOG.md` entry for every release. When official plugins become publishable, add plugin-scoped sections under `Unreleased`:

```md
### Plugins

#### official-screen-effects

- Added `heartbeat`.

#### official-aseprite-character-atlas

- Tightened `animation.expressions` diagnostics.
```

Breaking plugin changes must include:

- affected plugin id.
- affected renderer/tag/data contract.
- migration steps.
- minimum compatible `pluginApi`.

## Plugin API Migration Plan

Current contract:

```ts
compatibility: { pluginApi: 'vn-plugin-api-v1' }
```

When introducing `vn-plugin-api-v2`:

1. Add the new API constant in the registry while keeping v1 loadable for one major line.
2. Update official prebuilt plugins first.
3. Teach `doctor` to report actionable migration warnings for v1 plugins.
4. Document changed context fields, events, renderer props and tag behavior.
5. Add codemod or CLI guidance only when the change is mechanical enough.
6. In the next major, reject unsupported APIs early through `doctor`, build and runtime manifest validation.

Production build manifests must keep recording:

```json
{
  "pluginPolicy": {
    "apiVersion": "vn-plugin-api-v1",
    "load": "declared-plugins-only",
    "remoteEntriesAllowed": false
  }
}
```

## Migration From Local Imports

Package publishing should be a shallow import migration:

| Today | Future |
|---|---|
| `../../framework/engine/GameEngine.ts` | `@vn-experiment/core/engine` |
| `../../framework/components/VnApp.tsx` | `@vn-experiment/core/react` |
| `../../framework/plugins/prebuilt/index.ts` | `@vn-experiment/plugins` |
| `bun manager/cli.ts build my-game` | `vnx build my-game` or `bunx @vn-experiment/manager build my-game` |

Do not implement a remote marketplace in this step. Official plugins remain explicit imports and local game plugins remain trusted local code.

## Pre-Publish Checklist

Before turning this plan into actual packages:

- Define public export maps for core, React components, plugin types and CLI entrypoints.
- Add package-level smoke tests that import only public exports.
- Ensure generated `dist/<gameId>/manifest.json` records package versions.
- Decide whether templates are copied by the manager package or installed as a separate package dependency.
- Document peer dependencies for React and Ink.
- Keep `bun run verify` green after replacing one fixture with package-style imports.
