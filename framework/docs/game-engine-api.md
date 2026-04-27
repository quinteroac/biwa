# `GameEngine` API

`GameEngine` is the framework runtime. It owns Ink execution, state transitions, persistent snapshots, data registries, and the typed event bus consumed by React components or custom shells.

## Construction

```ts
import { GameEngine } from '../framework/engine/GameEngine.ts'
import config from './game.config.ts'

const engine = await GameEngine.init(config)
```

`GameEngine.init(config)` is the app-level entrypoint. It creates a singleton, boots the configured story/data, and returns the same instance on later calls.

`new GameEngine(config)` is supported for tests, previews, and isolated host environments that need more than one runtime in a page. A manually constructed engine does not boot until the private boot flow used by `init`, so application shells should prefer `init`.

## Public Properties

| Property | Type | Description |
|---|---|---|
| `bus` | `EventBus<EngineEventMap>` | Typed event bus for runtime/UI communication. |
| `vars` | `VariableStore` | Runtime variable store mirrored from save snapshots. |
| `state` | `EngineState` | Current high-level runtime state. |
| `data` | `GameData` | Loaded character, scene, audio and minigame metadata. |
| `title` | `string` | Player-facing title from `game.config.ts`. |
| `saveManager` | `SaveManager` | Namespaced save/load manager for this game. |

## Public Methods

| Method | Description |
|---|---|
| `start()` | Starts or restarts story advancement. |
| `advance()` | Advances one dialog step when the engine is in `DIALOG`. |
| `choose(index)` | Selects an Ink choice and continues. |
| `getState()` | Captures a serialisable `GameSaveState`. |
| `restoreState(saved)` | Restores story, variables, visual state, persistent audio and locale from a save. |

## Event Map

The engine emits a typed `EngineEventMap` from `framework/types/events.d.ts`.

| Event | Payload |
|---|---|
| `engine:state` | `EngineState` |
| `engine:dialog` | Dialog text, speaker, name color, continue state and advance mode. |
| `engine:choices` | Current Ink choices. |
| `engine:scene` | Scene tag plus resolved scene data. |
| `engine:character` | Character tag payload. |
| `engine:bgm` | BGM tag plus resolved audio data when available. |
| `engine:sfx` | SFX tag plus resolved audio data when available. |
| `engine:ambience` | Ambience tag plus resolved audio data when available. |
| `engine:voice` | Voice tag plus resolved audio data when available. |
| `engine:transition` | Transition config and completion callback. |
| `engine:minigame:start` | Minigame id and merged tag/config payload. |
| `engine:minigame:end` | Minigame result or error. |
| `engine:end` | Empty object. |
| `end_screen` | Optional end-screen title and message. |

```ts
engine.bus.on('engine:dialog', event => {
  console.log(event.text)
})
```

Use `'*'` to listen to every event:

```ts
engine.bus.on('*', ({ event, payload }) => {
  console.debug(event, payload)
})
```

## Save Compatibility

`SaveManager` stores `gameId` and `gameVersion` with each new save. Saves from another game are rejected. Saves with a different major `gameVersion` are rejected unless they predate this metadata, preserving backward compatibility with older local saves.
