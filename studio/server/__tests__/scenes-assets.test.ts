import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { listAssets } from '../assets.ts'
import { createSceneBackgroundFolder, createSceneFile, createSceneFolder, deleteSceneBackground, deleteSceneFile, listScenes, readScene, uploadSceneBackground, uploadSceneFile, writeScene } from '../scenes.ts'
import type { StudioSceneDraft, StudioSceneItem } from '../../shared/types.ts'

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

function draftFromScene(scene: StudioSceneItem): StudioSceneDraft {
  return {
    id: scene.id,
    displayName: scene.displayName,
    description: scene.description,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    mood: scene.mood,
    prompt: scene.prompt,
    thumbnail: scene.thumbnail,
    background: scene.background ?? { type: 'static', image: '' },
    audio: scene.audio ?? {},
    body: scene.body,
  }
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
      audio: {
        ambience: {
          id: 'studio-room-tone',
          file: 'audio/ambience/studio-room-tone.ogg',
          volume: 0.45,
        },
      },
    })

    expect(saved.scene.displayName).toBe('Studio Updated')
    expect(saved.scene.location).toBe('Test location')
    expect(saved.scene.audio?.['ambience']).toEqual({
      id: 'studio-room-tone',
      file: 'audio/ambience/studio-room-tone.ogg',
      volume: 0.45,
    })
    expect(saved.scene.previewUrl).toContain('scenes%2Fstudio%2Fbg.svg')
  })

  it('manages scene background folders, uploads and deletes', async () => {
    const gameId = `studio-scene-assets-${Date.now()}`
    makeSceneFixture(gameId)

    const current = await readScene(gameId, 'studio.md')
    const draft = draftFromScene(current.scene)
    const folder = await createSceneBackgroundFolder(gameId, 'studio.md', draft, 'Night')

    expect(folder.folder).toBe('Night')
    expect(folder.scene.backgroundFolders).toContain('Night')

    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ])
    const uploaded = await uploadSceneBackground(gameId, 'studio.md', draft, new File([pngBytes], 'night.png', { type: 'image/png' }), 'Night')

    expect(uploaded.path).toBe('scenes/studio/Night/night.png')
    expect(uploaded.scene.backgrounds.some(asset => asset.path === uploaded.path && asset.isActive)).toBe(true)
    expect(uploaded.scene.previewUrl).toContain('scenes%2Fstudio%2FNight%2Fnight.png')

    const deleted = await deleteSceneBackground(gameId, 'studio.md', draftFromScene(uploaded.scene), uploaded.path)

    expect(deleted.deletedPath).toBe(uploaded.path)
    expect(deleted.scene.backgrounds.some(asset => asset.path === uploaded.path)).toBe(false)
    expect(deleted.scene.previewUrl).toBeNull()
  })

  it('manages scene folders, file uploads and deletes from the scene list', async () => {
    const gameId = `studio-scenes-tree-${Date.now()}`
    makeSceneFixture(gameId)

    const folder = await createSceneFolder(gameId, 'chapter-one')
    expect(folder.folders.some(item => item.path === 'chapter-one')).toBe(true)

    const created = await createSceneFile(gameId, 'chapter-one', 'Rainy Platform')
    expect(created.scene.path).toBe('chapter-one/rainy-platform.md')
    expect(created.scenes.some(scene => scene.path === created.scene.path)).toBe(true)

    const uploaded = await uploadSceneFile(gameId, 'chapter-one', new File([`---
id: uploaded_scene
displayName: Uploaded Scene
background:
  type: static
  image: ''
thumbnail: ''
---

Uploaded body.
`], 'uploaded-scene.md', { type: 'text/markdown' }))

    expect(uploaded.scene.path).toBe('chapter-one/uploaded-scene.md')
    expect(uploaded.scene.displayName).toBe('Uploaded Scene')

    const deleted = await deleteSceneFile(gameId, uploaded.scene.path)
    expect(deleted.scenes.some(scene => scene.path === uploaded.scene.path)).toBe(false)
  })
})
