import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createStoryFolder, deleteStoryFolder, listStoryEntries, listStoryFiles, readStoryFile, renameStoryFolder } from '../story.ts'

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []

function makeStoryFixture(gameId: string): void {
  createdGames.push(gameId)
  const gameDir = join(ROOT, 'games', gameId)
  mkdirSync(join(gameDir, 'story', 'en', 'drafts'), { recursive: true })
  writeFileSync(join(gameDir, 'story', 'en', 'main.ink'), '=== start ===\nSmoke fixture ready.\n-> DONE\n')
  writeFileSync(join(gameDir, 'story', 'en', 'drafts', 'scene.ink'), '-> DONE\n')
  writeFileSync(join(gameDir, 'game.config.ts'), `
import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: 'Story Fixture',
  version: '0.1.0',
  description: 'Story fixture.',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: {},
}

export default config
`)
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('studio story API helpers', () => {
  it('lists Ink files under a project story directory', async () => {
    const files = await listStoryFiles('smoke-fixture')

    expect(files).toEqual([{ path: 'en/main.ink', locale: 'en' }])
  })

  it('reads Ink content with text preview and tag suggestions', async () => {
    const story = await readStoryFile('smoke-fixture', 'en/main.ink')

    expect(story.file.path).toBe('en/main.ink')
    expect(story.content).toContain('Smoke fixture ready.')
    expect(story.preview[0]).toMatchObject({ kind: 'knot', text: 'start' })
    expect(story.preview.some(line => line.kind === 'dialogue')).toBe(true)
    expect(story.tagSuggestions).toContain('scene')
  })

  it('rejects story paths outside the project story directory', async () => {
    await expect(readStoryFile('smoke-fixture', '../game.config.ts')).rejects.toThrow('Story path must point to an .ink file.')
  })

  it('creates, renames, and deletes story folders recursively', async () => {
    const gameId = `studio-story-${Date.now()}`
    makeStoryFixture(gameId)

    await createStoryFolder(gameId, 'en/branches')
    let entries = await listStoryEntries(gameId)
    expect(entries.folders.some(folder => folder.path === 'en/branches')).toBe(true)

    entries = await renameStoryFolder(gameId, 'en/drafts', 'en/archive')
    expect(entries.folders.some(folder => folder.path === 'en/archive')).toBe(true)
    expect(entries.files.some(file => file.path === 'en/archive/scene.ink')).toBe(true)
    expect(existsSync(join(ROOT, 'games', gameId, 'story', 'en', 'drafts', 'scene.ink'))).toBe(false)

    entries = await deleteStoryFolder(gameId, 'en/archive')
    expect(entries.folders.some(folder => folder.path === 'en/archive')).toBe(false)
    expect(entries.files.some(file => file.path === 'en/archive/scene.ink')).toBe(false)
    expect(existsSync(join(ROOT, 'games', gameId, 'story', 'en', 'archive'))).toBe(false)
  })
})
