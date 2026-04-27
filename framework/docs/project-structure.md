# Visual Novel Project Structure

This document describes the folder structure of a single visual novel built on the framework. Every novel follows the same layout — this consistency is what allows the framework to load data without per-novel configuration beyond `game.config.ts`.

---

## Overview

```
games/my-novel/
│
├── game.config.ts
├── index.html
│
├── story/
│   ├── es/
│   │   ├── main.ink
│   │   ├── chapter_01.ink
│   │   ├── chapter_02.ink
│   │   └── endings.ink
│   └── en/
│       ├── main.ink
│       ├── chapter_01.ink
│       ├── chapter_02.ink
│       └── endings.ink
│
├── data/
│   ├── characters/
│   │   ├── kai.md
│   │   └── sara.md
│   ├── scenes/
│   │   ├── cafe_exterior.md
│   │   └── kai_apartment.md
│   ├── audio/
│   │   ├── bgm/
│   │   │   ├── morning_theme.md
│   │   │   └── tension.md
│   │   ├── sfx/
│   │   │   ├── door_open.md
│   │   │   └── glass_break.md
│   │   ├── ambience/
│   │   │   └── city_morning.md
│   │   └── voice/
│   │       ├── kai/
│   │       │   └── kai_ch01_001.md
│   │       └── sara/
│   │           └── sara_ch02_001.md
│   └── minigames/
│       └── match3.md
│
├── assets/
│   ├── characters/
│   │   ├── kai/
│   │   │   ├── neutral.png
│   │   │   ├── happy.png
│   │   │   └── sad.png
│   │   └── sara/
│   │       ├── body.png
│   │       ├── face_neutral.png
│   │       ├── face_happy.png
│   │       ├── outfit_school.png
│   │       └── outfit_casual.png
│   ├── scenes/
│   │   ├── cafe_exterior/
│   │   │   ├── day.png
│   │   │   ├── night.png
│   │   │   ├── rain.png
│   │   │   └── thumb.jpg
│   │   └── kai_apartment/
│   │       ├── default.png
│   │       └── thumb.jpg
│   ├── audio/
│   │   ├── bgm/
│   │   │   ├── morning_theme.ogg
│   │   │   └── tension/
│   │   │       ├── base.ogg
│   │   │       ├── strings.ogg
│   │   │       └── percussion.ogg
│   │   ├── sfx/
│   │   │   ├── door_open.ogg
│   │   │   └── glass_break.ogg
│   │   ├── ambience/
│   │   │   └── city_morning.ogg
│   │   └── voice/
│   │       ├── kai/
│   │       │   └── kai_ch01_001.ogg
│   │       └── sara/
│   │           └── sara_ch02_001.ogg
│   └── ui/
│       ├── cover.jpg
│       ├── logo.png
│       └── cursor.png
│
└── minigames/
    └── match3/
        └── Match3Game.ts
```

---

## File by file

### `game.config.ts`

The entry point for the framework. Declares the novel's identity, story locales, data folder paths, minigame registrations, theme, save settings, and distribution mode.

Configured once per novel. The framework reads it at startup and uses it to locate everything else.

→ See [game.config.schema.md](./game.config.schema.md)

---

### `index.html`

The HTML entry point. Mounts the Web Components stage and bootstraps the engine with the novel's config.

Minimal by design — the framework handles everything after mount:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>The Midnight Café</title>
  <link rel="stylesheet" href="../../framework/styles/base.css">
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import config from './game.config.ts'
    import { GameEngine } from '../../framework/engine/GameEngine.ts'
    import { mountVnApp } from '../../framework/components/VnApp.tsx'

    const engine = await GameEngine.init(config)
    mountVnApp(engine, document.getElementById('root'))
  </script>
</body>
</html>
```

---

### `story/`

All Ink scripts, organized by locale. Each locale subfolder matches a key in `game.config.ts → story.locales`.

```
story/
├── es/
│   ├── main.ink        ← entry point for Spanish
│   ├── chapter_01.ink
│   ├── chapter_02.ink
│   └── endings.ink
└── en/
    ├── main.ink        ← entry point for English
    ├── chapter_01.ink
    ├── chapter_02.ink
    └── endings.ink
```

`main.ink` uses Ink's native `INCLUDE` to pull in the other files:

```ink
INCLUDE chapter_01.ink
INCLUDE chapter_02.ink
INCLUDE endings.ink

-> chapter_01
```

Characters, scenes, and audio are referenced from Ink using tags — no paths, no filenames, just the `id` declared in the corresponding `.md` file:

```ink
=== chapter_01 ===
# scene: cafe_exterior
# bgm: morning_theme

Kai appears at the entrance.
# character: kai, position: left, expression: neutral

