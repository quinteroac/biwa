# Ink Tag Guide

Ink tags are comments that the engine reads while the story advances. Tags use this shape:

```ink
# type: id, option: value
```

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
# character: kai, exit
```

If `position` or `expression` is omitted, the engine uses the character data defaults and then falls back to `center` and `neutral`.

## Audio

```ink
# bgm: morning_theme
# ambience: city_morning
# voice: kai_ch01_001
# sfx: door_open
# bgm: tension, fadeIn: 1.5, fadeOut: 1
# ambience: stop, fade: 0.75
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

## Unlocks

```ink
# unlock: cg_001, kind: gallery
# unlock_music: main_theme
# unlock_replay: chapter_01
```

Unlock tags persist extras per game id. Supported kinds are `gallery`, `music` and `replay`.
