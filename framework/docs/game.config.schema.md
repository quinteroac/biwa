# `game.config.ts` — Schema Reference

`game.config.ts` is the single file a developer creates to register a new visual novel within the framework. It tells the engine everything it needs to know about a specific game — where to find the story, data, assets, minigames, and how to present and distribute it.

It lives at the root of each game folder:

```
games/
  my-novel/
    game.config.ts   ← you are here
    story/
    data/
    assets/
    minigames/
```

The file must have a default export of a `GameConfig` object:

```ts
import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = { ... }

export default config
```

---

## Fields

### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier for this novel across the entire framework. Used as the localStorage namespace prefix `vn:{id}:...`. Only lowercase letters, numbers, and hyphens. |
| `title` | `string` | ✅ | Display name shown in the browser tab, save screens, and the portal (if applicable). |
| `version` | `string` | ✅ | Semver string (`major.minor.patch`). New saves record this value. The `SaveManager` rejects saves from a different major version when both versions are present. |
| `description` | `string` | — | Short synopsis. Used in the portal listing and as LLM context when generating content. |
| `cover` | `string` | — | Path to the cover image. Displayed in the portal and on the loading screen. Recommended size: `800×450px`. |

```ts
id:          'midnight-cafe',
title:       'The Midnight Café',
version:     '1.0.0',
description: 'A story of impossible encounters in a café that should not exist.',
cover:       './assets/ui/cover.jpg',
```

---

### Story

Configures the Ink narrative and i18n support.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `story.defaultLocale` | `string` | ✅ | The base locale. Used when the player's detected language is not in `story.locales`. Example: `"es"`, `"en"`. |
| `story.locales` | `Record<string, string>` | ✅ | Map of `locale → path to the entry .ink file`. Each locale points to its own story tree. At least one entry matching `defaultLocale` is required. |

```ts
story: {
  defaultLocale: 'es',
  locales: {
    es: './story/es/main.ink',
    en: './story/en/main.ink',
    ja: './story/ja/main.ink',
  }
},
```

> The engine detects the player's preferred locale from `navigator.language` and falls back to `defaultLocale` if no match is found.

---

### Data

Paths to the folders containing the game's `.md` data files. The `DataLoader` scans each folder at startup, parses all `.md` files, and builds the in-memory registries.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data.characters` | `string` | ✅ | Path to the folder containing `characters/*.md` files. |
| `data.scenes` | `string` | ✅ | Path to the folder containing `scenes/*.md` files. |
| `data.audio` | `string` | ✅ | Root path for audio data. The loader supports `bgm/`, `ambience/`, `sfx/` and `voice/` subfolders inside. |
| `data.minigames` | `string` | — | Path to the folder containing `minigames/*.md` files. Omit if the novel has no minigames. |
| `data.gallery` | `string` | — | Path to unlockable CG/gallery item data. |
| `data.music` | `string` | — | Path to music-room track data. When omitted, the stage can use `data.audio` as a fallback. |
| `data.replay` | `string` | — | Path to replay-list metadata. |

```ts
data: {
  characters: './data/characters/',
  scenes:     './data/scenes/',
  audio:      './data/audio/',
  minigames:  './data/minigames/',
  gallery:    './data/gallery/',
  music:      './data/music/',
  replay:     './data/replay/',
},
```

---

### Minigames

Maps minigame IDs to their implementation modules. Uses dynamic `import()` so each bundle is only downloaded when Ink invokes it — novels without minigames never load Pixi.js.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `minigames` | `Record<string, () => Promise<module>>` | — | Map of `minigameId → lazy import function`. The key must match the `id` field in the corresponding `data/minigames/*.md` file. |

```ts
minigames: {
  match3:  () => import('./minigames/match3/Match3Game.ts'),
  puzzle:  () => import('./minigames/puzzle/PuzzleGame.ts'),
},
```

> Each imported module must export a class that extends `framework/minigames/MinigameBase.ts`.

---

### Plugins

