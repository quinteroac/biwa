# `characters.md` — Schema Reference

Each character in your visual novel is defined by a single Markdown file inside `data/characters/`. The filename should match the character's `id` (e.g. `kai.md`).

The file has two parts: a **YAML frontmatter block** (between `---` delimiters) that the engine reads, and a **freeform Markdown body** that is ignored at runtime but serves as documentation for writers and collaborators — and as context for LLMs when generating or editing characters.

```
data/characters/
  kai.md
  sara.md
  narrator.md
```

---

## Frontmatter fields

### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier. Must match the value used in Ink tags: `# character: kai`. Only lowercase letters, numbers, and hyphens. |
| `displayName` | `string` | ✅ | Name shown in the dialog box. Can differ from `id`. |
| `nameColor` | `string` | — | CSS color for the character's name in the dialog box. Accepts hex or any valid CSS value. Default: `white`. |
| `isNarrator` | `boolean` | — | If `true`, the name is hidden in the dialog box. Use for narration or inner monologue. Default: `false`. |

---

### Studio editorial metadata

These fields are optional for the runtime, but Biwa Studio reads and writes them in the Character Sheet. They are useful for authoring, concept-art prompts, consistency checks, and LLM context. New Studio-authored character files should include the full block, even when values are initially empty.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | `string` | — | Story role shown in Studio, such as `Protagonist`, `Antagonist`, `Supporting`, or `Narrator`. |
| `age` | `string` | — | Freeform age value. Kept as a string so authors can use ranges or unknown values. |
| `gender` | `string` | — | Studio options include `Male`, `Female`, `Transgender`, `Non-binary`, and `Other`, but custom text is allowed. |
| `tags` | `string[]` | — | Short organizational labels shown as chips in Studio. |
| `physicalDescription` | `string` | — | Brief visual description for reference and generation prompts. |
| `expressionsText` | `string[]` | — | Human-readable expression names used by the Character Sheet; separate from runtime `animation.expressions`. |
| `outfit` | `string` | — | Clothing or costume notes. |
| `palette` | `string` | — | Comma-separated color palette values, usually hex colors. |
| `personality` | `string` | — | Short personality description. |
| `traits` | `string[]` | — | Personality trait chips. |
| `motivations` | `string` | — | Goals and driving wants. |
| `fears` | `string` | — | Fears or vulnerabilities. |
| `internalConflict` | `string` | — | Central contradiction or emotional tension. |
| `backstory` | `string` | — | Condensed history used by writers and Studio. |
| `keyEvents` | `string[]` | — | Important past events or turning points. |
| `arcInitial` | `string` | — | Character state at the beginning of the arc. |
| `arcBreak` | `string` | — | Turning point or midpoint transformation. |
| `arcFinal` | `string` | — | Character state at the end of the arc. |
| `characterSheet` | `object` | — | Studio-only concept-art and character-sheet image references. Paths are relative to the game's `assets/` directory. |

```yaml
role: Supporting
age: "17"
gender: Female
tags: [school, energetic]
physicalDescription: "Short red hair, bright expression, casual school hoodie."
expressionsText: [neutral, happy, wink, school]
outfit: "White hoodie, jeans, and school uniform variant."
palette: "#1b1c19, #444748, #747878, #c4c7c7, #ba1a1a"
personality: "Outgoing, perceptive, and quick to defuse tension."
traits: [Warm, Observant, Impulsive]
motivations: "Keep her friends together and uncover what is being hidden."
fears: "Being left behind."
internalConflict: "She jokes to avoid admitting when she is afraid."
backstory: "A long-time friend whose cheerfulness hides family pressure."
keyEvents:
  - "Transferred schools before the story begins."
arcInitial: "Acts carefree and avoids serious conflict."
arcBreak: "Chooses to confront the truth directly."
arcFinal: "Learns to ask for help without hiding behind humor."
characterSheet:
  main: characters/sara/character-sheet/main.png
  concepts:
    - characters/sara/character-sheet/concepts/concept-001.png
  generated:
    - characters/sara/character-sheet/generated/sheet-001.png
```

---

### Character Sheet Art

