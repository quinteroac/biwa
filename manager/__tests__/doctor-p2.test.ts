import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  createDoctorJsonReport,
  summarizeIssueCategories,
  suggestNextSteps,
  validateGame,
  type Issue,
} from '../commands/doctor.ts'

const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')

function gameDir(gameId: string): string {
  return join(ROOT, 'games', gameId)
}

describe('doctor author ergonomics', () => {
  const issues: Issue[] = [
    {
      severity: 'warning',
      path: 'data/scenes/cafe.md',
      code: 'asset_missing',
      message: 'Scene background image not found: scenes/cafe/bg.png',
      suggestion: 'Add the file under assets/.',
    },
    {
      severity: 'error',
      path: 'story/en/main.ink:4',
      code: 'tag_unknown',
      message: 'Unknown Ink tag "effect".',
      suggestion: 'Enable the plugin that owns the tag.',
    },
  ]

  it('summarizes diagnostics by author-facing category', () => {
    expect(summarizeIssueCategories(issues)).toEqual({
      assets: { error: 0, warning: 1, info: 0 },
      plugins: { error: 1, warning: 0, info: 0 },
    })
  })

  it('suggests next commands or actions from issue codes', () => {
    const steps = suggestNextSteps(issues)
    expect(steps.some(step => step.includes('assets/'))).toBe(true)
    expect(steps.some(step => step.includes('plugins[].tags'))).toBe(true)
  })

  it('includes category summaries and next steps in JSON reports', () => {
    const report = createDoctorJsonReport('demo', '/repo/games/demo', issues)

    expect(report.summary.error).toBe(1)
    expect(report.categories.assets?.warning).toBe(1)
    expect(report.nextSteps.length).toBeGreaterThan(0)
    expect(report.issues[0]?.code).toBe('asset_missing')
  })

  it('reports missing Studio character editorial fields as info', async () => {
    const gameId = `doctor-editorial-fields-${Date.now()}`
    const dir = gameDir(gameId)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(join(dir, 'story/en'), { recursive: true })
    mkdirSync(join(dir, 'data/characters'), { recursive: true })
    writeFileSync(join(dir, 'story/en/main.ink'), 'Hello.\n')
    writeFileSync(join(dir, 'game.config.ts'), `import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: '${gameId}',
  version: '1.0.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { characters: './data/characters/' },
}

export default config
`)
    writeFileSync(join(dir, 'data/characters/kai.md'), `---
id: kai
displayName: Kai
animation:
  type: sprites
  sprites:
    neutral: characters/kai/neutral.png
---
`)

    try {
      const result = await validateGame(gameId)
      const issue = result.issues.find(item => item.code === 'character_editorial_fields_missing')
      expect(issue?.severity).toBe('info')
      expect(issue?.message).toContain('role')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('validates Studio character-sheet asset paths', async () => {
    const gameId = `doctor-character-sheet-assets-${Date.now()}`
    const dir = gameDir(gameId)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(join(dir, 'story/en'), { recursive: true })
    mkdirSync(join(dir, 'data/characters'), { recursive: true })
    mkdirSync(join(dir, 'assets/characters/kai'), { recursive: true })
    writeFileSync(join(dir, 'story/en/main.ink'), 'Hello.\n')
    writeFileSync(join(dir, 'assets/characters/kai/neutral.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')
    writeFileSync(join(dir, 'game.config.ts'), `import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: '${gameId}',
  version: '1.0.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { characters: './data/characters/' },
}

export default config
`)
    writeFileSync(join(dir, 'data/characters/kai.md'), `---
id: kai
displayName: Kai
role: ''
age: ''
gender: ''
tags: []
physicalDescription: ''
expressionsText: []
outfit: ''
palette: ''
personality: ''
traits: []
motivations: ''
fears: ''
internalConflict: ''
backstory: ''
keyEvents: []
arcInitial: ''
arcBreak: ''
arcFinal: ''
characterSheet:
  main: characters/kai/character-sheet/main.png
  concepts:
    - characters/kai/character-sheet/concepts/concept-001.png
  generated: []
animation:
  type: sprites
  sprites:
    neutral: characters/kai/neutral.svg
---
`)

    try {
      const result = await validateGame(gameId)
      const messages = result.issues.map(item => item.message)
      expect(messages).toContain('Character sheet main image not found: characters/kai/character-sheet/main.png')
      expect(messages).toContain('Character sheet concept image 1 not found: characters/kai/character-sheet/concepts/concept-001.png')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('validates scene-linked audio asset paths', async () => {
    const gameId = `doctor-scene-audio-${Date.now()}`
    const dir = gameDir(gameId)
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(join(dir, 'story/en'), { recursive: true })
    mkdirSync(join(dir, 'data/scenes'), { recursive: true })
    mkdirSync(join(dir, 'assets/scenes/cafe'), { recursive: true })
    mkdirSync(join(dir, 'assets/audio/ambience'), { recursive: true })
    writeFileSync(join(dir, 'story/en/main.ink'), '# scene: cafe\nHello.\n')
    writeFileSync(join(dir, 'assets/scenes/cafe/bg.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')
    writeFileSync(join(dir, 'assets/audio/ambience/rain.ogg'), '')
    writeFileSync(join(dir, 'game.config.ts'), `import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: '${gameId}',
  version: '1.0.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { scenes: './data/scenes/' },
}

export default config
`)
    writeFileSync(join(dir, 'data/scenes/cafe.md'), `---
id: cafe
displayName: Cafe
background:
  type: static
  image: scenes/cafe/bg.svg
audio:
  ambience:
    file: audio/ambience/rain.ogg
  music:
    file: audio/bgm/missing.ogg
---
`)

    try {
      const result = await validateGame(gameId)
      const messages = result.issues.map(item => item.message)
      expect(messages).toContain('Scene music audio not found: audio/bgm/missing.ogg')
      expect(messages).not.toContain('Scene ambience audio not found: audio/ambience/rain.ogg')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
