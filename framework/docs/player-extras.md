# Player Extras

Player extras are optional framework features for completion-focused visual novels: CG galleries, music rooms and replay lists.

## Data Folders

Register extras through `game.config.ts`:

```ts
data: {
  gallery: './data/gallery/',
  music: './data/music/',
  replay: './data/replay/',
}
```

Each folder contains `.md` files with YAML frontmatter. The build pipeline converts them to JSON and writes `index.json` files like other data folders.

## Gallery Items

```md
---
id: cg_001
title: Midnight Cafe
image: gallery/cg_001.png
thumbnail: gallery/cg_001_thumb.png
description: First impossible meeting.
---
```

`image` can also be named `file`. Asset paths resolve from `assets/` unless they are absolute, relative (`./...`) or remote URLs.

## Music Room Tracks

```md
---
id: main_theme
title: Main Theme
file: audio/bgm/main_theme.ogg
description: The cafe at opening time.
loop: true
volume: 0.8
---
```

If `data.music` is omitted, `VnStage` uses the regular `data.audio` registry as a fallback for music-room tracks.

## Replay Entries

```md
---
id: chapter_01
title: Chapter 01
sceneId: cafe_exterior
thumbnail: scenes/cafe_exterior/night.png
description: The opening encounter.
---
```

Replay entries are tracked and displayed as unlockable records. Actual story replay routing is intentionally left to host games for now.

## Unlocking Content

Ink tags:

```ink
# unlock: cg_001, kind: gallery
# unlock_music: main_theme
# unlock_replay: chapter_01
```

Engine API:

```ts
engine.unlockGallery('cg_001')
engine.unlockMusic('main_theme')
engine.unlockReplay('chapter_01')
engine.getUnlocks()
```

Unlocks persist per game id under:

```txt
vn:{gameId}:player:unlocks
```

## UI Components

`VnStage` includes `Gallery` and `Music` entries in the top-right gear menu beside the audio controls. Hosts can replace the default overlays:

```tsx
<VnStage
  engine={engine}
  components={{
    Gallery: CustomGallery,
    MusicRoom: CustomMusicRoom,
  }}
/>
```

Default keyboard actions:

- gallery: `G`.
- music room / replay list: `R`.

The overlays use `role="dialog"`, close with `Escape` when focused and avoid advancing the story while open.
