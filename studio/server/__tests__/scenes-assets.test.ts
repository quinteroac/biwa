import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { listAssets } from '../assets.ts'
import { listScenes, readScene, writeScene } from '../scenes.ts'

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []

function makeSceneFixture(gameId: string): void {
  createdGames.push(gameId)
  const gameDir = join(ROOT, 'games', gameId)
  mkdirSync(join(gameDir, 'story', 'en'), { recursive: true })
  mkdirSync(join(gameDir, 'data', 'scenes'), { recursive: true })
  mkdirSync(join(gameDir, 'assets', 'scenes', 'studio'), { recursive: true })
  writeFileSync(join(gameDir, 'story', 'en', 'main.ink'), '-> DONE\n')
  writeFileSync(join(gameDir, 'assets', 'scenes', 'studio', 'bg.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')
  writeFileSync(join(gameDir, 'game.config.ts'), `
import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: 'Studio Scene Fixture',
  version: '0.1.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { scenes: './data/scenes/' },
}

export default config
`)
  writeFileSync(join(gameDir, 'data', 'scenes', 'studio.md'), `---
id: studio
displayName: Studio
description: Test scene.
background:
  type: static
  image: scenes/studio/bg.svg
thumbnail: scenes/studio/bg.svg
---

Original body.
`)
}

afterEach(() => {
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('studio scene and asset API helpers', () => {
  it('lists assets by framework asset category', async () => {
    const assets = await listAssets('smoke-fixture')

    expect(assets.some(asset => asset.kind === 'scenes' && asset.previewUrl)).toBe(true)
    expect(assets.some(asset => asset.kind === 'characters')).toBe(true)
  })

  it('reads scene frontmatter and resolves preview URLs', async () => {
    const scenes = await listScenes('smoke-fixture')
    const scene = scenes.find(item => item.id === 'default')

    expect(scene?.displayName).toBe('Default')
    expect(scene?.previewUrl).toContain('/api/projects/smoke-fixture/assets/file')
  })

  it('writes scene metadata back to Markdown frontmatter', async () => {
    const gameId = `studio-scene-${Date.now()}`
    makeSceneFixture(gameId)

    const current = await readScene(gameId, 'studio.md')
    const saved = await writeScene(gameId, 'studio.md', {
      ...current.scene,
      displayName: 'Studio Updated',
      location: 'Test location',
      timeOfDay: 'night',
      weather: 'rain',
      mood: 'quiet',
      prompt: 'A quiet test room.',
      background: current.scene.background ?? { type: 'static', image: 'scenes/studio/bg.svg' },
    })

    expect(saved.scene.displayName).toBe('Studio Updated')
    expect(saved.scene.location).toBe('Test location')
    expect(saved.scene.previewUrl).toContain('scenes%2Fstudio%2Fbg.svg')
  })
})
