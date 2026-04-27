# `minigames.md` — Schema Reference

Each minigame available in a novel is defined by a single Markdown file inside `data/minigames/`. The file declares the minigame's base configuration, its integration contract with the Ink narrative, and its result variables.

```
data/minigames/
  match3.md
  sliding_puzzle.md
  memory_cards.md
```

The implementation lives separately in `minigames/{id}/`:

```
minigames/
  match3/
    Match3Game.ts    ← extends MinigameBase
    config.json      ← optional default config (overridden by .md)
  sliding_puzzle/
    SlidingPuzzle.ts
```

---

## The two-file contract

A minigame is defined by two things that work together:

| File | Who touches it | Purpose |
|------|---------------|---------|
| `data/minigames/{id}.md` | Developer (once) | Declares config, result variables, difficulty, Ink contract |
| `minigames/{id}/{Class}.ts` | Developer | Implements the actual game logic using Pixi.js |

The `.md` file is what the engine reads. The `.ts` file is what runs in dev and is bundled/transpiled for production. They are linked by `id`.

---

## Frontmatter fields

### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier. Must match the key in `game.config.ts` minigames map and the Ink external function name: `~ launch_minigame("{id}")`. Only lowercase letters, numbers, and hyphens. |
| `displayName` | `string` | ✅ | Human-readable name. Shown in loading screens and debug panels. |
| `description` | `string` | — | One-line description of the mechanic. Used as LLM context. |
| `entry` | `string` | ✅ | Path to the TS file exporting the class that extends `MinigameBase`. Must match the lazy import in `game.config.ts`. |

```yaml
id:          match3
displayName: Match-3
description: Swap and match colored tiles to score points before time runs out.
entry:       minigames/match3/Match3Game.ts
```

---

### Integration mode

Defines how the minigame coexists with the VN presentation layer.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `integration` | `"fullscreen"` \| `"overlay"` \| `"reactive"` | ✅ | Controls how the minigame layer relates to the VN stage during play. |

| Value | Description |
|-------|-------------|
| `"fullscreen"` | The VN stage hides completely. The minigame takes the entire screen. Use for self-contained gameplay moments. |
| `"overlay"` | The minigame renders over the VN stage. Characters and backgrounds remain visible. Use when the narrative and gameplay coexist visually. |
| `"reactive"` | The VN stage stays fully active. The minigame runs in the background and only writes variables to Ink — no dedicated visual layer. Use for hidden mechanics (e.g. a timer that affects dialogue options). |

```yaml
integration: overlay
```

---

### Base config

The default configuration passed to `MinigameBase.init()` when no per-invocation overrides are provided. Shape is defined by the minigame's own implementation — the engine passes it through without validation beyond type-checking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config` | `Record<string, any>` | — | Default config object. Can be partially or fully overridden per Ink invocation via the `~ launch_minigame()` call parameters. |

```yaml
config:
  gridSize:  8
  colors:    6
  timeLimit: 60
```

---

### Difficulty

Optional. When defined, the engine exposes named difficulty presets that override specific config fields. The active difficulty is set from Ink before launching the minigame.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `difficulty.default` | `string` | ✅ (if `difficulty` present) | Key of the preset used when no difficulty is specified. |
| `difficulty.presets` | `Record<string, Preset>` | ✅ (if `difficulty` present) | Map of `presetName → config overrides`. Each preset merges into the base `config`. |

```yaml
difficulty:
  default: normal
  presets:
    easy:
      timeLimit: 90
      colors:    4
    normal:
      timeLimit: 60
      colors:    6
    hard:
      timeLimit: 40
      colors:    7
      gridSize:  10
```

> Difficulty presets are shallow-merged into `config`. Fields not listed in a preset retain their base `config` value.

---

### Results

Declares which variables the minigame writes into Ink upon completion. Each result maps a minigame output to an Ink variable name. The engine writes these values automatically before resuming the Ink story.

This is the core of the Ink integration contract — the writer uses these variable names in the script without knowing anything about the minigame implementation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `results` | `Record<string, ResultConfig>` | ✅ | Map of `resultKey → ResultConfig`. At least one result is required. |
| `results.{key}.inkVariable` | `string` | ✅ | The Ink variable name this result is written to. Must be declared with `VAR` in the Ink script. |
| `results.{key}.type` | `"number"` \| `"boolean"` \| `"string"` | ✅ | Expected type. The engine validates the minigame's output against this before writing to Ink. |
| `results.{key}.description` | `string` | — | Human-readable explanation of what this result represents. Used as documentation for writers. |

```yaml
results:
  score:
    inkVariable:  minigame_score
    type:         number
    description:  Total points scored. Used to determine Kai's reaction.
  completed:
    inkVariable:  minigame_completed
    type:         boolean
    description:  Whether the player finished before time ran out.
  combo:
    inkVariable:  minigame_best_combo
    type:         number
    description:  Highest combo chain achieved during the game.
```

