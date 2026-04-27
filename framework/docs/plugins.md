# Plugins

Plugins let a game register trusted local extensions without forking the framework.

This first contract is intentionally small: plugins can be declared, validated, registered and given a lifecycle. Renderer registration builds on this foundation in the next phase.

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

## Module Contract

Plugin modules may export `setup` and `dispose`:

```ts
import type { VnPluginModule } from '../../../framework/types/plugins.d.ts'

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

## CLI Tooling

Use the manager plugin commands while developing plugins:

```bash
bun manager/cli.ts plugins scaffold my-plugin
bun manager/cli.ts plugins validate plugins/my-plugin
bun manager/cli.ts plugins list my-game
bun manager/cli.ts plugins validate my-game
```

`scaffold` writes `plugin.config.ts` and `index.ts`. `validate` accepts either a plugin folder/config file or a game id. `list` shows declared plugins, capabilities, renderer declarations and entry status for a game.

## Registering Renderers

Plugins with the `renderer` capability can register external visual renderers during `setup()`.

```tsx
import type { VnPluginModule } from '../../../framework/types/plugins.d.ts'

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
