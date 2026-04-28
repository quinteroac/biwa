# Plugins

Plugins let a game register trusted local extensions without forking the framework.

The framework supports two plugin sources:

- Local game plugins declared in `game.config.ts`.
- Official prebuilt plugins imported explicitly from `framework/plugins.ts`.

## Declaring Plugins

Add plugins to `game.config.ts`:

```ts
plugins: [
  {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    type: 'plugin',
    entry: './plugins/my-plugin/index.ts',
    capabilities: ['engine-event'],
    compatibility: {
      pluginApi: 'vn-plugin-api-v1',
    },
    loader: () => import('./plugins/my-plugin/index.ts'),
  },
]
```

`entry` is declarative metadata used by tooling and diagnostics. `loader` is the runtime loader used by local game code.

Official prebuilt plugins do not need a local `entry` because their module is imported from the framework:

```ts
import { officialPlugins } from '../../framework/plugins.ts'

plugins: [
  officialPlugins.inkWashBackground(),
]
```

Use the official catalog to discover prebuilt plugins:

```bash
bun manager/cli.ts plugins official
```

See `framework/docs/prebuilt-plugins.md` for the full catalog, status policy and per-plugin options.

## Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Lowercase plugin id. Use letters, numbers and hyphens. |
| `name` | Yes | Human-readable plugin name. |
| `version` | Yes | Plugin version. |
| `type` | Yes | Must be `plugin`. |
| `entry` | No | Local source entry path for diagnostics and build tooling. |
| `capabilities` | Yes | Declared extension permissions. |
| `compatibility.framework` | No | Framework compatibility hint. |
| `compatibility.pluginApi` | No | Plugin API contract. Current value: `vn-plugin-api-v1`. |

Supported capabilities:

- `renderer`
- `stage`
- `overlay`
- `engine-event`
- `asset-loader`
- `ink-tag`

Official prebuilt plugins also publish catalog metadata with a `contract` field:

- `runtime`: registers behavior such as renderers, Ink tags or diagnostics listeners.
- `profile`: documents an opt-in framework profile backed by existing core UI.

Renderer declarations are public for `background`, `character` and `transition`. `overlay` and `extras` are reserved until the player UI extension model is finalized.

## Module Contract

Plugin modules may export `setup` and `dispose`:

```ts
import type { VnPluginModule } from '../../../framework/plugins.ts'

const plugin: VnPluginModule = {
  setup(context) {
    context.logger.info(`Loaded for ${context.gameId}`)
    context.eventBus.on('engine:dialog', payload => {
      console.log(payload.text)
    })
  },

  dispose() {
    // Release timers, subscriptions or external resources.
  },
}

export default plugin
```

## Runtime Context

`setup(context)` receives:

- `gameId`
- `engine`
- `eventBus`
- `rendererRegistry`
- `tags`
- `assetBase`
- `logger`

Plugins are trusted game code. They are not sandboxed.

## Security And Distribution Policy

Plugin loading is intentionally conservative:

- Only plugins declared in `game.config.ts` are loaded.
- Plugin ids using framework-reserved names are rejected. Avoid `vn-*`, `framework`, `core`, `engine`, `stage`, `renderer` and `renderers`.
- `entry` must point to local game code. Remote URLs are rejected by `doctor`.
- `entry` must stay inside the game directory.
- Plugins are trusted local game code. There is no strong sandbox.
- The current plugin API contract is `vn-plugin-api-v1`.

Production builds record this policy in `manifest.json`:

```json
{
  "pluginPolicy": {
    "apiVersion": "vn-plugin-api-v1",
    "trust": "trusted-local-game-code",
    "sandbox": "none",
    "load": "declared-plugins-only",
    "remoteEntriesAllowed": false
  }
}
```

## Diagnostics

`doctor` validates:

- manifest shape.
- duplicate plugin ids.
- unknown capabilities.
- missing local `entry` files.
- reserved plugin ids.
- unsupported `compatibility.pluginApi` values.
- remote or out-of-game plugin entries.
- renderer types used by game data or Ink transition tags but not declared by any plugin.
- Ink tags that are neither core tags nor declared under `plugins[].tags`.

## CLI Tooling

Use the manager plugin commands while developing plugins:

```bash
bun manager/cli.ts plugins scaffold my-plugin
bun manager/cli.ts plugins scaffold painted-bg --template renderer
bun manager/cli.ts plugins scaffold custom-menu --template ui
bun manager/cli.ts plugins validate plugins/my-plugin
bun manager/cli.ts plugins list my-game
bun manager/cli.ts plugins validate my-game
bun manager/cli.ts plugins official
```

`scaffold` writes `plugin.config.ts`, an entry module and a starter test. Templates:

- `feature`: lifecycle/event plugin. This is the default.
- `renderer`: background renderer plugin.
- `ui`: reserved overlay renderer plugin.

`validate` accepts either a plugin folder/config file or a game id. `list` shows declared plugins, capabilities, renderer declarations and entry status for a game.

## First Plugin

Create a feature plugin:

```bash
bun manager/cli.ts plugins scaffold story-logger --out games/my-game/plugins
```

Then declare it from the game config:

```ts
plugins: [
  {
    id: 'story-logger',
    name: 'Story Logger',
    version: '0.1.0',
    type: 'plugin',
    entry: './plugins/story-logger/index.ts',
    capabilities: ['engine-event'],
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => import('./plugins/story-logger/index.ts'),
  },
]
```

Validate the game before running or building:

```bash
bun manager/cli.ts plugins validate my-game
bun manager/cli.ts doctor my-game
```

## Registering Renderers

Plugins with the `renderer` capability can register external visual renderers during `setup()`.

```tsx
import type { VnPluginModule } from '../../../framework/plugins.ts'

const plugin: VnPluginModule = {
  setup({ rendererRegistry }) {
    rendererRegistry.register('background', 'ink-wash', ({ background, resolveAsset }) => (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${resolveAsset(String(background.image))}")`,
          backgroundSize: 'cover',
        }}
      />
    ))
  },
}

export default plugin
```

Supported renderer kinds:

- `background`
- `character`
- `transition`
- `overlay`
- `extras`

Dispatch support is active for `background`, `character` and `transition`. `overlay` and `extras` are reserved contracts for follow-up UI extension points.

## Data Dispatch

Background renderers are selected from scene data:

```yaml
background:
  type: ink-wash
  image: scenes/opening/ink.png
```

Character renderers are selected from character animation data:

```yaml
animation:
  type: spine
  file: characters/kai/kai.skel
```

Transition renderers are selected from Ink transition tags:

```ink
# transition: iris, duration: 0.8
```

If no external renderer exists, the framework keeps using its built-in renderer or fallback message.

## Registering Ink Tags

Plugins with the `ink-tag` capability can declare and handle custom Ink tags.

Declare tags in `game.config.ts`:

```ts
plugins: [
  {
    id: 'screen-effects',
    name: 'Screen Effects',
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['ink-tag'],
    tags: ['effect'],
    loader: () => import('./plugins/screen-effects/index.ts'),
  },
]
```

Register handlers during setup:

```ts
import type { VnPluginModule } from '../../../framework/plugins.ts'

const plugin: VnPluginModule = {
  setup({ tags, logger }) {
    tags.register('effect', (tag) => {
      logger.info(`Effect requested: ${tag.id ?? 'unknown'}`)
    }, {
      pluginId: 'screen-effects',
      description: 'Runs screen effect commands from Ink.',
    })
  },
}

export default plugin
```

Ink usage:

```ink
# effect: shake, intensity: 0.4, duration: 0.3
```

Custom tags cannot override core framework tags such as `scene`, `character`, `bgm`, `transition`, `save` or `unlock`.

## Official Ink Wash Background

The first official prebuilt renderer is `officialPlugins.inkWashBackground()`. It registers the `background` renderer type `ink-wash`.

```ts
import { officialPlugins } from '../../framework/plugins.ts'

const config = {
  plugins: [
    officialPlugins.inkWashBackground(),
  ],
}
```

Scene data:

```yaml
background:
  type: ink-wash
  image: scenes/opening/background.jpg
  tint: rgba(24, 21, 18, 0.28)
  contrast: 1.12
  saturation: 0.72
  grainOpacity: 0.1
```

## Compatibility

The current plugin API is `vn-plugin-api-v1`. Plugins should set:

```ts
compatibility: { pluginApi: 'vn-plugin-api-v1' }
```

Version recommendations until public package publishing exists:

- Patch versions: bug fixes that do not change manifest or renderer contracts.
- Minor versions: additive plugin options or new renderer types.
- Major versions: behavior or data-shape changes that require game content updates.

When the framework introduces a new plugin API contract, `doctor` will reject unsupported values so games fail early.

See [packaging-roadmap.md](./packaging-roadmap.md) for the package split, official plugin changelog policy and `pluginApi` migration plan.

## External Renderer Recipes

When integrating rendering libraries:

- Keep library state inside the React renderer component, not in the plugin manifest.
- Dispose timers, animation frames and library instances in React effect cleanup.
- Resolve game assets through the `resolveAsset` prop for backgrounds or `assetBase` for characters.
- Register only renderer types declared in `plugins[].renderers`; this keeps `doctor` and build manifests accurate.
- Prefer a local plugin first. Package publishing and remote marketplace installs are intentionally out of scope.
