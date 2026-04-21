# `audio.md` — Schema Reference

Audio in the framework is split into four independent categories, each with its own folder, volume channel, and behavior. Every audio track is defined by a single Markdown file.

```
data/audio/
  bgm/
    morning_theme.md
    tension.md
    ending.md
  sfx/
    door_open.md
    glass_break.md
  ambience/
    city_morning.md
    rain_heavy.md
    forest_birds.md
  voice/
    kai/
      kai_ch01_001.md
      kai_ch01_002.md
    sara/
      sara_ch02_001.md
```

> Voice files are organized in subfolders per character. The character's `voice.folder` in `characters.md` points to the right subfolder.

---

## Categories

| Category | Folder | Channel | Typical use |
|----------|--------|---------|-------------|
| `bgm` | `data/audio/bgm/` | BGM | Background music. Loops while active. |
| `sfx` | `data/audio/sfx/` | SFX | One-shot sound effects triggered by Ink tags. |
| `ambience` | `data/audio/ambience/` | Ambience | Looping environmental audio. Layered with BGM. |
| `voice` | `data/audio/voice/{characterId}/` | Voice | Character voice lines. Referenced per dialogue line. |

Each category has its own volume slider in the player's settings. The engine mixes them independently.

---

## Adaptive audio

All four categories support **adaptive audio** — a track is not a single file but a set of named layers that the engine mixes dynamically. Layers are played simultaneously at different volumes. The Ink script controls which layers are active and at what intensity.

This enables:
- BGM that builds tension by fading in a percussion layer mid-scene
- Ambience that blends rain + wind + thunder independently
- Voice lines where a character sounds distant or filtered based on story state

A track without layers degrades gracefully to a single-file track — adaptive audio is opt-in.

---

## Frontmatter fields

### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier within its category. Used in Ink tags and `characters.md`. Only lowercase letters, numbers, and hyphens. |
| `category` | `"bgm"` \| `"sfx"` \| `"ambience"` \| `"voice"` | ✅ | Must match the subfolder the file lives in. Used by the engine to route to the correct audio channel. |
| `displayName` | `string` | ✅ | Human-readable name. Used in the audio settings screen and as LLM context. |
| `description` | `string` | — | One-line description of mood, use case, or narrative context. |

---

### Files

A track can be defined as a **single file** or as **adaptive layers**. These are mutually exclusive.

#### Single file

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `string` | ✅ (if no `layers`) | Path to the audio file. Preferred format: `.ogg`. Fallback: `.mp3`. |

```yaml
file: audio/bgm/morning_theme.ogg
```

#### Adaptive layers

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `layers` | `AudioLayer[]` | ✅ (if no `file`) | Array of named audio layers played simultaneously. |
| `layers[].id` | `string` | ✅ | Layer identifier. Referenced in Ink tags to control volume: `# bgm: morning_theme, layer: percussion, volume: 0.8`. |
| `layers[].file` | `string` | ✅ | Path to this layer's audio file. |
| `layers[].defaultVolume` | `number` | — | Initial volume for this layer, `0.0–1.0`. Default: `1.0`. Use `0.0` for layers that start silent and fade in later. |

```yaml
layers:
  - id:            base
    file:          audio/bgm/tension/base.ogg
    defaultVolume: 1.0
  - id:            strings
    file:          audio/bgm/tension/strings.ogg
    defaultVolume: 0.0
  - id:            percussion
    file:          audio/bgm/tension/percussion.ogg
    defaultVolume: 0.0
```

---

### Playback

Controls how the track behaves during playback.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `loop` | `boolean` | — | Whether the track loops. Default: `true` for `bgm` and `ambience`, `false` for `sfx` and `voice`. |
| `volume` | `number` | — | Base volume for this track, `0.0–1.0`. Multiplied by the channel volume from player settings. Default: `1.0`. |
| `fadeIn` | `number` | — | Fade-in duration in seconds when the track starts. Default: `0`. |
| `fadeOut` | `number` | — | Fade-out duration in seconds when the track stops. Default: `0`. |

```yaml
loop:    true
volume:  0.85
fadeIn:  1.5
fadeOut: 2.0
```

---

### Intro + loop (BGM only)

Optional. When defined, the engine plays `intro` once and then loops `loop` indefinitely. Both fields must be present together. Ignored for `sfx`, `ambience`, and `voice`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `intro` | `string` | — | Path to the intro audio file. Played once before the loop begins. |
| `loop` | `string` | — | Path to the loop audio file. Played indefinitely after the intro. When used alongside `layers`, each layer can have its own `intro` + `loop` pair — see the adaptive layers example below. |

