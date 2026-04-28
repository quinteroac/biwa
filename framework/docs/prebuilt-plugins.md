# Prebuilt Plugins

Prebuilt plugins are official framework extensions that games can opt into explicitly from `game.config.ts`.

They are not loaded automatically. A game must import the factory and add the returned descriptor to `plugins`.

```ts
import { officialPlugins } from '../../framework/plugins.ts'

plugins: [
  officialPlugins.inkWashBackground(),
]
```

## Catalog

Use the CLI to inspect the same catalog used by the docs:

```bash
bun manager/cli.ts plugins official
bun manager/cli.ts plugins official --category renderer
bun manager/cli.ts plugins official --category effects
bun manager/cli.ts plugins official --category player
bun manager/cli.ts plugins official --status experimental
```

| ID | Factory | Category | Status | Contract | Capabilities | Renderers | Tags |
|----|---------|----------|--------|----------|--------------|-----------|------|
| `official-ink-wash-background` | `officialPlugins.inkWashBackground()` | `renderer` | `stable` | `runtime` | `renderer` | `background:ink-wash` | — |
| `official-screen-effects` | `officialPlugins.screenEffects()` | `effects` | `stable` | `runtime` | `ink-tag` | — | `effect` |
| `official-atmosphere-effects` | `officialPlugins.atmosphereEffects()` | `effects` | `stable` | `runtime` | `ink-tag` | — | `atmosphere` |
| `official-backlog-enhancer` | `officialPlugins.backlogEnhancer()` | `player` | `experimental` | `profile` | `overlay`, `engine-event` | — | — |
| `official-gallery-unlocks` | `officialPlugins.galleryUnlocks()` | `player` | `experimental` | `profile` | `overlay`, `engine-event` | — | — |
| `official-music-room` | `officialPlugins.musicRoom()` | `player` | `experimental` | `profile` | `overlay`, `engine-event` | — | — |
| `official-preferences-panel` | `officialPlugins.preferencesPanel()` | `player` | `experimental` | `profile` | `overlay`, `engine-event` | — | — |
| `official-devtools` | `officialPlugins.devtools()` | `devtools` | `experimental` | `runtime` | `overlay`, `engine-event` | — | — |
| `official-aseprite-character-atlas` | `officialPlugins.asepriteCharacterAtlas()` | `asset` | `stable` | `runtime` | `renderer`, `asset-loader` | `character:aseprite-character-atlas` | — |

## Stability Policy

Statuses describe the public contract of each official plugin:

- `stable`: safe for long-lived game content. Breaking changes need a migration note.
- `experimental`: usable, tested and documented, but options may still change before package publishing.
- `planned`: reserved catalog entry for a plugin that is not implemented yet.

Promotion to `stable` requires:

- a documented data, Ink tag or renderer contract.
- a minimum fixture test proving the recommended setup path.
- runtime behavior that is owned by the plugin, or a deliberate `profile` contract that says the plugin documents existing core UI.
- no dependency on unfinished game content such as `mi-novela`.

The current plugin API is `vn-plugin-api-v1`. Official plugins must declare that API in their manifest compatibility metadata.

Future package publishing, plugin changelog sections and `pluginApi` migration rules are tracked in [packaging-roadmap.md](./packaging-roadmap.md).

## Categories

- `renderer`: visual renderers for backgrounds, characters, transitions, overlays or extras.
- `effects`: visual effect plugins driven by Ink tags or scene data.
- `player`: player-facing VN features such as backlog, gallery, music room or preferences.
- `devtools`: authoring and runtime inspection tools.
- `asset`: helpers tied to asset formats or generation workflows.

## Contracts

Official catalog entries use one of two contracts:

- `runtime`: the plugin registers runtime behavior, such as a renderer, Ink tag handler or diagnostics event listener.
- `profile`: the plugin is an explicit preset/profile for core player UI that already exists in the framework. These are useful for project policy and manifests, but they do not yet own a separate renderer dispatch path.

Current player plugins are intentionally `profile` plugins. Promote them to `stable` only after either adding plugin-owned extension points or keeping them documented permanently as presets.

`background`, `character` and `transition` are the public external renderer kinds today. `overlay` and `extras` remain reserved while the framework settles the player UI extension model.

## Ink Wash Background

`officialPlugins.inkWashBackground()` registers the `background` renderer type `ink-wash`.

Scene data:

```yaml
background:
  type: ink-wash
  image: scenes/cafe_exterior/night.png
  tint: rgba(24, 18, 16, 0.26)
  contrast: 1.12
  saturation: 0.78
  grainOpacity: 0.1
  variants:
    day:
      image: scenes/cafe_exterior/day.png
    night:
      image: scenes/cafe_exterior/night.png
  defaultVariant: night
```

Supported options:

| Option | Type | Description |
|--------|------|-------------|
| `image` | `string` | Main background image. |
| `texture` | `string` | Optional grain/paper texture image. |
| `tint` | `string` | CSS color overlay blended with multiply. |
| `paper` | `string` | Base CSS background color. |
| `contrast` | `number` | CSS contrast multiplier. |
| `saturation` | `number` | CSS saturation multiplier. |
| `blur` | `number` | CSS blur in pixels. |
| `grainOpacity` | `number` | Opacity for generated or texture grain. |
| `fit` | `string` | CSS background-size value. Defaults to `cover`. |
| `position` | `string` | CSS background-position value. Defaults to `center`. |
| `variants` | `object` | Scene variant overrides for the same options. |
| `defaultVariant` | `string` | Variant selected when no scene variant is active. |