Declares trusted local framework extensions. Plugins are validated by `doctor`, loaded during engine boot and receive a small lifecycle context.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plugins[].id` | `string` | ✅ | Lowercase plugin id. |
| `plugins[].name` | `string` | ✅ | Human-readable name. |
| `plugins[].version` | `string` | ✅ | Plugin version. |
| `plugins[].type` | `"plugin"` | ✅ | Manifest discriminator. |
| `plugins[].entry` | `string` | — | Local source entry path for diagnostics/build tooling. |
| `plugins[].capabilities` | `string[]` | ✅ | Declared capabilities such as `renderer` or `engine-event`. |
| `plugins[].renderers` | `object` | — | Renderer type declarations grouped by kind. Used by `doctor` and build manifests. |
| `plugins[].compatibility.framework` | `string` | — | Framework compatibility hint. |
| `plugins[].compatibility.pluginApi` | `string` | — | Plugin API contract. Current value: `vn-plugin-api-v1`. |

```ts
plugins: [
  {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    type: 'plugin',
    entry: './plugins/my-plugin/index.ts',
    capabilities: ['engine-event'],
    loader: () => import('./plugins/my-plugin/index.ts'),
  },
],
```

See `framework/docs/plugins.md` for the lifecycle contract.

---

### Theme

Visual customization for this novel. All fields are optional — the framework provides sensible defaults. Values are applied as CSS custom properties on `:root` at startup.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `theme.font` | `string` | — | CSS `font-family` for dialog text. Default: system serif. |
| `theme.dialogBg` | `string` | — | Background of the dialog box. Accepts any CSS color value. Default: `rgba(0, 0, 0, 0.75)`. |
| `theme.accent` | `string` | — | Color used for choices, highlights, and interactive elements. Default: `white`. |
| `theme.cssVars` | `Record<string, string>` | — | Escape hatch. Arbitrary CSS custom properties injected into `:root`. Use for any visual detail not covered by the fields above. |

```ts
theme: {
  font:      '"Georgia", serif',
  dialogBg:  'rgba(10, 10, 20, 0.85)',
  accent:    '#c084fc',
  cssVars: {
    '--vn-choice-hover':    'rgba(192, 132, 252, 0.15)',
    '--vn-name-color':      '#e2e8f0',
    '--vn-dialog-radius':   '12px',
  }
},
```

---

### Saves

Configures the save system for this novel. Saves are stored in `localStorage` under keys prefixed by `vn:{id}:save:` and preferences such as autosave use `vn:{id}:autoSave`, so games are isolated from each other.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `saves.slots` | `number` | — | Number of manual save slots available to the player. Default: `3`. |
| `saves.autoSave` | `boolean` | — | Whether the engine automatically saves when the scene changes. Default: `true`. |

```ts
saves: {
  slots:    5,
  autoSave: true,
},
```

---

### Diagnostics

Controls intentional `doctor` suppressions. Suppressions only apply to non-error diagnostics and must include a reason so they remain visible in console output and build manifests.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `diagnostics.suppress` | `Array<object>` | — | List of warning/info suppressions. Each item can match by `code`, `path`, `message`, or any combination of them. |
| `diagnostics.suppress[].reason` | `string` | ✅ | Human-readable reason shown by `doctor` and recorded in `manifest.json`. |

```ts
diagnostics: {
  suppress: [
    {
      code: 'asset_missing',
      path: 'data/audio/voice/',
      reason: 'Voice acting is optional in this build.',
    },
  ],
},
```

---

### Distribution

Controls how the novel is deployed and accessed.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `distribution.mode` | `"standalone"` \| `"portal"` \| `"embedded"` \| `"static"` | ✅ | `"standalone"` — the novel is its own website. `"portal"` — the novel lives inside a shared multi-novel site. `"embedded"`/`"static"` are static-hosting variants using the same relative ESM output. |
| `distribution.basePath` | `string` | — | Required in `"portal"` mode. The URL prefix for all asset and route resolution. Example: `"/novels/midnight-cafe"`. |

```ts
// Standalone — its own site
distribution: {
  mode: 'standalone',
},

