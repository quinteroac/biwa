# `scenes.md` — Schema Reference

Each scene (background) in your visual novel is defined by a single Markdown file inside `data/scenes/`. The filename should match the scene's `id` (e.g. `cafe_exterior.md`).

The file has two parts: a **YAML frontmatter block** (between `---` delimiters) that the engine reads at startup, and a **freeform Markdown body** ignored at runtime — used as documentation for writers, artists, and LLMs.

```
data/scenes/
  cafe_exterior.md
  kai_apartment.md
  train_station.md
```

---

## Frontmatter fields

### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier. Must match the Ink tag: `# scene: cafe_exterior`. Only lowercase letters, numbers, and hyphens. |
| `displayName` | `string` | ✅ | Human-readable name. Used in the save file summary and scene previews. |
| `description` | `string` | — | One-line description. Used as alt text and LLM context. |

---

### Background

The `background` field uses a **discriminated union** — the `type` field determines which renderer the engine uses and which other fields are valid.

| Value | Renderer | Best for |
|-------|----------|----------|
| `"static"` | CSS `background-image` | Most scenes. Zero dependencies, instant load. |
| `"video"` | HTML `<video>` | Looping ambient motion — rain, fire, water. |
| `"parallax"` | CSS transforms | Depth illusion with layered PNGs. No animation needed. |
| `"spine"` | Spine runtime | Animated backgrounds — wind, clouds, crowd. |
| `"canvas"` | Pixi.js | Generative effects — particles, shaders, physics. |
| `"three"` | Three.js | 3D cinematic moments. Use sparingly. |

> `background.type` is always **required**.

---

#### `type: static` — Single image or variants

The simplest option. One PNG or JPG per scene or variant. No dependencies beyond the browser.

**Single image:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.type` | `"static"` | ✅ | Discriminator. |
| `background.image` | `string` | ✅ (if no variants) | Path to the background PNG or JPG. |
| `background.fit` | `"cover"` \| `"contain"` \| `"fill"` | — | CSS background-size behavior. Default: `"cover"`. |
| `background.position` | `string` | — | CSS background-position. Default: `"center"`. Example: `"top"`, `"80% 20%"`. |

```yaml
background:
  type:     static
  image:    scenes/library/default.png
  fit:      cover
  position: center
```

**With variants** — use when the same location appears under different conditions (time of day, weather, story state):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.variants` | `Record<string, StaticVariant>` | ✅ (if no image) | Map of `variantKey → StaticVariant`. Key is used in the Ink tag: `# scene: cafe_exterior, variant: night`. |
| `background.defaultVariant` | `string` | ✅ (if variants) | Key shown when no variant is specified in the Ink tag. |

Each `StaticVariant` shares the same fields as the single image (`image`, `fit`, `position`).

```yaml
background:
  type:           static
  defaultVariant: day
  variants:
    day:
      image:    scenes/cafe_exterior/day.png
      fit:      cover
      position: center
    night:
      image:    scenes/cafe_exterior/night.png
      fit:      cover
    rain:
      image:    scenes/cafe_exterior/rain.png
      fit:      cover
      position: top
```

---

#### `type: video` — Looping video background

A short video (3–6 seconds) played in a seamless loop. Ideal for dynamic ambient scenes where a still image would feel lifeless. Use WebM for best browser compatibility and file size.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.type` | `"video"` | ✅ | Discriminator. |
| `background.file` | `string` | ✅ | Path to the `.webm` or `.mp4` video file. |
| `background.poster` | `string` | — | Path to a still image shown while the video loads. Should match the first frame. |
| `background.fit` | `"cover"` \| `"contain"` \| `"fill"` | — | Default: `"cover"`. |

```yaml
background:
  type:   video
  file:   scenes/rain_window/loop.webm
  poster: scenes/rain_window/poster.png
  fit:    cover