```yaml
intro: audio/bgm/battle/battle_intro.ogg
loop:  audio/bgm/battle/battle_loop.ogg
```

**Adaptive layers with intro + loop:**

```yaml
layers:
  - id:   base
    intro: audio/bgm/battle/base_intro.ogg
    loop:  audio/bgm/battle/base_loop.ogg
    defaultVolume: 1.0
  - id:   choir
    intro: audio/bgm/battle/choir_intro.ogg
    loop:  audio/bgm/battle/choir_loop.ogg
    defaultVolume: 0.0
```

---

### Tags (metadata)

Optional. Used for filtering, searching, and LLM-assisted content generation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tags` | `string[]` | — | Free-form tags describing mood, tempo, setting, or narrative use. Example: `[calm, morning, slice-of-life]`. |
| `bpm` | `number` | — | Beats per minute. Useful for syncing visual effects to music rhythm. |
| `mood` | `string` | — | Primary emotional tone. Free text. Example: `"melancholic"`, `"tense"`, `"hopeful"`. |

```yaml
tags: [calm, morning, piano, slice-of-life]
bpm:  72
mood: gentle
```

---

## Markdown body

Everything after the closing `---` is free Markdown. Ignored at runtime. Use it for:

- Narrative context — which scenes or chapters this track accompanies
- Usage notes for writers (when to use vs. avoid)
- Mixing notes for adaptive layers
- LLM generation context

---

## Full examples

### BGM — single file

```markdown
---
id: morning_theme
category: bgm
displayName: Morning Theme
description: Soft piano melody for calm daytime scenes.

file: audio/bgm/morning_theme.ogg

loop:    true
volume:  0.8
fadeIn:  1.5
fadeOut: 2.0

tags: [calm, morning, piano]
bpm:  68
mood: gentle
---

# Morning Theme

Introduced in chapter 1. Recurs in any scene of quiet calm.
Avoid during emotionally charged moments — use `tension.ogg` instead.
```

---

### BGM — intro + loop

```markdown
---
id: battle_theme
category: bgm
displayName: Battle Theme
description: High-energy track for confrontation scenes.

intro:  audio/bgm/battle/battle_intro.ogg
loop:   audio/bgm/battle/battle_loop.ogg

volume:  0.9
fadeIn:  0.0
fadeOut: 1.5

tags: [tense, action, drums, strings]
bpm:  140
mood: intense
---

# Battle Theme

Used in chapters 4 and 8. The intro plays once then the loop
sustains until the scene resolves. Never crossfade into this —
let it cut hard for maximum impact.
```

---

### BGM — adaptive layers

```markdown
---
id: tension
category: bgm
displayName: Tension
description: Builds from ambient drone to full orchestral tension.

layers:
  - id:            base
    file:          audio/bgm/tension/base.ogg
    defaultVolume: 1.0
  - id:            strings
    file:          audio/bgm/tension/strings.ogg
    defaultVolume: 0.0
  - id:            percussion
    file:          audio/bgm/tension/percussion.ogg
    defaultVolume: 0.0

loop:    true
volume:  1.0
fadeIn:  2.0
fadeOut: 3.0

tags: [tense, orchestral, adaptive]
mood: dread
---

# Tension

Starts with just the `base` drone. Add layers as the scene escalates:

- Reveal of the antagonist → fade in `strings` to 0.6
- Physical confrontation → fade in `percussion` to 1.0
- Resolution → fade out all layers except `base`

## Ink usage

```ink
The figure stepped out of the shadows.
# bgm: tension
# bgm: tension, layer: strings, volume: 0.6, duration: 2.0

They lunged forward.
# bgm: tension, layer: percussion, volume: 1.0, duration: 0.5
```
---
```

---

### BGM — adaptive layers with intro + loop

```markdown
---
id: finale
category: bgm
displayName: Finale
description: Climactic track for the final chapter. Builds to full orchestra.

layers:
  - id:    piano
    intro: audio/bgm/finale/piano_intro.ogg
    loop:  audio/bgm/finale/piano_loop.ogg
    defaultVolume: 1.0
  - id:    orchestra
    intro: audio/bgm/finale/orchestra_intro.ogg
    loop:  audio/bgm/finale/orchestra_loop.ogg
    defaultVolume: 0.0

volume:  1.0
fadeIn:  3.0
fadeOut: 5.0

tags: [climactic, emotional, piano, orchestra, adaptive]
bpm:  80
mood: bittersweet
---