`characterSheet` stores Studio authoring images only. These files are concept art, model sheets, generated references, or design exploration; they are not runtime sprites and are not used by `VnCharacter`.

Store the files under the character's asset folder:

```txt
games/<gameId>/assets/characters/<character_id>/character-sheet/
  main.png
  concepts/
    concept-001.png
    concept-002.png
  generated/
    sheet-001.png
```

Reference those files in markdown relative to `assets/`:

```yaml
characterSheet:
  main: characters/kai/character-sheet/main.png
  concepts:
    - characters/kai/character-sheet/concepts/concept-001.png
  generated:
    - characters/kai/character-sheet/generated/sheet-001.png
```

`main` is the large preview shown in Studio. `concepts` are images uploaded by the author. `generated` are AI-generated sheets or explorations. Keeping uploaded and generated images separate lets Studio show provenance clearly without changing runtime animation data.

---

### Position

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `defaultPosition` | `"left"` \| `"center"` \| `"right"` | — | Starting position on stage when the character enters. Default: `"center"`. |
| `defaultExpression` | `string` | — | State key shown when the character first appears. Must exist in `animation.states.*.sprites` or a layer's animation. |
| `scale` | `number` | — | Size relative to the stage. `1.0` = natural size. Use `1.2` for a taller character, `0.8` for a shorter one. |
| `offset` | `{ x: number, y: number }` | — | Fine-grained position adjustment in pixels relative to the stage. Example: `{ x: 0, y: -20 }`. |

---

### Animation

The `animation` field uses a **discriminated union** — the `type` field determines which other fields are valid. The engine dispatches to the correct renderer based on `type`.

> **Note:** `animation` and `layers` are mutually exclusive. If `layers` is present, `animation` at the root level is ignored.

#### `type: sprites` — Static PNG sprites

One image per expression. The simplest option, no additional dependencies.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `animation.type` | `"sprites"` | ✅ | Discriminator. |
| `animation.sprites` | `Record<string, string>` | ✅ | Map of `expression → PNG path`. At least one expression is required. |

```yaml
animation:
  type: sprites
  sprites:
    neutral:   characters/kai/neutral.png
    happy:     characters/kai/happy.png
    sad:       characters/kai/sad.png
    surprised: characters/kai/surprised.png
```

---

#### `type: spritesheet-library` — States and live animations

Use this for Aseprite/GameAssetsMaker atlases. State sprites and multi-frame animation actions are intentionally separate:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `animation.type` | `"spritesheet-library"` | ✅ | Discriminator. |
| `animation.defaultStateSheet` | `string` | — | Default sheet key inside `states`. |
| `animation.defaultAnimationSheet` | `string` | — | Default sheet key inside `animationSheets`. |
| `animation.defaultState` | `string` | — | Default still state, usually `neutral`. |
| `animation.defaultAction` | `string` | — | Default multi-frame action, when needed. |
| `animation.states` | `Record<string, StateSheet>` | ✅ | Visual-novel state sheets. Each sheet has `file`, `atlas`, and `sprites`. |
| `animation.animationSheets` | `Record<string, AnimationSheet>` | ✅ | Multi-frame action sheets. Each sheet has `file`, `atlas`, and `actions`. |

`states.*.sprites` maps a runtime state key to a single-frame atlas tag or frame name. `animationSheets.*.actions` maps a runtime action key to a multi-frame atlas tag. Animation atlases can include several actions, and each action owns a fixed range of frames.

```yaml
animation:
  type: spritesheet-library
  defaultStateSheet: Main
  defaultAnimationSheet: Motion
  defaultState: neutral
  defaultAction: idle
  states:
    Main:
      file: characters/kai/spritesheets/Main/kai_states.png
      atlas: characters/kai/spritesheets/Main/kai_states_map.json
      sprites:
        neutral: neutral
        happy: happy
        sad: sad
  animationSheets:
    Motion:
      file: characters/kai/spritesheets/Motion/kai_motion.png
      atlas: characters/kai/spritesheets/Motion/kai_motion_map.json
      actions:
        idle: idle
        evil_laugh: evil_laugh
```

The official prebuilt plugin exposes the same runtime through a declared external renderer:

```ts
plugins: [
  officialPlugins.asepriteCharacterAtlas(),
]
```

