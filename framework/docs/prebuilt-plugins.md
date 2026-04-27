# Prebuilt Plugins

Prebuilt plugins are official framework extensions that games can opt into explicitly from `game.config.ts`.

They are not loaded automatically. A game must import the factory and add the returned descriptor to `plugins`.

```ts
import { officialPlugins } from '../../framework/plugins/prebuilt/index.ts'

plugins: [
  officialPlugins.inkWashBackground(),
]
```

## Catalog

Use the CLI to inspect the same catalog used by the docs:

```bash
bun manager/cli.ts plugins official
bun manager/cli.ts plugins official --category renderer
bun manager/cli.ts plugins official --status experimental
```

| ID | Factory | Category | Status | Capabilities | Renderers |
|----|---------|----------|--------|--------------|-----------|
| `official-ink-wash-background` | `officialPlugins.inkWashBackground()` | `renderer` | `experimental` | `renderer` | `background:ink-wash` |

## Stability Policy

Statuses describe the public contract of each official plugin:

- `stable`: safe for long-lived game content. Breaking changes need a migration note.
- `experimental`: usable, tested and documented, but options may still change before package publishing.
- `planned`: reserved catalog entry for a plugin that is not implemented yet.

The current plugin API is `vn-plugin-api-v1`. Official plugins must declare that API in their manifest compatibility metadata.

## Categories

- `renderer`: visual renderers for backgrounds, characters, transitions, overlays or extras.
- `player`: player-facing VN features such as backlog, gallery, music room or preferences.
- `devtools`: authoring and runtime inspection tools.
- `asset`: helpers tied to asset formats or generation workflows.

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

## Catalog Maintenance

Every official plugin entry must include:

- unique `id`.
- human-readable `name`.
- `category`.
- `status`.
- public `description`.
- declared `capabilities`.
- declared `renderers` when applicable.
- `configExample`.
- a `factory` that returns a manifest matching the catalog metadata.

Tests enforce these requirements so CLI output, docs and runtime descriptors stay aligned.
