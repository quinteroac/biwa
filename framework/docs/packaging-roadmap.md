# Packaging Roadmap

This document records the package publishing decision for the framework. It is a plan, not an npm publishing implementation.

## Package Names

Use scoped packages when the project is ready to publish:

| Package | Contents | Current local source |
|---|---|---|
| `@biwa/core` | Engine, React components, renderer registry, save/audio/player services and public types. | `framework/` |
| `@biwa/manager` | CLI commands: `new`, `dev`, `doctor`, `build`, `preview`, `assets`, `plugins`. | `manager/` |
| `@biwa/plugins` | Official prebuilt plugin factories and catalog metadata. | `framework/plugins/prebuilt/` |
| `@biwa/templates` | Starter game templates and smoke fixture seeds. | `games/smoke-fixture/` plus CLI template files |

The current local imports stay supported during development:

```ts
import { officialPlugins } from '../../framework/plugins.ts'
```

Future published-game imports should become:

```ts
import { officialPlugins } from '@biwa/plugins'
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
| `../../framework/index.ts` | `@biwa/core` |
| `../../framework/engine.ts` | `@biwa/core/engine` |
| `../../framework/react.ts` | `@biwa/core/react` |
| `../../framework/plugins.ts` | `@biwa/plugins` |
| `bun manager/cli.ts build my-game` | `vnx build my-game` or `bunx @biwa/manager build my-game` |

Do not implement a remote marketplace in this step. Official plugins remain explicit imports and local game plugins remain trusted local code.

## Local Package Simulation

The repository validates future package names before publishing by using TypeScript/Bun path aliases:

| Future package import | Current local target |
|---|---|
| `@biwa/core` | `framework/index.ts` |
| `@biwa/core/engine` | `framework/engine.ts` |
| `@biwa/core/react` | `framework/react.ts` |
| `@biwa/core/plugins` | `framework/plugins.ts` |
| `@biwa/core/types` | `framework/types.ts` |
| `@biwa/plugins` | `framework/plugins.ts` |
| `@biwa/manager` | `manager/index.ts` |

The root `package.json` also exposes local entrypoints for the current private monolith:

```json
{
  "exports": {
    ".": "./framework/index.ts",
    "./engine": "./framework/engine.ts",
    "./react": "./framework/react.ts",
    "./plugins": "./framework/plugins.ts",
    "./types": "./framework/types.ts",
    "./manager": "./manager/index.ts"
  }
}
```

`framework/__tests__/package-entrypoints.test.ts` is the package-style smoke fixture. It imports only package aliases and verifies core, React, plugins and manager entrypoints resolve without touching deep framework paths.

## Runtime Manifest Metadata

Build output records the local package contract in `dist/<gameId>/manifest.json`:

```json
{
  "framework": {
    "version": "0.1.0",
    "pluginApiVersion": "vn-plugin-api-v1",
    "packageEntrypoints": {
      "core": "@biwa/core",
      "engine": "@biwa/core/engine",
      "react": "@biwa/core/react",
      "plugins": "@biwa/plugins",
      "manager": "@biwa/manager"
    },
    "peerDependencies": {
      "inkjs": "^2.3.0",
      "react": "^19.2.5",
      "react-dom": "^19.2.5"
    }
  }
}
```

This metadata is informational until packages are published, but it gives builds, portals and diagnostics a stable place to read framework and plugin API compatibility.

## Peer Dependencies

Expected peer dependencies for the first package split:

| Peer | Reason |
|---|---|
| `react` | Runtime UI components and mount helpers. |
| `react-dom` | Browser renderer used by `mountVnApp`. |
| `inkjs` | Story compilation and Ink runtime compatibility. |

The current private repository still installs these dependencies directly. Published packages should declare them as peers and keep compatible development dependencies for local tests.

## Out Of Scope Until Real Publishing

- Publishing packages to npm.
- Splitting the repository into workspaces or separate versioned package directories.
- Replacing every fixture/game import with package aliases.
- Remote plugin marketplace installation.
- Locking a long-term binary or WebAssembly ABI.

## Pre-Publish Checklist

Before turning this plan into actual packages:

- Decide whether templates are copied by the manager package or installed as a separate package dependency.
- Keep `bun run verify` green after replacing one fixture with package-style imports.