```

> The engine always sets `autoplay`, `loop`, and `muted` on the video element. Audio is handled separately via scene `audio`.

---

#### `type: parallax` — Layered depth effect

Multiple PNG layers move at different speeds in response to pointer movement, creating an illusion of depth. Layers are rendered back to front — index `0` is the farthest (slowest), the last index is the closest (fastest).

Supports variants — each variant can define its own layer stack.

**Single set of layers:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.type` | `"parallax"` | ✅ | Discriminator. |
| `background.layers` | `ParallaxLayer[]` | ✅ (if no variants) | Array of depth layers. Minimum 2. |
| `background.intensity` | `number` | — | Global movement multiplier. `1.0` = normal. Default: `1.0`. |
| `background.layers[].image` | `string` | ✅ | Path to the layer PNG. Must be slightly larger than the stage to allow movement. |
| `background.layers[].depth` | `number` | ✅ | Movement speed: `0.0` = static, `1.0` = full pointer tracking. Recommended range: `0.05–0.8`. |
| `background.layers[].fit` | `"cover"` \| `"contain"` \| `"fill"` | — | Default: `"cover"`. |

```yaml
background:
  type:      parallax
  intensity: 0.9
  layers:
    - image: scenes/rooftop/sky.png
      depth: 0.05
    - image: scenes/rooftop/city.png
      depth: 0.25
    - image: scenes/rooftop/foreground.png
      depth: 0.55
```

**With variants** — each variant defines its own layer stack:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.variants` | `Record<string, ParallaxVariant>` | ✅ (if no layers) | Map of `variantKey → ParallaxVariant`. |
| `background.defaultVariant` | `string` | ✅ (if variants) | Key used when no variant is specified. |

Each `ParallaxVariant` has its own `layers` array and optional `intensity`.

```yaml
background:
  type:           parallax
  defaultVariant: sunset
  variants:
    sunset:
      intensity: 0.9
      layers:
        - image: scenes/rooftop/sky_sunset.png
          depth: 0.05
        - image: scenes/rooftop/city_sunset.png
          depth: 0.25
        - image: scenes/rooftop/fg.png
          depth: 0.55
    night:
      intensity: 0.7
      layers:
        - image: scenes/rooftop/sky_night.png
          depth: 0.05
        - image: scenes/rooftop/city_night.png
          depth: 0.2
        - image: scenes/rooftop/fg.png
          depth: 0.55
```

> **Depth guide:** sky `0.05–0.1` · distant buildings `0.15–0.3` · midground `0.3–0.5` · foreground `0.5–0.8`.

---

#### `type: spine` — Skeletal animated background

The background itself is a Spine animation — moving clouds, swaying trees, ambient crowd. Uses the same Spine runtime as animated characters. Supports variants mapped to different Spine animations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.type` | `"spine"` | ✅ | Discriminator. |
| `background.file` | `string` | ✅ | Path to the `.skel` or `.json` Spine export. |
| `background.atlas` | `string` | ✅ | Path to the Spine `.atlas` file. |
| `background.idle` | `string` | ✅ | Default Spine animation to loop. |
| `background.variants` | `Record<string, SpineVariant>` | — | Optional map of named variants to different animations. |
| `background.defaultVariant` | `string` | — | Required if `variants` is present. |

Each `SpineVariant` has a single field:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `animation` | `string` | ✅ | Spine animation name to play for this variant. |

```yaml
background:
  type:           spine
  file:           scenes/forest/forest.skel
  atlas:          scenes/forest/forest.atlas
  idle:           wind_idle
  defaultVariant: calm
  variants:
    calm:
      animation: wind_idle
    storm:
      animation: wind_storm
```

---

#### `type: canvas` — Pixi.js generative scene

The background is a fully custom Pixi.js scene. Use for generative effects — particle systems, custom shaders, physics simulations — that go beyond what CSS or Spine can express.

The `entry` field points to a JS class that extends `SceneBase`. The engine calls `init(config)`, `enter()`, `exit()`, and `destroy()` on it. The `config` object is passed directly from the YAML.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.type` | `"canvas"` | ✅ | Discriminator. |
| `background.entry` | `string` | ✅ | Path to the JS file exporting the class that extends `SceneBase`. |
| `background.config` | `Record<string, any>` | — | Arbitrary config object passed to `SceneBase.init()`. Shape is defined by the class itself. |

```yaml
background:
  type:  canvas
  entry: scenes/space_void/SpaceVoidScene.js
  config:
    starCount:     800
    nebulaColor:   "#1a0533"
    driftSpeed:    0.3
    shootingStars: true
