import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { deleteCharacterSheetConcept, editCharacterSheetConcept, generateCharacterAtlas, generateCharacterSheetConcept, listCharacters, readCharacter, uploadCharacterSheetConcept, writeCharacter } from '../characters.ts'
import { studioApi } from '../index.ts'
import { writeStudioSettings } from '../settings.ts'

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '')
const createdGames: string[] = []
const originalFetch = globalThis.fetch

function makeCharacterFixture(gameId: string): void {
  createdGames.push(gameId)
  const gameDir = join(ROOT, 'games', gameId)
  mkdirSync(join(gameDir, 'story', 'en'), { recursive: true })
  mkdirSync(join(gameDir, 'data', 'characters'), { recursive: true })
  mkdirSync(join(gameDir, 'assets', 'characters', 'hero'), { recursive: true })
  mkdirSync(join(gameDir, 'assets', 'characters', 'hero', 'character-sheet', 'concepts'), { recursive: true })
  writeFileSync(join(gameDir, 'story', 'en', 'main.ink'), '-> DONE\n')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'hero.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'character-sheet', 'main.png'), '')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'character-sheet', 'concepts', 'concept-001.png'), '')
  writeFileSync(join(gameDir, 'game.config.ts'), `
import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id: '${gameId}',
  title: 'Studio Character Fixture',
  version: '0.1.0',
  story: { defaultLocale: 'en', locales: { en: './story/en/main.ink' } },
  data: { characters: './data/characters/' },
}

export default config
`)
  writeFileSync(join(gameDir, 'data', 'characters', 'hero.md'), `---
id: hero
displayName: Hero
defaultPosition: center
defaultExpression: neutral
scale: 1
offset:
  y: 0
animation:
  type: sprites
  sprites:
    neutral: characters/hero/hero.svg
characterSheet:
  main: characters/hero/character-sheet/main.png
  concepts:
    - characters/hero/character-sheet/concepts/concept-001.png
  generated: []
---

Original body.
`)
}

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('studio character API helpers', () => {
  it('lists character metadata and resolves preview URLs', async () => {
    const characters = await listCharacters('smoke-fixture')
    const tester = characters.find(character => character.id === 'tester')

    expect(tester?.displayName).toBe('Tester')
    expect(tester?.previewUrl).toContain('/api/projects/smoke-fixture/assets/file')
  })

  it('maps character-sheet art from markdown into Studio asset URLs', async () => {
    const gameId = `studio-character-sheet-${Date.now()}`
    makeCharacterFixture(gameId)

    const current = await readCharacter(gameId, 'hero.md')

    expect(current.character.characterSheet).toEqual({
      main: 'characters/hero/character-sheet/main.png',
      concepts: ['characters/hero/character-sheet/concepts/concept-001.png'],
      generated: [],
    })
    expect(current.character.characterSheetUrls.main).toContain('/api/projects/')
    expect(current.character.characterSheetUrls.main).toContain(encodeURIComponent('characters/hero/character-sheet/main.png'))
    expect(current.character.characterSheetUrls.concepts[0]).toContain(encodeURIComponent('characters/hero/character-sheet/concepts/concept-001.png'))
  })

  it('writes character sheets without losing runtime animation metadata', async () => {
    const gameId = `studio-character-${Date.now()}`
    makeCharacterFixture(gameId)

    const current = await readCharacter(gameId, 'hero.md')
    const saved = await writeCharacter(gameId, 'hero.md', {
      ...current.character,
      role: 'lead',
      physicalDescription: 'Short dark hair and a red coat.',
      personality: 'Focused and kind.',
      palette: '#111111, #c02626',
      outfit: 'Red coat.',
      prompt: 'VN protagonist, expressive half body sprite.',
      characterSheet: {
        main: 'characters/hero/character-sheet/main.png',
        concepts: ['characters/hero/character-sheet/concepts/concept-001.png'],
        generated: ['characters/hero/character-sheet/generated/sheet-001.png'],
      },
      scale: 0.8,
      offset: { y: 64 },
      expressions: ['neutral', 'happy'],
    })

    expect(saved.character.role).toBe('lead')
    expect(saved.character.offset.y).toBe(64)
    expect(saved.character.animation['sprites']).toBeTruthy()
    expect(saved.character.expressions).toEqual(['neutral', 'happy'])
    expect(saved.character.characterSheet.generated).toEqual(['characters/hero/character-sheet/generated/sheet-001.png'])
  })

  it('uploads character-sheet concept art and records it in markdown', async () => {
    const gameId = `studio-character-concept-upload-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')

    const result = await uploadCharacterSheetConcept(
      gameId,
      'hero.md',
      current.character,
      new File(['concept'], 'First Concept.PNG', { type: 'image/png' }),
    )

    expect(result.path).toBe('characters/hero/character-sheet/concepts/concept-002.png')
    expect(result.url).toContain(encodeURIComponent(result.path))
    expect(result.character.characterSheet.main).toBe('characters/hero/character-sheet/main.png')
    expect(result.character.characterSheet.concepts).toContain(result.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', result.path))).toBe(true)
    expect(readFileSync(join(ROOT, 'games', gameId, 'data', 'characters', 'hero.md'), 'utf8')).toContain(result.path)
  })

  it('uploads character-sheet art into generated slots by art type', async () => {
    const gameId = `studio-character-typed-upload-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')

    const result = await uploadCharacterSheetConcept(
      gameId,
      'hero.md',
      current.character,
      new File(['poses'], 'Action Sheet.PNG', { type: 'image/png' }),
      'actionPoses',
    )

    expect(result.path).toBe('characters/hero/character-sheet/generated/action-poses-001.png')
    expect(result.character.characterSheet.concepts).toEqual(['characters/hero/character-sheet/concepts/concept-001.png'])
    expect(result.character.characterSheet.generated).toContain(result.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', result.path))).toBe(true)
  })

  it('deletes character-sheet concept art and updates markdown', async () => {
    const gameId = `studio-character-concept-delete-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')
    const uploaded = await uploadCharacterSheetConcept(
      gameId,
      'hero.md',
      current.character,
      new File(['concept'], 'Delete Me.PNG', { type: 'image/png' }),
    )

    const deleted = await deleteCharacterSheetConcept(gameId, 'hero.md', uploaded.character, uploaded.path)

    expect(deleted.deletedPath).toBe(uploaded.path)
    expect(deleted.character.characterSheet.concepts).not.toContain(uploaded.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', uploaded.path))).toBe(false)
    expect(readFileSync(join(ROOT, 'games', gameId, 'data', 'characters', 'hero.md'), 'utf8')).not.toContain(uploaded.path)
  })

  it('accepts character-sheet concept uploads through the HTTP API', async () => {
    const gameId = `studio-character-concept-http-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')
    const body = new FormData()
    body.set('path', 'hero.md')
    body.set('character', JSON.stringify(current.character))
    body.set('image', new File(['concept'], 'Api Concept.webp', { type: 'image/webp' }))

    const response = await studioApi.handle(new Request(`http://localhost/api/projects/${gameId}/characters/character-sheet/concepts`, {
      method: 'POST',
      body,
    }))
    const payload = await response.json() as { path?: string; character?: { characterSheet?: { concepts?: string[] } }; error?: string }

    expect(response.status).toBe(200)
    expect(payload.error).toBeUndefined()
    expect(payload.path).toBe('characters/hero/character-sheet/concepts/concept-002.webp')
    expect(payload.character?.characterSheet?.concepts).toContain(payload.path)
  })

  it('generates character-sheet concept art through OpenAI Images settings', async () => {
    const gameId = `studio-character-concept-generate-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')
    await writeStudioSettings(gameId, {
      openaiImages: {
        apiKey: 'test-key',
        apiKeyConfigured: false,
        baseUrl: 'https://api.example.test/v1',
        imageGenerationPath: '/images/generations',
        model: 'gpt-image-1.5',
        quality: 'high',
        outputFormat: 'png',
        moderation: 'low',
        characterSheetResolution: '1024x1536',
        imageGenerationTimeoutSeconds: 180,
      },
    })
    const calls: Array<{ url: string; body: Record<string, unknown>; authorization: string | null }> = []
    const fakeFetch = async (input: URL | RequestInfo, init?: RequestInit | BunFetchRequestInit): Promise<Response> => {
      const body = init?.body instanceof FormData
        ? Object.fromEntries([...init.body.entries()].map(([key, value]) => [
          key,
          typeof value === 'object'
            && value !== null
            && 'name' in value
            && typeof (value as { name?: unknown }).name === 'string'
            ? (value as { name: string }).name
            : value,
        ]))
        : JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.push({
        url: String(input),
        body,
        authorization: new Headers(init?.headers).get('authorization'),
      })
      return Response.json({
        data: [{
          b64_json: Buffer.from('generated-image').toString('base64'),
          revised_prompt: 'Revised concept prompt.',
        }],
      })
    }
    globalThis.fetch = Object.assign(fakeFetch, { preconnect: originalFetch.preconnect })

    const result = await generateCharacterSheetConcept(gameId, 'hero.md', current.character, '', ['silhouetteSketch', 'conceptArt'])

    expect(calls[0]?.url).toBe('https://api.example.test/v1/images/edits')
    expect(calls[0]?.authorization).toBe('Bearer test-key')
    expect(calls[0]?.body['model']).toBe('gpt-image-1.5')
    expect(calls[0]?.body['moderation']).toBe('low')
    expect(calls[0]?.body['size']).toBe('1024x1536')
    expect(String(calls[0]?.body['prompt'])).toContain('Concept Art')
    expect(calls[0]?.body['image']).toBe('main.png')
    expect(String(calls[1]?.body['prompt'])).toContain('Silhouette Sketch')
    expect(result.path).toBe('characters/hero/character-sheet/generated/concept-art-001.png')
    expect(result.generated).toHaveLength(2)
    expect(result.generated[1]?.path).toBe('characters/hero/character-sheet/generated/silhouette-sketch-001.png')
    expect(result.revisedPrompt).toBe('Revised concept prompt.')
    expect(result.character.characterSheet.generated).toContain(result.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', result.path))).toBe(true)
  })

  it('edits a character-sheet image with only the user edit instruction as prompt', async () => {
    const gameId = `studio-character-concept-edit-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')
    await writeStudioSettings(gameId, {
      openaiImages: {
        apiKey: 'test-key',
        apiKeyConfigured: false,
        baseUrl: 'https://api.example.test/v1',
        imageGenerationPath: '/images/generations',
        model: 'gpt-image-1.5',
        quality: 'high',
        outputFormat: 'png',
        moderation: 'low',
        characterSheetResolution: '1024x1536',
        imageGenerationTimeoutSeconds: 180,
      },
    })
    const calls: Array<{ url: string; body: Record<string, unknown>; authorization: string | null }> = []
    const fakeFetch = async (input: URL | RequestInfo, init?: RequestInit | BunFetchRequestInit): Promise<Response> => {
      const body = init?.body instanceof FormData
        ? Object.fromEntries([...init.body.entries()].map(([key, value]) => [
          key,
          typeof value === 'object'
            && value !== null
            && 'name' in value
            && typeof (value as { name?: unknown }).name === 'string'
            ? (value as { name: string }).name
            : value,
        ]))
        : JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.push({
        url: String(input),
        body,
        authorization: new Headers(init?.headers).get('authorization'),
      })
      return Response.json({
        data: [{
          b64_json: Buffer.from('edited-image').toString('base64'),
          revised_prompt: 'Revised edit prompt.',
        }],
      })
    }
    globalThis.fetch = Object.assign(fakeFetch, { preconnect: originalFetch.preconnect })

    const result = await editCharacterSheetConcept(
      gameId,
      'hero.md',
      current.character,
      'characters/hero/character-sheet/main.png',
      'cambia el color del cabello a rojo',
    )

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe('https://api.example.test/v1/images/edits')
    expect(calls[0]?.authorization).toBe('Bearer test-key')
    expect(calls[0]?.body['prompt']).toBe('cambia el color del cabello a rojo')
    expect(calls[0]?.body['image']).toBe('main.png')
    expect(result.path).toBe('characters/hero/character-sheet/generated/edit-001.png')
    expect(result.sourcePath).toBe('characters/hero/character-sheet/main.png')
    expect(result.revisedPrompt).toBe('Revised edit prompt.')
    expect(result.character.characterSheet.generated).toContain(result.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', result.path))).toBe(true)
  })

  it('creates a new character Markdown file from Studio payloads', async () => {
    const gameId = `studio-character-new-${Date.now()}`
    makeCharacterFixture(gameId)

    const saved = await writeCharacter(gameId, 'rival.md', {
      id: 'rival',
      displayName: 'Rival',
      role: 'supporting antagonist',
      physicalDescription: 'Sharp silhouette.',
      personality: 'Confident.',
      palette: '#111827, #f87171',
      outfit: 'Dark jacket.',
      prompt: 'VN rival sprite.',
      nameColor: '#f87171',
      isNarrator: false,
      defaultPosition: 'right',
      defaultExpression: 'neutral',
      scale: 0.9,
      offset: { x: 0, y: 42 },
      animation: {
        type: 'spritesheet',
        file: 'characters/rival/rival_spritesheet.png',
        atlas: 'characters/rival/rival_atlas.json',
      },
      expressions: ['neutral', 'smirk'],
    })

    expect(saved.character.path).toBe('rival.md')
    expect(saved.character.displayName).toBe('Rival')
    expect(saved.character.expressions).toEqual(['neutral', 'smirk'])
  })

  it('generates GameAssetsMaker atlas JSON and updates character animation mapping', async () => {
    const gameId = `studio-character-atlas-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')

    const result = await generateCharacterAtlas(gameId, 'hero.md', {
      ...current.character,
      animation: {
        type: 'spritesheet',
        file: 'characters/hero/hero_spritesheet.png',
      },
      expressions: ['neutral', 'happy', 'sad'],
    })

    expect(result.atlas.frameCount).toBe(3)
    expect(result.character.atlasPath).toBe('characters/hero/hero_atlas.json')
    expect(result.character.animation['expressions']).toEqual({
      neutral: 'neutral',
      happy: 'happy',
      sad: 'sad',
    })
  })
})