* [Say hello]
    -> greeting
* [Look away]
    -> tension_start
```

**Format:** `.ink`

→ See [Ink tag reference](./ink-tags.md)

---

### `data/`

Structured descriptions of every entity in the novel. Each entity is a single `.md` file with YAML frontmatter that the engine reads, and a free Markdown body that serves as documentation and LLM context.

The engine scans all `.md` files at startup and builds in-memory registries. The Markdown body is ignored at runtime.

**A key property of this folder:** its contents can be generated or assisted by an LLM. Given the schema reference and a brief description, a model can produce valid `.md` files ready for the engine without writing any code.

---

#### `data/characters/`

One `.md` per character. Declares sprites or animation type, default position and expression, voice config, and display name.

The `id` in each file must match what is used in Ink tags (`# character: kai`).

```
data/characters/
├── kai.md
└── sara.md
```

→ See [characters.schema.md](./characters.schema.md)

---

#### `data/scenes/`

One `.md` per location. Declares the background type (`static`, `video`, `parallax`, `spine`, `canvas`, `three`), variants, transitions, and ambient effects.

The `id` in each file must match what is used in Ink tags (`# scene: cafe_exterior`).

```
data/scenes/
├── cafe_exterior.md
└── kai_apartment.md
```

→ See [scenes.schema.md](./scenes.schema.md)

---

#### `data/audio/`

One `.md` per audio track, organized by category. Declares file paths, loop behavior, adaptive layers, and the Ink variables that minigame results write into.

```
data/audio/
├── bgm/
│   ├── morning_theme.md
│   └── tension.md
├── sfx/
│   ├── door_open.md
│   └── glass_break.md
├── ambience/
│   └── city_morning.md
└── voice/
    ├── kai/
    │   └── kai_ch01_001.md
    └── sara/
        └── sara_ch02_001.md
```

Voice files mirror the character folder structure declared in each character's `voice.folder` field.

→ See [audio.schema.md](./audio.schema.md)

---

#### `data/minigames/`

One `.md` per minigame type. Declares base config, difficulty presets, result variables written to Ink, integration mode, and audio.

A novel with no minigames simply omits this folder and leaves `data.minigames` out of `game.config.ts`.

```
data/minigames/
└── match3.md
```

→ See [minigames.schema.md](./minigames.schema.md)

---

### `assets/`

Raw media files — images, audio, and UI elements. Referenced by paths declared in the `data/` `.md` files.

```
assets/
├── characters/     ← sprite PNGs organized by character id
├── scenes/         ← background images organized by scene id
├── audio/          ← audio files mirroring the data/audio/ category structure
└── ui/             ← cover image, logo, custom cursor, loading screen
```

**Naming convention:** paths in `.md` files are relative to the novel root. Example: `assets/characters/kai/happy.png`.

For adaptive audio tracks with multiple layers, each layer gets its own subfolder:

```
assets/audio/bgm/
├── morning_theme.ogg        ← single-file track
└── tension/                 ← adaptive track — one file per layer
    ├── base.ogg
    ├── strings.ogg
    └── percussion.ogg
```

---

### `minigames/`

One subfolder per minigame. Each contains the JS implementation that extends `MinigameBase`.

```
minigames/
└── match3/
    └── Match3Game.ts
```

`Match3Game.ts`:
- Extends `framework/minigames/MinigameBase.ts`
- Uses Pixi.js for rendering
- Is lazy-loaded — only downloaded when Ink calls `~ launch_minigame("match3")`
- Returns a result object whose keys match the `results` declared in `data/minigames/match3.md`

A novel with no minigames omits this folder entirely.

→ See [minigames.schema.md](./minigames.schema.md)

---

## Conventions

**One file per entity.** Every character, scene, audio track, and minigame has exactly one `.md` file. There are no index files or registries to maintain manually — the `DataLoader` discovers entities by scanning folders at startup.

**Data and assets are separate.** `data/` contains structured descriptions of what something *is*. `assets/` contains the actual media of what it *looks or sounds like*. The `.md` files in `data/` reference files in `assets/` by path.

**IDs tie everything together.** The `id` field in each `.md` file is the only coupling between the narrative script and the engine. Ink tags reference `id` values — nothing else. Renaming an asset file only requires updating the path in its `.md`, never touching the Ink script.

**LLM-friendly by design.** The `.md` format with YAML frontmatter and a free narrative body is well-suited for LLM generation. Given a schema reference and a brief, a model can produce valid entity files without writing any code. The Markdown body provides narrative context that makes generated output more consistent across entities.

**Adding a new novel is additive.** Creating a second novel means creating `games/my-second-novel/` with its own files. The `framework/` folder is never modified. No registration, no global config — the novel is self-contained.