```

> The class at `entry` must have a default export and extend `framework/scenes/SceneBase.js`.

---

#### `type: three` — Three.js 3D scene

The background is a Three.js scene. Use only for singular cinematic moments where 3D depth is essential to the narrative impact. Heavy — lazy loaded on demand.

Same contract as `canvas`: the `entry` class extends `SceneBase`, receives `config`, and implements the four lifecycle methods.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `background.type` | `"three"` | ✅ | Discriminator. |
| `background.entry` | `string` | ✅ | Path to the JS file exporting the class that extends `SceneBase`. |
| `background.config` | `Record<string, any>` | — | Arbitrary config passed to `SceneBase.init()`. |

```yaml
background:
  type:  three
  entry: scenes/cathedral/CathedralScene.js
  config:
    cameraOrbit:  true
    orbitSpeed:   0.08
    godRays:      true
    godRaysColor: "#fff8e1"
    ambientLight: 0.4
```

---

### Transitions

Defines how the engine animates into and out of this scene. Both `in` and `out` are optional — if omitted, the engine uses the global default from `game.config.ts`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transitions.in` | `TransitionConfig` | — | Animation played when this scene enters. |
| `transitions.out` | `TransitionConfig` | — | Animation played when this scene exits. |
| `transitions.in.type` | `TransitionType` | ✅ | See transition types below. |
| `transitions.in.duration` | `number` | — | Duration in seconds. Default: `0.5`. |
| `transitions.in.direction` | `TransitionDirection` | — | Required for `slide` and `wipe`. |
| `transitions.in.color` | `string` | — | Used by `fade-color`. CSS color. Default: `"black"`. |
| `transitions.in.easing` | `string` | — | CSS easing function. Default: `"ease"`. |

#### Transition types

| Value | Description |
|-------|-------------|
| `"fade"` | Fades through transparency. No extra fields needed. |
| `"fade-color"` | Fades through a solid color (black flash, white flash). Use `color` to set it. |
| `"slide"` | Slides the scene in/out. Requires `direction`. |
| `"wipe"` | Reveals/hides with a directional wipe. Requires `direction`. |
| `"cut"` | Instant cut. No animation. Ignores `duration`. |

#### Transition directions

Used by `slide` and `wipe`:

| Value | Description |
|-------|-------------|
| `"left"` | Moves or wipes from right to left. |
| `"right"` | Moves or wipes from left to right. |
| `"up"` | Moves or wipes from bottom to top. |
| `"down"` | Moves or wipes from top to bottom. |

```yaml
transitions:
  in:
    type:      fade
    duration:  0.8
    easing:    ease-in-out
  out:
    type:      slide
    direction: left
    duration:  0.5
```

---

### Scene Audio

Optional audio references that play automatically while the scene is active.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio.ambience` | `string | SceneAudioCue` | — | Looping ambience for this scene. |
| `audio.music` | `string | SceneAudioCue` | — | Persistent BGM for this scene. Alias: `audio.bgm`. |
| `audio.sfx` | `string | SceneAudioCue` | — | One-shot sound effect emitted when entering this scene. |

`SceneAudioCue` accepts `id`, `file`, `volume`, `fade`, `fadeIn`, `fadeOut`, and `duration`. Use `file` to reference an asset directly from `assets/`.

```yaml
audio:
  ambience:
    id: cafe_exterior_rain
    file: audio/ambience/storm/rain.ogg
    volume: 0.5
    fadeIn: 1
  music:
    id: cafe_exterior_theme
    file: audio/bgm/morning_theme.ogg
    volume: 0.45
    fadeIn: 1.5
    fadeOut: 2
```

---

### Ambient

Optional visual effects that render automatically while the scene is active.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ambient.effect` | `AmbientEffect` | — | Built-in visual effect overlaid on top of the scene. See values below. |

#### Ambient effects

| Value | Description |
|-------|-------------|
| `"rain"` | Animated rainfall overlay. |
| `"snow"` | Animated snowfall overlay. |
| `"sakura"` | Falling cherry blossom petals. |
| `"dust"` | Slow-floating dust particles. |
| `"none"` | Explicit no-effect. |

> `ambient.effect` can be combined with any `background.type`. A `static` background can have a `rain` overlay without using `type: video`.

```yaml
ambient:
  effect: rain
```

---