## Screen Effects

`officialPlugins.screenEffects()` declares and handles the `effect` Ink tag.

```ts
plugins: [
  officialPlugins.screenEffects(),
]
```

Ink examples:

```ink
# effect: shake, intensity: 0.4, duration: 0.3
# effect: flash, color: white, duration: 0.15
# effect: vignette, strength: 0.5, persistent: true
# effect: blur, amount: 4, duration: 0.5
# effect: heartbeat, intensity: 0.6, duration: 0.8
```

Supported effect ids:

- `shake`
- `flash`
- `vignette`
- `blur`
- `desaturate`
- `pulse`
- `heartbeat`

## Atmosphere Effects

`officialPlugins.atmosphereEffects()` declares and handles the `atmosphere` Ink tag.

```ts
plugins: [
  officialPlugins.atmosphereEffects(),
]
```

Ink examples:

```ink
# atmosphere: rain, opacity: 0.28, speed: 8, persistent: true
# atmosphere: fog, opacity: 0.35, persistent: true
# atmosphere: snow, opacity: 0.24, speed: 12
```

Scene data can also declare persistent effects. These are rendered by the stage effects layer:

```yaml
effects:
  - type: rain
    opacity: 0.25
  - type: vignette
    strength: 0.4
```

Supported atmosphere ids:

- `rain`
- `snow`
- `fog`
- `dust`

## Player Experience Plugins

Player plugins declare opt-in profiles for VN features that are common enough to reuse across games. The default `VnStage` still ships with baseline player UI so simple games do not need plugin configuration, but these official factories make the feature set explicit for games that want a documented plugin manifest.

```ts
plugins: [
  officialPlugins.backlogEnhancer(),
  officialPlugins.galleryUnlocks(),
  officialPlugins.musicRoom(),
  officialPlugins.preferencesPanel(),
]
```

### Backlog Enhancer

`officialPlugins.backlogEnhancer()` maps to the enhanced default backlog overlay:

- text search.
- speaker filter.
- voice replay for lines that were preceded by a `# voice` tag.

Ink:

```ink
# voice: kai_ch01_001
Kai: This line can be replayed from the backlog.
```

The engine stores that voice payload on the next backlog entry and `VnStage` re-emits it through `engine:voice` when the player clicks `Replay`.

### Gallery Unlocks

`officialPlugins.galleryUnlocks()` documents the official gallery profile backed by `data.gallery` and the existing unlock tags.

```ink
# unlock_gallery: cg_001
```

Gallery item thumbnails, full images and locked states use the contracts in `framework/docs/player-extras.md`.

### Music Room

`officialPlugins.musicRoom()` documents the official music/replay profile backed by `data.music`, regular audio data fallback and `data.replay`.

```ink
# unlock_music: main_theme
# unlock_replay: chapter_01
```

Unlocked tracks can be previewed and looped in the default music room overlay.

### Preferences Panel

`officialPlugins.preferencesPanel()` documents the official preferences profile for:

- text speed.
- auto delay.
- text scale.
- read-only skip.
- high contrast.
- reduced motion.

## Runtime Devtools

`officialPlugins.devtools()` enables a development-only runtime inspector.

```ts
plugins: [
  ...(import.meta.env?.DEV ? [officialPlugins.devtools()] : []),
]
```

The plugin emits `engine:diagnostics` snapshots and the default `VnStage` shows a compact `Dev` dock when the plugin is active. Snapshots include:

- runtime state.
- current scene and variant.
- Ink/runtime variables.
- active characters.
- active persistent audio.
- declared plugins.
- registered renderers.

Authors or custom tooling can request a fresh snapshot through:

```ts
engine.bus.emit('engine:diagnostics:request', {})
```

`doctor` warns with `devtools_plugin_enabled` when the plugin is declared, so production builds can catch accidental inclusion. Suppress the warning only when the build is intentionally for development.

## Aseprite Character Atlas

`officialPlugins.asepriteCharacterAtlas()` registers the `character` renderer type `aseprite-character-atlas`.

```ts
plugins: [
  officialPlugins.asepriteCharacterAtlas(),
]
```

The renderer uses the same atlas contract generated by:

```bash
bun manager/cli.ts assets character-atlas my-game kai \
  --layout Grid \
  --names neutral,happy,sad,angry \
  --image kai_spritesheet.png
```

Character data:

```yaml
animation:
  type: aseprite-character-atlas
  file: characters/kai/kai_spritesheet.png
  atlas: characters/kai/kai_atlas.json
  expressions:
    neutral: neutral
    happy: happy
    sad: sad
    angry: angry
```

`doctor` validates that:

- the plugin declares `character:aseprite-character-atlas`.
- the atlas follows the ComfyUI GameAssetsMaker `aseprite-atlas-v1` contract.
- `animation.expressions` values reference atlas frame tags or generated frame names.

This plugin does not generate images or call image APIs. It reserves the same atlas JSON shape for a future image-generation workflow.

## Catalog Maintenance

Every official plugin entry must include:

- unique `id`.
- human-readable `name`.
- `category`.
- `status`.
- public `description`.
- declared `capabilities`.
- declared `renderers` when applicable.
- declared `tags` when applicable.
- `configExample`.
- a `factory` that returns a manifest matching the catalog metadata.

Tests enforce these requirements so CLI output, docs and runtime descriptors stay aligned.
