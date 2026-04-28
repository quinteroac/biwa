import { describe, expect, it } from 'bun:test'
import { listStoryFiles, readStoryFile } from '../story.ts'

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
})