### Thumbnail

Optional. Used in save slots and scene galleries.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `thumbnail` | `string` | — | Path to a small preview image. Recommended: `320×180px`. Falls back to a frame-grab if omitted. |

---

## Markdown body

Everything after the closing `---` is free Markdown. Ignored at runtime. Use it for:

- Location description for writers and artists
- Mood, lighting, and palette notes
- Which chapters the scene appears in
- Art direction references
- Variant usage notes
- LLM generation context

---

## Full examples

### Level 1 — Static single image

```markdown
---
id: library_interior
displayName: School Library
description: Quiet afternoon light through tall windows.

background:
  type:     static
  image:    scenes/library/default.png
  fit:      cover
  position: center

transitions:
  in:
    type:     fade
    duration: 0.6

thumbnail: scenes/library/thumb.jpg
---

# School Library

Used in chapters 1, 3, and 6. Warm dust and silence.
The recurring safe space for the protagonist.
```

---

### Level 1 — Static with variants

```markdown
---
id: cafe_exterior
displayName: Café Exterior
description: A quiet street-corner café. First encounter with Kai.

background:
  type:           static
  defaultVariant: day
  variants:
    day:
      image:    scenes/cafe_exterior/day.png
      fit:      cover
      position: center
    night:
      image:    scenes/cafe_exterior/night.png
      fit:      cover
    rain:
      image:    scenes/cafe_exterior/rain.png
      fit:      cover
      position: top

transitions:
  in:
    type:     fade
    duration: 0.8
  out:
    type:     fade
    duration: 0.5

audio:
  ambience:
    id: cafe_exterior_city
    file: audio/ambience/city_morning.ogg
    volume: 0.5

thumbnail: scenes/cafe_exterior/thumb.jpg
---

# Café Exterior

Warm ochre tones. Deliberately contrasts with Kai's cold apartment.

## Variants
- `day` — soft morning light, chapter 1
- `night` — neon reflections on wet pavement, chapter 5
- `rain` — used during the argument scene in chapter 8
```

---

### Level 2 — Video loop

```markdown
---
id: rain_window
displayName: Rainy Window
description: Interior shot of a rain-streaked window at night.

background:
  type:   video
  file:   scenes/rain_window/loop.webm
  poster: scenes/rain_window/poster.png
  fit:    cover

transitions:
  in:
    type:     fade-color
    color:    black
    duration: 1.2
  out:
    type:     fade
    duration: 0.8

audio:
  ambience:
    id: rain_window_heavy
    file: audio/ambience/rain_heavy.ogg
    volume: 0.7

thumbnail: scenes/rain_window/thumb.jpg
---

# Rainy Window

The go-to scene for emotional low points. Keep dialogue
sparse here — the rain does most of the narrative work.
```

---

### Level 3 — Parallax with variants

```markdown
---
id: rooftop_sunset
displayName: Rooftop
description: City rooftop. Golden hour. The confession scene.

background:
  type:           parallax
  defaultVariant: sunset
  variants:
    sunset:
      intensity: 0.9
      layers:
        - image: scenes/rooftop/sky_sunset.png
          depth: 0.05
        - image: scenes/rooftop/city_sunset.png
          depth: 0.25
        - image: scenes/rooftop/fg.png
          depth: 0.55
    night:
      intensity: 0.7
      layers:
        - image: scenes/rooftop/sky_night.png
          depth: 0.05
        - image: scenes/rooftop/city_night.png
          depth: 0.2
        - image: scenes/rooftop/fg.png
          depth: 0.55

transitions:
  in:
    type:      wipe
    direction: up
    duration:  0.9
  out:
    type:     fade
    duration: 0.6

thumbnail: scenes/rooftop/thumb.jpg
---

# Rooftop

Emotional peak of chapter 5. Use the night variant
for the epilogue callback in chapter 9.
```

---

### Level 4 — Spine animated background

