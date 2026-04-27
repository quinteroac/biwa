# First Game Guide

This guide is the shortest path from an empty idea to a running visual novel.

## Create

```bash
bun manager/cli.ts new midnight-cafe "The Midnight Cafe"
bun manager/cli.ts doctor midnight-cafe
bun manager/cli.ts dev midnight-cafe
```

The `new` command creates a project that already has:

- `game.config.ts`
- `index.html`
- `story/en/main.ink`
- `story/en/chapter_01.ink`
- `data/scenes/default.md`
- `assets/scenes/default/background.svg`

`doctor` should report `0 error(s)` immediately. Warnings are allowed while you are still adding final assets.

## Edit Story

Open `games/midnight-cafe/story/en/chapter_01.ink`:

```ink
=== chapter_01 ===
# scene: default
Welcome to The Midnight Cafe.
Your story begins here.
-> DONE
```

Scene, character and audio changes are driven by Ink tags. See [ink-tags.md](./ink-tags.md).

## Add Data

Runtime data lives in Markdown files with YAML frontmatter:

```markdown
---
id: default
name: Default Scene
background:
  type: static
  image: scenes/default/background.svg
---

Notes for writers and agents can live here.
```

The `id` is what Ink references. For example, `# scene: default` looks for a scene data file with `id: default`.

## Validate

Run:

```bash
bun manager/cli.ts doctor midnight-cafe
```

Errors block production builds. Warnings point at missing optional assets or polish items.

## Build

```bash
bun manager/cli.ts build midnight-cafe
```

The build command validates content first, compiles configured Ink locale entrypoints, converts data to JSON, copies assets and writes `dist/midnight-cafe/`.

See [distribution.md](./distribution.md) for hosting layouts and the production runtime strategy.
