import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

function deriveTitle(gameId: string): string {
  return gameId
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function write(filePath: string, content: string): void {
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, content)
}

export async function newGame(gameId?: string, title?: string): Promise<void> {
  if (!gameId) {
    console.error('Usage: bun new <gameId> [title]')
    process.exit(1)
  }

  const gameDir = join(ROOT, 'games', gameId)
  if (existsSync(gameDir)) {
    console.error(`Game "${gameId}" already exists at games/${gameId}/`)
    process.exit(1)
  }

  title ??= deriveTitle(gameId)

  console.log(`\n🎬 Scaffolding new game: "${title}" (${gameId})\n`)

  // index.html
  write(join(gameDir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
`)

  // game.config.ts
  write(join(gameDir, 'game.config.ts'), `// games/${gameId}/game.config.ts
import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = {
  id:          '${gameId}',
  title:       '${title}',
  version:     '0.1.0',

  story: {
    defaultLocale: 'en',
    locales: {
      en: './story/en/main.ink',
    },
  },

  data: {
    characters: './data/characters/',
    scenes:     './data/scenes/',
    audio:      './data/audio/',
  },

  minigames: {},

  theme: {
    font:     '"Georgia", serif',
    dialogBg: 'rgba(10, 10, 20, 0.85)',
    accent:   '#c084fc',
    cssVars:  {},
  },

  saves: {
    slots:    5,
    autoSave: true,
  },

  distribution: {
    mode:     'standalone',
    basePath: '/${gameId}',
  },
}

export default config
`)

  // story/en/main.ink
  write(join(gameDir, 'story/en/main.ink'), `// ${title} - Main Story
INCLUDE chapter_01.ink

-> chapter_01
`)

  // story/en/chapter_01.ink
  write(join(gameDir, 'story/en/chapter_01.ink'), `// Chapter 1
=== chapter_01 ===
# scene: default
Welcome to ${title}.
Your story begins here.
-> DONE
`)

  const emptyDirs = [
    'data/characters',
    'data/scenes',
    'data/audio/bgm',
    'data/audio/sfx',
    'assets',
    'minigames',
  ]

  for (const dir of emptyDirs) {
    const fullPath = join(gameDir, dir)
    mkdirSync(fullPath, { recursive: true })
    writeFileSync(join(fullPath, '.gitkeep'), '')
  }

  console.log(`  ✓ games/${gameId}/index.html`)
  console.log(`  ✓ games/${gameId}/game.config.ts`)
  console.log(`  ✓ games/${gameId}/story/en/main.ink`)
  console.log(`  ✓ games/${gameId}/story/en/chapter_01.ink`)
  console.log(`  ✓ games/${gameId}/data/characters/`)
  console.log(`  ✓ games/${gameId}/data/scenes/`)
  console.log(`  ✓ games/${gameId}/data/audio/bgm/`)
  console.log(`  ✓ games/${gameId}/data/audio/sfx/`)
  console.log(`  ✓ games/${gameId}/assets/`)
  console.log(`  ✓ games/${gameId}/minigames/`)

  console.log(`
✅ Game "${title}" created!

Next steps:
  1. cd games/${gameId}
  2. Edit story/en/chapter_01.ink to write your story
  3. Add character data to data/characters/
  4. bun dev ${gameId}     — start dev server
`)
}