```markdown
---
id: forest_clearing
displayName: Forest Clearing
description: A sunlit clearing. Leaves move with the wind.

background:
  type:           spine
  file:           scenes/forest/forest.skel
  atlas:          scenes/forest/forest.atlas
  idle:           wind_idle
  defaultVariant: calm
  variants:
    calm:
      animation: wind_idle
    storm:
      animation: wind_storm

transitions:
  in:
    type:     fade
    duration: 1.4
    easing:   ease-in
  out:
    type:     fade
    duration: 1.0

audio:
  ambience:
    id: forest_birds
    file: audio/ambience/forest_birds.ogg
    volume: 0.5

ambient:
  effect: dust

thumbnail: scenes/forest/thumb.jpg
---

# Forest Clearing

Dream sequences only. Use the `storm` variant during
the confrontation — the trees react to the tension.

The long fade-in is deliberate. The player should feel
they are arriving somewhere, not cutting to it.
```

---

### Level 5 — Canvas / Pixi.js

```markdown
---
id: space_void
displayName: The Void
description: An infinite starfield. Chapter 7 metaphysical dialogue.

background:
  type:  canvas
  entry: scenes/space_void/SpaceVoidScene.js
  config:
    starCount:     800
    nebulaColor:   "#1a0533"
    driftSpeed:    0.3
    shootingStars: true

transitions:
  in:
    type:     fade-color
    color:    black
    duration: 2.0
    easing:   ease-in
  out:
    type:     fade-color
    color:    black
    duration: 1.5

thumbnail: scenes/space_void/thumb.jpg
---

# The Void

Generative starfield via Pixi.js particles.
SpaceVoidScene.js extends SceneBase.

The `nebulaColor` can shift between chapters to track
the protagonist's psychological state.
```

---

### Level 6 — Three.js 3D scene

```markdown
---
id: cathedral_interior
displayName: Cathedral Interior
description: Vast gothic cathedral. God rays. Chapter 9 climax.

background:
  type:  three
  entry: scenes/cathedral/CathedralScene.js
  config:
    cameraOrbit:  true
    orbitSpeed:   0.08
    godRays:      true
    godRaysColor: "#fff8e1"
    ambientLight: 0.4

transitions:
  in:
    type:     fade-color
    color:    white
    duration: 2.5
    easing:   ease-in-out
  out:
    type:     fade-color
    color:    white
    duration: 2.0

audio:
  ambience:
    id: cathedral_reverb
    file: audio/ambience/cathedral_reverb.ogg
    volume: 0.3

thumbnail: scenes/cathedral/thumb.jpg
---

# Cathedral Interior

Used only once — the climax of chapter 9.
CathedralScene.js extends SceneBase, uses Three.js r158.

The white fade mirrors the train station departure in
chapter 4 — intentional callback.
```

---

## Ink tag reference

```ink
# scene: {id}
# scene: {id}, variant: {variantKey}
# scene: {id}, transition: fade
# scene: {id}, transition: slide, direction: left
# scene: {id}, transition: cut
```

Transition tags override the scene's default `transitions.in` for that specific entrance only — they do not permanently change the scene config.

---

## SceneBase contract

Classes used by `type: canvas` and `type: three` must extend `SceneBase` and implement these methods:

```js
// framework/scenes/SceneBase.js
export class SceneBase {
  async init(config) {}   // receives background.config from the .md
  async enter() {}        // called when the scene transitions in
  async exit() {}         // called when the scene transitions out
  async destroy() {}      // cleanup — remove listeners, dispose textures
}
```

---

## Validation rules

The engine runs these checks at startup via `SchemaValidator`.

- `id` must match `/^[a-z0-9-]+$/`
- `id` must be unique across all files in `data/scenes/`
- `id` must match the filename (`cafe_exterior.md` → `id: cafe_exterior`)
- `background.type` is required and must be a valid `BackgroundType`
- For `static`: `background.image` and `background.variants` cannot both be present
- For `static` and `parallax`: `background.variants` requires `background.defaultVariant`
- `background.defaultVariant` must exist as a key in `background.variants`
- For `parallax`: `layers` must have at least 2 entries
- `parallax.layers[].depth` must be between `0.0` and `1.0`
- For `spine`: `file`, `atlas`, and `idle` are all required
- For `canvas` and `three`: `entry` is required and the file must exist
- `transitions.in.type` and `transitions.out.type` must be a valid `TransitionType`
- `transitions.in.direction` is required when type is `"slide"` or `"wipe"`
- `audio.*.volume` must be between `0.0` and `1.0`
- `ambient.effect` must be a valid `AmbientEffect` value if present