# Finale

Chapter 9 only. Start with `piano` alone — the orchestra layer
fades in at the emotional peak of the confession scene.

The long fadeOut (5s) is intentional — the silence after this
track is part of the ending.
```

---

### SFX — single shot

```markdown
---
id: door_open
category: sfx
displayName: Door opening
description: Wooden door creaking open. Interior scenes.

file: audio/sfx/door_open.ogg

loop:   false
volume: 0.7

tags: [foley, interior, door]
---

# Door open

Standard interior door. Used whenever a character enters
or exits through a door in an indoor scene.

For the heavy metal door in the basement (chapter 6),
use `metal_door_open` instead.
```

---

### Ambience — adaptive layers

```markdown
---
id: storm_night
category: ambience
displayName: Storm Night
description: Outdoor storm. Layers for rain, wind, and thunder.

layers:
  - id:            rain
    file:          audio/ambience/storm/rain.ogg
    defaultVolume: 0.8
  - id:            wind
    file:          audio/ambience/storm/wind.ogg
    defaultVolume: 0.5
  - id:            thunder
    file:          audio/ambience/storm/thunder.ogg
    defaultVolume: 0.0

loop:    true
volume:  0.9
fadeIn:  3.0
fadeOut: 4.0

tags: [outdoor, storm, rain, night, tense]
mood: ominous
---

# Storm Night

Used in chapters 5 and 8. Start with `rain` and `wind`.
Trigger `thunder` sporadically for dramatic emphasis:

```ink
# ambience: storm_night
# ambience: storm_night, layer: thunder, volume: 0.9, duration: 0.1
```

Never play `thunder` at full loop — it should feel random.
---
```

---

### Voice — single line

```markdown
---
id: kai_ch01_003
category: voice
displayName: Kai — ch01 line 003
description: Kai's first spoken line in chapter 1.

file: audio/voice/kai/kai_ch01_003.ogg

loop:   false
volume: 1.0
---

# Kai — ch01 line 003

"I didn't ask for your opinion."

Delivered flat, not aggressive. This is Kai establishing
distance, not hostility.
```

---

## Ink tag reference

### BGM

```ink
# bgm: {id}
# bgm: {id}, fade: {seconds}
# bgm: stop
# bgm: stop, fade: {seconds}

// Adaptive layer control
# bgm: {id}, layer: {layerId}, volume: {0.0-1.0}
# bgm: {id}, layer: {layerId}, volume: {0.0-1.0}, duration: {seconds}
```

### SFX

```ink
# sfx: {id}
# sfx: {id}, volume: {0.0-1.0}
```

### Ambience

```ink
# ambience: {id}
# ambience: {id}, fade: {seconds}
# ambience: stop
# ambience: stop, fade: {seconds}

// Adaptive layer control
# ambience: {id}, layer: {layerId}, volume: {0.0-1.0}
# ambience: {id}, layer: {layerId}, volume: {0.0-1.0}, duration: {seconds}
```

### Voice

```ink
# voice: {id}
# voice: {id}, volume: {0.0-1.0}
```

> BGM and ambience channels are independent — both can play simultaneously at their own volumes.

---

## Volume channels

The engine exposes four independent volume channels to the player via the settings screen. Each channel multiplies the track's own `volume` field.

| Channel | Setting key | Controls |
|---------|-------------|---------|
| Master | `volume.master` | Multiplies all channels |
| BGM | `volume.bgm` | Background music only |
| SFX | `volume.sfx` | Sound effects only |
| Ambience | `volume.ambience` | Environmental audio only |
| Voice | `volume.voice` | Character voice lines only |

Final volume = `track.volume × channel.volume × master.volume`

---

## Validation rules

The engine runs these checks at startup via `SchemaValidator`.

- `id` must match `/^[a-z0-9-]+$/`
- `id` must be unique within its category folder
- `id` must match the filename (e.g. `morning_theme.md` → `id: morning_theme`)
- `category` must be one of `bgm`, `sfx`, `ambience`, `voice`
- `category` must match the subfolder the file lives in
- `file` and `layers` cannot both be present
- `intro` and `loop` (as file paths) must both be present or both absent
- Each entry in `layers` must have a unique `id` within that track
- `layers[].defaultVolume` must be between `0.0` and `1.0` if present
- `volume` must be between `0.0` and `1.0` if present
- `fadeIn` and `fadeOut` must be non-negative numbers if present
- `bpm` must be a positive number if present
- For `voice` category: `loop` must be `false` or absent
- For `sfx` category: `loop` must be `false` or absent