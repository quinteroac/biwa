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
      framework: '0.x',
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
- `assetBase`
- `logger`

Plugins are trusted game code. They are not sandboxed.

## Diagnostics

`doctor` validates:

- manifest shape.
- duplicate plugin ids.
- unknown capabilities.
- missing local `entry` files.

Renderer-specific validation is planned in the renderer phase.
