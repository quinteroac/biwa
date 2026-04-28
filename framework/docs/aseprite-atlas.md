# Aseprite Atlas JSON

The framework uses the `ComfyUI-GameAssetsMaker` Aseprite nodes as the source of truth for generated atlas metadata.

Current supported format:

- `meta.version: "aseprite-atlas-v1"`
- `frames` as an Aseprite hash object, keyed by frame file names such as `neutral.png`
- `meta.image` pointing to the future spritesheet image filename
- `meta.layout` describing direction, rows, columns, sprite count and frame size
- animation atlases use `meta.frameTags` and `meta.atlasType: "Animation"`

Generate a character atlas:

```bash
bun manager/cli.ts assets character-atlas smoke-fixture tester \
  --width 2048 \
  --height 2048 \
  --layout Grid \
  --names neutral,happy,sad,angry \
  --image tester_spritesheet.png
```

Generate an animation atlas:

```bash
bun manager/cli.ts assets animation-atlas smoke-fixture idle \
  --frames 4 \
  --tags '[{"name":"idle","from":0,"to":3,"direction":"forward","color":"#000000ff"}]'
```

Both commands write an atlas JSON file under `assets/`.

This iteration does not generate images or call external image APIs.

## Runtime Behavior

Character spritesheets can use either explicit `meta.frameTags` or visual-novel frame names. When `frameTags` are missing, the runtime infers one-frame tags from frame keys:

```json
{
  "frames": {
    "neutral.png": { "frame": { "x": 0, "y": 0, "w": 512, "h": 512 } },
    "happy.png": { "frame": { "x": 512, "y": 0, "w": 512, "h": 512 } }
  }
}
```

This lets `animation.expressions.neutral: neutral` resolve correctly without hand-editing the generated atlas.

## Official Renderer Plugin

Games can opt into the official renderer profile:

```ts
import { officialPlugins } from '../../framework/plugins/prebuilt/index.ts'

plugins: [
  officialPlugins.asepriteCharacterAtlas(),
]
```

Then declare characters with:

```yaml
animation:
  type: aseprite-character-atlas
  file: characters/kai/kai_spritesheet.png
  atlas: characters/kai/kai_atlas.json
  expressions:
    neutral: neutral
    happy: happy
```

`doctor` checks that every expression points to a frame tag or generated frame name in the atlas. For this official type it also expects the GameAssetsMaker contract fields:

- `meta.app: "ComfyUI Game Assets Maker"`
- `meta.version: "aseprite-atlas-v1"`

The future image-generation flow should produce the spritesheet image that matches `meta.image`; the current framework only generates and validates atlas JSON.