```yaml
animation:
  type: aseprite-character-atlas
  defaultStateSheet: Main
  defaultAnimationSheet: Motion
  defaultState: neutral
  states:
    Main:
      file: characters/kai/spritesheets/Main/kai_states.png
      atlas: characters/kai/spritesheets/Main/kai_states_map.json
      sprites:
        neutral: neutral
        happy: happy
  animationSheets:
    Motion:
      file: characters/kai/spritesheets/Motion/kai_motion.png
      atlas: characters/kai/spritesheets/Motion/kai_motion_map.json
      actions:
        idle: idle
```

Use `aseprite-character-atlas` when you want the game config to make this asset contract explicit. `doctor` validates state/action references against atlas frameTags or inferred frame names.

---

#### `type: spine` — Spine 2D skeletal animation

Professional-grade skeletal animation. Requires the Spine runtime (~500KB).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `animation.type` | `"spine"` | ✅ | Discriminator. |
| `animation.file` | `string` | ✅ | Path to the `.skel` or `.json` Spine export. |
| `animation.atlas` | `string` | ✅ | Path to the Spine `.atlas` file. |
| `animation.expressions` | `Record<string, string>` | ✅ | Map of `expression → Spine animation name`. |
| `animation.idle` | `string` | — | Animation to loop when no expression is active. Example: `"idle_breathe"`. |

```yaml
animation:
  type: spine
  file:  characters/kai/kai.skel
  atlas: characters/kai/kai.atlas
  idle:  idle_breathe
  expressions:
    neutral:   idle_neutral
    menacing:  taunt
    surprised: hit_react
```

---

#### `type: rive` — Rive animation

Modern open-source alternative to Spine. Uses a State Machine to switch between expressions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `animation.type` | `"rive"` | ✅ | Discriminator. |
| `animation.file` | `string` | ✅ | Path to the `.riv` file. |
| `animation.stateMachine` | `string` | ✅ | Name of the State Machine inside the Rive file that controls expressions. |
| `animation.expressions` | `Record<string, string>` | ✅ | Map of `expression → State Machine input name`. |

```yaml
animation:
  type: rive
  file:         characters/sara/sara.riv
  stateMachine: ExpressionController
  expressions:
    neutral:  Neutral
    happy:    Happy
    sad:      Sad
```

---

### Layers

Use `layers` instead of `animation` when a character is composed of independently-swappable parts (e.g. separate body, face, and outfit images).

Layers are rendered in array order — the first layer is at the bottom, the last is on top.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `layers` | `Layer[]` | — | Array of independent visual layers. Mutually exclusive with `animation`. |
| `layers[].id` | `string` | ✅ | Layer identifier. Common values: `"body"`, `"face"`, `"outfit"`. Referenced in Ink tags: `# character: sara, layer: outfit, expression: casual`. |
| `layers[].animation` | `Animation` | ✅ | Same schema as the root `animation` field. |
| `layers[].default` | `string` | — | Default expression for this layer on entry. |

```yaml
layers:
  - id: body
    animation:
      type: sprites
      sprites:
        default: characters/sara/body.png
    default: default

  - id: face
    animation:
      type: sprites
      sprites:
        neutral: characters/sara/face_neutral.png
        happy:   characters/sara/face_happy.png
        wink:    characters/sara/face_wink.png
    default: neutral

  - id: outfit
    animation:
      type: sprites
      sprites:
        school: characters/sara/outfit_school.png
        casual: characters/sara/outfit_casual.png
    default: school
```

To change a single layer from an Ink script:

```ink
Sara changed into her casual clothes.
# character: sara, layer: outfit, expression: casual
```

---

### Voice

Voice acting is optional and can be configured per character. Individual audio files are referenced from Ink tags — the engine builds the full path from the folder and format defined here.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `voice.folder` | `string` | ✅ (if `voice` present) | Base folder for voice files. Example: `audio/voice/kai/`. |
| `voice.format` | `"ogg"` \| `"mp3"` \| `"webm"` | — | Audio format. Default: `"ogg"`. |
| `voice.volume` | `number` | — | Relative volume, `0.0–1.0`. Default: `1.0`. |