// Portal — inside a shared site at /novels/midnight-cafe
distribution: {
  mode:     'portal',
  basePath: '/novels/midnight-cafe',
},
```

---

## Full examples

### Minimal — standalone, single language, no minigames

```ts
export default {
  id:      'silent-hours',
  title:   'Silent Hours',
  version: '1.0.0',

  story: {
    defaultLocale: 'en',
    locales: {
      en: './story/en/main.ink',
    }
  },

  data: {
    characters: './data/characters/',
    scenes:     './data/scenes/',
    audio:      './data/audio/',
  },

  distribution: {
    mode: 'standalone',
  }
}
```

---

### Complete — portal, multilingual, minigames, full theme

```ts
export default {

  // — Identity —
  id:          'midnight-cafe',
  title:       'The Midnight Café',
  version:     '1.2.0',
  description: 'A story of impossible encounters in a café that should not exist.',
  cover:       './assets/ui/cover.jpg',

  // — Story —
  story: {
    defaultLocale: 'es',
    locales: {
      es: './story/es/main.ink',
      en: './story/en/main.ink',
      ja: './story/ja/main.ink',
    }
  },

  // — Data —
  data: {
    characters: './data/characters/',
    scenes:     './data/scenes/',
    audio:      './data/audio/',
    minigames:  './data/minigames/',
  },

  // — Minigames (lazy loaded) —
  minigames: {
    match3: () => import('./minigames/match3/Match3Game.ts'),
  },

  // — Theme —
  theme: {
    font:      '"Georgia", serif',
    dialogBg:  'rgba(10, 10, 20, 0.85)',
    accent:    '#c084fc',
    cssVars: {
      '--vn-choice-hover':  'rgba(192, 132, 252, 0.15)',
      '--vn-name-color':    '#e2e8f0',
      '--vn-dialog-radius': '12px',
    }
  },

  // — Saves —
  saves: {
    slots:    5,
    autoSave: true,
  },

  // — Distribution —
  distribution: {
    mode:     'portal',
    basePath: '/novels/midnight-cafe',
  }

}
```

---

## How the engine uses this file

At startup, `GameEngine.init(config)` processes the config in this order:

1. **Validates** all required fields via `SchemaValidator`. Throws with a descriptive error if anything is missing or malformed.
2. **Detects locale** from `navigator.language`, falls back to `story.defaultLocale`.
3. **Loads data** — scans all `.md` folders in parallel and builds `CharacterRegistry`, `SceneRegistry`, and `AudioRegistry`.
4. **Applies theme** — injects CSS custom properties into `:root`.
5. **Registers minigames** — stores the lazy import functions in `MinigameRegistry` without downloading them.
6. **Loads Ink** — initialises `inkjs` with the resolved locale entry point.
7. **Mounts components** — attaches Web Components to the DOM stage.

```js
// framework/engine/GameEngine.ts
import config from '../../games/my-novel/game.config.ts'

await GameEngine.init(config)
```

---

## TypeScript types

```ts
// framework/types/index.d.ts

export interface GameConfig {
  id:           string
  title:        string
  version:      string
  description?: string
  cover?:       string
  story:        StoryConfig
  data:         DataConfig
  minigames?:   MinigamesConfig
  theme?:       ThemeConfig
  saves?:       SavesConfig
  diagnostics?: DiagnosticsConfig
  distribution: DistributionConfig
}

export interface StoryConfig {
  defaultLocale: string
  locales:       Record<string, string>
}

export interface DataConfig {
  characters: string
  scenes:     string
  audio:      string
  minigames?: string
}

export type MinigamesConfig = Record<string, () => Promise<unknown>>

export interface ThemeConfig {
  font?:     string
  dialogBg?: string
  accent?:   string
  cssVars?:  Record<string, string>
}

export interface SavesConfig {
  slots?:    number
  autoSave?: boolean
}

export interface DiagnosticsConfig {
  suppress?: Array<{
    code?:    string
    path?:    string
    message?: string
    reason:   string
  }>
}

export interface DistributionConfig {
  mode:       'standalone' | 'portal' | 'static' | 'embedded'
  basePath?:  string
}
```

Add this to your `game.config.ts` for full autocompletion in VS Code:

```js
/** @type {import('../../framework/types').GameConfig} */
export default {
  // VS Code now autocompletes and validates as you type
}
```

---

## Validation rules

The engine runs these checks at startup via `SchemaValidator`.

- `id` must match `/^[a-z0-9-]+$/`
- `id` must be unique — no two games in `games/` can share the same `id`
- `version` must be a valid semver string matching `/^\d+\.\d+\.\d+$/`
- `story.locales` must contain at least one entry
- `story.defaultLocale` must exist as a key in `story.locales`
- `data.characters`, `data.scenes`, and `data.audio` must be non-empty strings
- `data.minigames` is required if `minigames` is present
- Each key in `minigames` must have a corresponding `.md` file in `data.minigames`
- `saves.slots` must be a positive integer if present
- `game.config.ts` is validated against `framework/schemas/game.config.schema.json` by `doctor` and `build`.
- `distribution.basePath` is recommended when `distribution.mode` is `"portal"`.
- `distribution.basePath` must start with `"/"` if present.
- `build --mode <standalone|static|portal|embedded>` overrides the configured distribution mode for that build and writes the effective mode to `dist/<game>/manifest.json`.