The writer declares the variables in Ink and uses them freely:

```ink
VAR minigame_score     = 0
VAR minigame_completed = false
VAR minigame_best_combo = 0

~ launch_minigame("match3")

{ minigame_completed:
    { minigame_score >= 500:
        Kai looks impressed.
    - else:
        You made it, barely.
    }
- else:
    You ran out of time.
}
```

---

### Thresholds

Optional. Named score thresholds that map numeric results to readable labels. Purely documentary — they help writers understand what score ranges mean without reading the implementation. The engine does not use them at runtime; the writer uses the raw Ink variables.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `thresholds` | `Record<string, number>` | — | Map of `label → minimum value`. Rendered in the docs body for writer reference. |

```yaml
thresholds:
  bronze: 200
  silver: 500
  gold:   800
```

---

### Audio

Optional. Audio tracks played automatically during the minigame. Overrides whatever BGM is active in the VN at the time the minigame launches.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio.bgm` | `string` | — | ID of a BGM track from `data/audio/bgm/`. Fades in when the minigame starts, fades out when it ends. |
| `audio.fadeIn` | `number` | — | BGM fade-in duration in seconds. Default: `1.0`. |
| `audio.fadeOut` | `number` | — | BGM fade-out duration in seconds. Default: `1.0`. |
| `audio.restorePrevious` | `boolean` | — | Whether to restore the VN's previous BGM after the minigame ends. Default: `true`. |

```yaml
audio:
  bgm:             minigame_theme
  fadeIn:          0.5
  fadeOut:         1.5
  restorePrevious: true
```

---

## Markdown body

Everything after the closing `---` is free Markdown. Ignored at runtime. Use it for:

- Mechanic description for writers who don't read code
- Ink variable reference table (thresholds, what each result means narratively)
- Per-chapter usage notes
- Design rationale
- LLM generation context

---

## Full examples

### Match-3 — overlay, score + completion

```markdown
---
id:          match3
displayName: Match-3
description: Swap and match colored tiles to score points before time runs out.
entry:       minigames/match3/Match3Game.ts

integration: overlay

config:
  gridSize:  8
  colors:    6
  timeLimit: 60

difficulty:
  default: normal
  presets:
    easy:
      timeLimit: 90
      colors:    4
    normal:
      timeLimit: 60
      colors:    6
    hard:
      timeLimit: 40
      colors:    7
      gridSize:  10

results:
  score:
    inkVariable:  minigame_score
    type:         number
    description:  Total points scored during the game.
  completed:
    inkVariable:  minigame_completed
    type:         boolean
    description:  True if the player finished before time ran out.
  bestCombo:
    inkVariable:  minigame_best_combo
    type:         number
    description:  Highest combo chain achieved.

thresholds:
  bronze: 200
  silver: 500
  gold:   800

audio:
  bgm:             match3_theme
  fadeIn:          0.5
  fadeOut:         1.5
  restorePrevious: true
---

# Match-3

Appears in chapter 4 as a metaphor for the protagonist's mental state.
The tile colors mirror the main characters' palette.

## Result reference for writers

| Score range | Narrative meaning | Kai's reaction |
|-------------|------------------|----------------|
| < 200 | Struggled | Concern |
| 200–499 | Managed | Neutral |
| 500–799 | Solid performance | Impressed |
| 800+ | Exceptional | Surprised and proud |

## Ink usage

```ink
VAR minigame_score      = 0
VAR minigame_completed  = false
VAR minigame_best_combo = 0

~ launch_minigame("match3")

{ minigame_score >= 800:
    -> ending_gold
- minigame_score >= 500:
    -> ending_silver
- minigame_score >= 200:
    -> ending_bronze
- else:
    -> ending_fail
}
```

## Per-chapter config overrides

Chapter 4 (tutorial feel): difficulty `easy`
Chapter 7 (climax): difficulty `hard`, `gridSize: 12`
```

---

### Sliding puzzle — fullscreen, boolean result

```markdown
---
id:          sliding_puzzle
displayName: Sliding Puzzle
description: Rearrange tiles into the correct image. One-shot, no time limit.
entry:       minigames/sliding_puzzle/SlidingPuzzle.js

integration: fullscreen

config:
  gridSize: 3
  image:    assets/puzzle/kai_memory.jpg
  shuffles: 50

results:
  solved:
    inkVariable:  puzzle_solved
    type:         boolean
    description:  True if the player completed the puzzle.
  moves:
    inkVariable:  puzzle_moves
    type:         number
    description:  Number of moves used. Lower is better.

audio:
  bgm:             puzzle_ambient
  restorePrevious: true
