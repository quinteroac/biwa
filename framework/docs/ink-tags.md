# Ink Tag Guide

Ink tags are comments that the engine reads while the story advances. Tags use this shape:

```ink
# type: id, option: value
```

Core tags are handled by the framework. Custom tags can be added by plugins through `TagRegistry`; see [Custom Plugin Tags](#custom-plugin-tags).

## Scene

```ink
# scene: default
# scene: cafe_exterior, variant: night
```

The id must match a file under `data/scenes/` whose frontmatter contains the same `id`.

## Character

```ink
# character: kai
# character: kai, position: left, expression: happy
# character: kai, position: left, animation: idle, sheet: Main
# character: kai, position: center, expression: happy, scale: 0.8, offsetY: -24
# character: kai, exit
# character: exit
```

If `position` or `expression` is omitted, the engine uses the character data defaults and then falls back to `center` and `neutral`.
`animation` is equivalent to `expression` for spritesheet-driven characters. `sheet` selects a spritesheet library sheet when the character data supports it.
`scale` overrides the character data `scale` for the active appearance. `size` is accepted as an alias for `scale`.
`offsetX`/`offsetY` override the character data `offset.x`/`offset.y` in pixels. `x`/`y` are accepted as shorter aliases.
`# character: {id}, exit` removes one character. `# character: exit` clears all active characters.

## Sprite

```ink
# sprite: kai, animation: punch_in_face
# sprite: kai, expression: angry, sheet: Main, scale: 1.1, offsetX: 16
```

Updates an already tracked character sprite without changing its position. This is useful for animation changes on spritesheet characters.
`scale`, `size`, `offsetX`, `offsetY`, `x`, and `y` work the same way as they do on `character`.

## Audio

```ink
# bgm: morning_theme
# ambience: city_morning
# voice: kai_ch01_001
# sfx: door_open
# bgm: tension, fadeIn: 1.5, fadeOut: 1
# ambience: stop, fade: 0.75
# voice: stop
```

`bgm`, `ambience` and `voice` are persisted in save snapshots. `sfx` is momentary and is not restored when loading.
`bgm` and `ambience` accept `fadeIn`, `fadeOut`, `fade` or `duration` in seconds.

## Transitions

```ink
# transition: fade, duration: 600
```

Transitions pause story advancement until the transition component calls its completion callback.

## Minigames

```ink
# minigame: match3

EXTERNAL launch_minigame(name)

~ launch_minigame("match3")
```

The id must exist in `data/minigames/` and in the `minigames` map in `game.config.ts`.

## End Screen

```ink
# end_screen
# end_screen: title: The End, message: Thanks for playing.
```

When omitted, the engine uses `endScreen` values from `game.config.ts`.

## Save

```ink
# save
```

Triggers an auto-save using the current engine snapshot.

## Speaker

```ink
# speaker: Diana
# speaker: none
# speaker
```

Overrides the speaker for the current and following dialog lines until another speaker is detected. Use `none`, `off`, `clear`, `null`, or an empty `# speaker` tag to clear the active speaker.

## Unlocks

```ink
# unlock: cg_001, kind: gallery
# unlock_gallery: cg_001
# unlock_music: main_theme
# unlock_replay: chapter_01
```

Unlock tags persist extras per game id. Supported kinds are `gallery`, `music` and `replay`.

## Volume

```ink
# volume bgm 0.5
# volume master 0.8
```

`volume` is reserved and parsed by `TagParser`, but the current `GameEngine` does not apply it at runtime yet. Track-level volume can still be set on audio tags, for example `# voice: kai_ch01_001, volume: 0.8`.

## Custom Plugin Tags

Plugins can add custom Ink tags without changing the core parser.

Declare the tag in `game.config.ts`:

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

Register the handler in the plugin:

```ts
import type { VnPluginModule } from '../../../framework/plugins.ts'

const plugin: VnPluginModule = {
  setup({ tags, logger }) {
    tags.register('effect', (tag) => {
      logger.info(`Effect requested: ${tag.id ?? 'unknown'}`)
    }, {
      pluginId: 'screen-effects',
    })
  },
}

export default plugin
```

Use the tag from Ink:

```ink
# effect: shake, intensity: 0.4, duration: 0.3
```

Official prebuilt effect plugins provide ready-to-use tags:

```ts
plugins: [
  officialPlugins.screenEffects(),
  officialPlugins.atmosphereEffects(),
]
```

```ink
# effect: flash, color: white, duration: 0.15
# atmosphere: rain, opacity: 0.28, persistent: true
```

`doctor` validates custom tags. A tag used in Ink must be either a core tag or declared under `plugins[].tags`.

Custom tags cannot override core tags:

- `scene`
- `bgm`
- `sfx`
- `ambience`
- `voice`
- `character`
- `sprite`
- `transition`
- `minigame`
- `end_screen`
- `save`
- `unlock`
- `unlock_gallery`
- `unlock_music`
- `unlock_replay`
- `speaker`
- `volume`