```yaml
voice:
  folder: audio/voice/kai/
  format: ogg
  volume: 0.9
```

To trigger a voice line from Ink:

```ink
Kai looked away.
# voice: kai_ch01_003
```

The engine resolves this to `audio/voice/kai/kai_ch01_003.ogg`.

---

## Markdown body

Everything after the closing `---` is free Markdown. The engine ignores it entirely. Use it for:

- Character biography and backstory
- Personality notes for writers
- Narrative arc across chapters
- Relationship notes with other characters
- LLM generation context

This section is also the context you pass to an LLM when asking it to generate new dialogue, maintain voice consistency, or create related characters.

---

## Full examples

### Minimal character

```markdown
---
id: narrator
displayName: ""
isNarrator: true

animation:
  type: sprites
  sprites:
    default: ""
---

The narrator. No sprite, no name shown in the dialog box.
```

### Static sprites with voice

```markdown
---
id: kai
displayName: Kai
nameColor: "#7dd3fc"
defaultPosition: right
defaultExpression: neutral

animation:
  type: sprites
  sprites:
    neutral:   characters/kai/neutral.png
    happy:     characters/kai/happy.png
    sad:       characters/kai/sad.png
    surprised: characters/kai/surprised.png

voice:
  folder: audio/voice/kai/
  format: ogg
  volume: 0.9
---

# Kai

Final-year student. Reserved by nature, but with a complicated past
that slowly surfaces throughout the novel.

## Personality

Introverted but loyal. Struggles to trust new people.
Reacts poorly to dishonesty.

## Writing notes

Kai never initiates conversation. He always responds with questions.
Avoid making him sound aggressive — his tone is distant, not hostile.
```

### Layered sprites

```markdown
---
id: sara
displayName: Sara
nameColor: "#f9a8d4"
defaultPosition: left
defaultExpression: neutral

layers:
  - id: body
    animation:
      type: sprites
      sprites:
        default: characters/sara/body.png
    default: default

  - id: face
    animation:
      type: sprites
      sprites:
        neutral: characters/sara/face_neutral.png
        happy:   characters/sara/face_happy.png
        wink:    characters/sara/face_wink.png
    default: neutral

  - id: outfit
    animation:
      type: sprites
      sprites:
        school: characters/sara/outfit_school.png
        casual: characters/sara/outfit_casual.png
    default: school
---

# Sara

Secondary character. Outgoing and perceptive. Her outfit changes
reflect her emotional state across chapters.
```

### Spine animation

```markdown
---
id: antagonist
displayName: "???"
nameColor: "#f87171"
defaultPosition: center
scale: 1.2

animation:
  type: spine
  file:  characters/antagonist/antagonist.skel
  atlas: characters/antagonist/antagonist.atlas
  idle:  idle_breathe
  expressions:
    neutral:   idle_neutral
    menacing:  taunt
    surprised: hit_react
---

# The Antagonist

Real name revealed in chapter 6. Scaled up slightly to feel
imposing when centered on stage.
```

---

## Ink tag reference

All character interactions from Ink use the `# character:` tag.

```ink
# character: {id}
# character: {id}, position: left|center|right
# character: {id}, expression: {expressionKey}
# character: {id}, position: right, expression: happy
# character: {id}, layer: {layerId}, expression: {expressionKey}
# character: {id}, exit
```

The engine resolves each tag against the character's config in `CharacterRegistry`.

---

## Validation rules

`bun manager/cli.ts doctor <gameId>` checks character files during authoring. Runtime uses the same frontmatter data, but Studio editorial fields are non-fatal metadata and do not block the game from running.

- `id` must match `/^[a-z0-9-]+$/`
- `id` must be unique across all files in `data/characters/`
- `id` must match the filename (e.g. `kai.md` → `id: kai`)
- `animation` and `layers` cannot both be present
- If `animation` is present, `type` is required
- `defaultExpression` must exist as a key in `animation.sprites`, `animation.expressions`, or at least one layer's animation
- `voice.volume` must be between `0.0` and `1.0`
- `scale` must be a positive number
- Missing Studio editorial fields are reported as informational diagnostics so older projects can keep running while authors migrate files.