---

# Sliding Puzzle

Used once in chapter 6 — reconstructing a fragmented memory.
The image is a photograph found in Kai's apartment.

No retry — the story continues regardless of whether the
player solves it. `puzzle_solved` determines the dialogue only.

## Ink usage

```ink
VAR puzzle_solved = false
VAR puzzle_moves  = 0

~ launch_minigame("sliding_puzzle")

{ puzzle_solved:
    The image becomes clear. You recognize the face.
- else:
    The pieces never quite fit. Something is still missing.
}
```
```

---

### Hidden timer — reactive, no visual layer

```markdown
---
id:          tension_timer
displayName: Tension Timer
description: >
  An invisible countdown that runs during a dialogue sequence.
  The player is not aware of it. Affects dialogue options available
  at the end of the scene.
entry:       minigames/tension_timer/TensionTimer.js

integration: reactive

config:
  duration:  45
  autoStart: true

results:
  timeRemaining:
    inkVariable:  timer_remaining
    type:         number
    description:  Seconds left when the scene ended. Affects available choices.
  expired:
    inkVariable:  timer_expired
    type:         boolean
    description:  True if the timer ran out before the scene ended.

---

# Tension Timer

Chapter 8 interrogation scene. The player does not see the timer.
It creates narrative pressure without explicit game-over stakes.

`TensionTimer.js` runs in the background, writes to Ink variables,
and calls `complete()` either when `duration` expires or when
the engine signals scene end — whichever comes first.

## Ink usage

```ink
VAR timer_remaining = 0
VAR timer_expired   = false

~ launch_minigame("tension_timer")

// ... dialogue sequence plays here ...

{ timer_expired:
    * [Confess] -> ending_confess
- else:
    * [Confess] -> ending_confess
    * [Stay silent] -> ending_silent
    * [Deflect] -> ending_deflect
}
```

The `Stay silent` and `Deflect` choices are only available
if the player read carefully and responded quickly enough.
```

---

## Ink external function reference

The engine binds `launch_minigame` as an Ink external function. It accepts the minigame `id` and optional per-invocation config overrides as a JSON string.

```ink
// Launch with base config from .md
~ launch_minigame("match3")

// Launch with difficulty preset
~ launch_minigame("match3", "easy")

// Launch with full config override (JSON string)
~ launch_minigame("match3", "{\"timeLimit\": 30, \"colors\": 8}")
```

Per-invocation overrides are shallow-merged into the base `config` from the `.md` file, then merged with the active difficulty preset (if any). Override priority:

```
base config (.md) → difficulty preset → per-invocation override
```

---

## MinigameBase contract

Every minigame class must extend `MinigameBase` and implement these methods:

```ts
// framework/minigames/MinigameBase.ts
export class MinigameBase {

  /**
   * Called once when the minigame is first loaded.
   * @param {object} config — merged config from .md + difficulty + overrides
   */
  async init(config) {}

  /**
   * Called when the engine is ready for the minigame to start.
   * Should return a Promise that resolves with the result object.
   * The result object keys must match the keys in `results` from the .md.
   * @returns {Promise<Record<string, number|boolean|string>>}
   */
  async start() {}

  /**
   * Called when the engine needs to stop the minigame early
   * (e.g. player navigated away, game was saved mid-session).
   * Must call resolve on the start() Promise before returning.
   */
  async stop() {}

  /**
   * Called after the result has been written to Ink.
   * Remove event listeners, dispose Pixi/Three objects, clear timers.
   */
  async destroy() {}

}
```

The result object returned by `start()` is validated against the `results` schema in the `.md` before being written to Ink:

```js
// Example implementation
async start() {
  return new Promise((resolve) => {
    this.onGameOver = (score, completed, bestCombo) => {
      resolve({
        score,        // maps to inkVariable: minigame_score
        completed,    // maps to inkVariable: minigame_completed
        bestCombo,    // maps to inkVariable: minigame_best_combo
      })
    }
  })
}
```

---

## Validation rules

The engine runs these checks at startup via `SchemaValidator`.

- `id` must match `/^[a-z0-9-]+$/`
- `id` must be unique across all files in `data/minigames/`
- `id` must match the filename (`match3.md` → `id: match3`)
- `id` must have a corresponding key in `game.config.ts` minigames map
- `entry` must point to an existing file
- `integration` must be one of `fullscreen`, `overlay`, `reactive`
- `results` must have at least one entry
- Each `results.{key}.type` must be `number`, `boolean`, or `string`
- `inkVariable` names must be unique across all results in this minigame
- `difficulty.default` must exist as a key in `difficulty.presets`
- `audio.bgm` must exist as an `id` in `data/audio/bgm/` if present
- `audio.fadeIn` and `audio.fadeOut` must be non-negative numbers if present
