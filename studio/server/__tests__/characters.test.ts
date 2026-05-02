import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createCharacterSpritesheetFolder, deleteCharacterFile, deleteCharacterSheetConcept, deleteCharacterSpritesheet, editCharacterSheetConcept, generateCharacterAtlas, generateCharacterSheetConcept, generateCharacterSpritesheet, listCharacters, readCharacter, uploadCharacterSheetConcept, uploadCharacterSpritesheet, writeCharacter } from '../characters.ts'
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
  mkdirSync(join(gameDir, 'assets', 'characters', 'hero', 'spritesheets', 'Main'), { recursive: true })
  writeFileSync(join(gameDir, 'story', 'en', 'main.ink'), '-> DONE\n')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'hero.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'character-sheet', 'main.png'), '')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'character-sheet', 'concepts', 'concept-001.png'), '')
  writeFileSync(join(gameDir, 'assets', 'characters', 'hero', 'spritesheets', 'Main', 'initial.png'), '')
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
  type: spritesheet-library
  defaultStateSheet: Main
  defaultAnimationSheet: Main
  defaultState: neutral
  defaultAction: ''
  states:
    Main:
      file: characters/hero/spritesheets/Main/initial.png
      atlas: ''
      sprites:
        neutral: neutral
  animationSheets: {}
characterSheet:
  main: characters/hero/character-sheet/main.png
  concepts:
    - characters/hero/character-sheet/concepts/concept-001.png
  generated: []
---

Original body.
`)
}

function spritesheet(character: { animation: Record<string, unknown> }, folder = 'Main', kind: 'states' | 'animationSheets' = 'states'): Record<string, unknown> {
  const sheets = character.animation[kind]
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return {}
  const sheet = (sheets as Record<string, unknown>)[folder]
  return sheet && typeof sheet === 'object' && !Array.isArray(sheet) ? sheet as Record<string, unknown> : {}
}

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const gameId of createdGames.splice(0)) {
    rmSync(join(ROOT, 'games', gameId), { recursive: true, force: true })
  }
})

describe('studio character API helpers', () => {
  it('lists character metadata and resolves preview URLs', async () => {
    const gameId = `studio-character-list-${Date.now()}`
    makeCharacterFixture(gameId)
    const characters = await listCharacters(gameId)
    const tester = characters.find(character => character.id === 'hero')

    expect(tester?.displayName).toBe('Hero')
    expect(tester?.previewUrl).toContain(`/api/projects/${gameId}/assets/file`)
  })

  it('deletes a character Markdown file without deleting character assets', async () => {
    const gameId = `studio-character-delete-${Date.now()}`
    makeCharacterFixture(gameId)

    const deleted = await deleteCharacterFile(gameId, 'hero.md')

    expect(deleted.deletedPath).toBe('hero.md')
    expect(deleted.characters.some(character => character.path === 'hero.md')).toBe(false)
    expect(existsSync(join(ROOT, 'games', gameId, 'data', 'characters', 'hero.md'))).toBe(false)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', 'characters', 'hero', 'hero.svg'))).toBe(true)
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
    expect(saved.character.animation['type']).toBe('spritesheet-library')
    expect(spritesheet(saved.character)['sprites']).toEqual({ neutral: 'neutral', happy: 'happy' })
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

  it('deletes the active spritesheet file and clears animation references', async () => {
    const gameId = `studio-character-spritesheet-delete-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')
    const generated = await generateCharacterAtlas(gameId, 'hero.md', current.character)
    const spritesheetPath = String(spritesheet(generated.character)['file'])
    writeFileSync(join(ROOT, 'games', gameId, 'assets', spritesheetPath), 'png')

    const deleted = await deleteCharacterSpritesheet(gameId, 'hero.md', generated.character, spritesheetPath)

    expect(deleted.deletedPath).toBe(spritesheetPath)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', spritesheetPath))).toBe(false)
    expect(spritesheet(deleted.character)['file']).toBeUndefined()
    expect(readFileSync(join(ROOT, 'games', gameId, 'data', 'characters', 'hero.md'), 'utf8')).not.toContain(spritesheetPath)
  })

  it('deletes a spritesheet from a selected library folder', async () => {
    const gameId = `studio-character-shared-spritesheet-delete-${Date.now()}`
    makeCharacterFixture(gameId)
    mkdirSync(join(ROOT, 'games', gameId, 'assets', 'characters', 'hero', 'spritesheets', 'Chapter_01'), { recursive: true })
    const spritesheetPath = 'characters/hero/spritesheets/Chapter_01/spritesheet.png'
    writeFileSync(join(ROOT, 'games', gameId, 'assets', spritesheetPath), 'png')
    const current = await readCharacter(gameId, 'hero.md')
    const saved = await writeCharacter(gameId, 'hero.md', {
      ...current.character,
      animation: {
        type: 'spritesheet-library',
        defaultStateSheet: 'Chapter_01',
        defaultAnimationSheet: 'Main',
        defaultState: 'neutral',
        defaultAction: '',
        states: {
          Chapter_01: {
            file: spritesheetPath,
            atlas: '',
            sprites: { neutral: 'neutral' },
          },
        },
        animationSheets: {},
      },
    })

    const deleted = await deleteCharacterSpritesheet(gameId, 'hero.md', saved.character, spritesheetPath)

    expect(deleted.deletedPath).toBe(spritesheetPath)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', spritesheetPath))).toBe(false)
    expect(spritesheet(deleted.character, 'Chapter_01')['file']).toBeUndefined()
  })

  it('uploads a spritesheet file and updates character animation', async () => {
    const gameId = `studio-character-spritesheet-upload-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')

    const uploaded = await uploadCharacterSpritesheet(
      gameId,
      'hero.md',
      current.character,
      new File(['spritesheet'], 'Hero Sheet.PNG', { type: 'image/png' }),
    )

    expect(uploaded.path).toBe('characters/hero/spritesheets/Main/hero_spritesheet.png')
    expect(uploaded.url).toContain(encodeURIComponent(uploaded.path))
    expect(uploaded.character.animation['type']).toBe('spritesheet-library')
    expect(spritesheet(uploaded.character)['file']).toBe(uploaded.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', uploaded.path))).toBe(true)
    expect(readFileSync(join(ROOT, 'games', gameId, 'data', 'characters', 'hero.md'), 'utf8')).toContain(uploaded.path)
  })

  it('creates spritesheet folders and uploads spritesheets into the selected folder', async () => {
    const gameId = `studio-character-spritesheet-folder-${Date.now()}`
    makeCharacterFixture(gameId)
    const current = await readCharacter(gameId, 'hero.md')

    const folder = await createCharacterSpritesheetFolder(gameId, 'hero.md', current.character, 'Chapter_01')
    const uploaded = await uploadCharacterSpritesheet(
      gameId,
      'hero.md',
      folder.character,
      new File(['spritesheet'], 'Hero Sheet.PNG', { type: 'image/png' }),
      'Chapter_01',
    )

    expect(folder.character.spritesheetFolders).toContain('Chapter_01')
    expect(uploaded.path).toBe('characters/hero/spritesheets/Chapter_01/hero_spritesheet.png')
    expect(uploaded.character.spritesheetFolders).toContain('Chapter_01')
    expect(uploaded.character.animation['defaultStateSheet']).toBe('Chapter_01')
    expect(spritesheet(uploaded.character, 'Chapter_01')['file']).toBe(uploaded.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', uploaded.path))).toBe(true)
  })

  it('generates a spritesheet with OpenAI Images and saves atlas beside it', async () => {
    const gameId = `studio-character-spritesheet-ai-${Date.now()}`
    makeCharacterFixture(gameId)
    await writeStudioSettings(gameId, {
      openaiImages: {
        apiKey: 'test-key',
        apiKeyConfigured: false,
        baseUrl: 'https://api.example.test/v1',
        imageGenerationPath: '/images/generations',
        model: 'gpt-image-1.5',
        quality: 'low',
        outputFormat: 'png',
        moderation: 'low',
        characterSheetResolution: '1024x1024',
        spritesheetBackgroundRemovalEnabled: false,
        spritesheetBackgroundRemovalCommand: 'uv run --script studio/tools/remove_chroma_key.py --input {input} --out {output} --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force',
        spritesheetBackgroundRemovalTimeoutSeconds: 300,
        imageGenerationTimeoutSeconds: 20,
      },
    })
    const calls: Array<{ url: string; body: Record<string, unknown> }> = []
    globalThis.fetch = (async (request, init) => {
      const url = String(request)
      if (url.includes('/images/edits')) {
        calls.push({
          url,
          body: init?.body instanceof FormData ? Object.fromEntries(init.body.entries()) : {},
        })
        return Response.json({ data: [{ b64_json: Buffer.from('spritesheet-ai').toString('base64'), revised_prompt: 'revised' }] })
      }
      return originalFetch(request)
    }) as typeof fetch
    const current = await readCharacter(gameId, 'hero.md')
    const folder = await createCharacterSpritesheetFolder(gameId, 'hero.md', current.character, 'Chapter_01')

    const generated = await generateCharacterSpritesheet(gameId, 'hero.md', folder.character, {
      size: '2048x1024',
      spritesheetType: 'Half Body',
      spriteCount: 4,
      layoutDirection: 'Horizontal',
      columns: 0,
      spriteNames: ['neutral', 'happy', 'sad', 'angry'],
      frameDuration: 100,
      folder: 'Chapter_01',
      prompt: 'Generate production sprites.',
    })

    expect(generated.path).toBe('characters/hero/spritesheets/Chapter_01/hero_spritesheet.png')
    expect(generated.atlasPath).toBe('characters/hero/spritesheets/Chapter_01/hero_spritesheet_map.json')
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', generated.path))).toBe(true)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', generated.atlasPath))).toBe(true)
    expect(generated.character.animation['defaultStateSheet']).toBe('Chapter_01')
    expect(spritesheet(generated.character, 'Chapter_01')['file']).toBe(generated.path)
    expect(spritesheet(generated.character, 'Chapter_01')['atlas']).toBe(generated.atlasPath)
    expect(spritesheet(generated.character, 'Chapter_01')['sprites']).toEqual({ neutral: 'neutral', happy: 'happy', sad: 'sad', angry: 'angry' })
    expect(generated.character.atlas?.atlasKind).toBe('Visual Novel')
    expect(generated.character.atlas?.spritesheetType).toBe('Half Body')
    expect(calls[0]?.body['size']).toBe('2048x1024')
    expect(calls[0]?.body['background']).toBeUndefined()
    expect(calls[0]?.body['output_format']).toBe('png')
    expect(String(calls[0]?.body['prompt'])).toContain('No text of any kind')
    expect(String(calls[0]?.body['prompt'])).toContain('solid #00ff00 chroma-key background')
  })

  it('post-processes generated spritesheets with the configured background removal command', async () => {
    const gameId = `studio-character-spritesheet-background-removal-${Date.now()}`
    makeCharacterFixture(gameId)
    await writeStudioSettings(gameId, {
      openaiImages: {
        apiKey: 'test-key',
        apiKeyConfigured: false,
        baseUrl: 'https://api.example.test/v1',
        imageGenerationPath: '/images/generations',
        model: 'gpt-image-1.5',
        quality: 'low',
        outputFormat: 'webp',
        moderation: 'low',
        characterSheetResolution: '1024x1024',
        spritesheetBackgroundRemovalEnabled: true,
        spritesheetBackgroundRemovalCommand: 'printf postprocessed > {output}',
        spritesheetBackgroundRemovalTimeoutSeconds: 30,
        imageGenerationTimeoutSeconds: 20,
      },
    })
    globalThis.fetch = (async (request, init) => {
      const url = String(request)
      if (url.includes('/images/edits')) {
        expect(init?.body instanceof FormData ? init.body.get('background') : null).toBeNull()
        expect(init?.body instanceof FormData ? init.body.get('output_format') : null).toBe('png')
        return Response.json({ data: [{ b64_json: Buffer.from('raw-spritesheet').toString('base64') }] })
      }
      return originalFetch(request)
    }) as typeof fetch
    const current = await readCharacter(gameId, 'hero.md')

    const generated = await generateCharacterSpritesheet(gameId, 'hero.md', current.character, {
      size: '1024x1024',
      spritesheetType: 'Half Body',
      spriteCount: 2,
      layoutDirection: 'Horizontal',
      columns: 0,
      spriteNames: ['neutral', 'happy'],
      frameDuration: 100,
      folder: 'Main',
      prompt: '',
    })

    expect(generated.path).toBe('characters/hero/spritesheets/Main/hero_spritesheet.png')
    expect(readFileSync(join(ROOT, 'games', gameId, 'assets', generated.path), 'utf8')).toBe('postprocessed')
  })

  it('generates animation atlases for character spritesheets when requested', async () => {
    const gameId = `studio-character-animation-spritesheet-${Date.now()}`
    makeCharacterFixture(gameId)
    await writeStudioSettings(gameId, {
      openaiImages: {
        apiKey: 'test-key',
        apiKeyConfigured: false,
        baseUrl: 'https://api.example.test/v1',
        imageGenerationPath: '/images/generations',
        model: 'gpt-image-1.5',
        quality: 'low',
        outputFormat: 'png',
        moderation: 'low',
        characterSheetResolution: '1024x1024',
        spritesheetBackgroundRemovalEnabled: false,
        spritesheetBackgroundRemovalCommand: '',
        spritesheetBackgroundRemovalTimeoutSeconds: 30,
        imageGenerationTimeoutSeconds: 20,
      },
    })
    const calls: Array<{ body: Record<string, unknown> }> = []
    globalThis.fetch = (async (request, init) => {
      const url = String(request)
      if (url.includes('/images/edits')) {
        calls.push({
          body: init?.body instanceof FormData ? Object.fromEntries(init.body.entries()) : {},
        })
        return Response.json({ data: [{ b64_json: Buffer.from('animation-spritesheet').toString('base64') }] })
      }
      return originalFetch(request)
    }) as typeof fetch
    const current = await readCharacter(gameId, 'hero.md')

    const generated = await generateCharacterSpritesheet(gameId, 'hero.md', current.character, {
      atlasKind: 'Animation',
      size: '1024x1024',
      spritesheetType: 'Half Body',
      spriteCount: 4,
      layoutDirection: 'Horizontal',
      columns: 0,
      spriteNames: ['happy', 'angry'],
      animationFramesPerTag: 2,
      animationTags: [
        { name: 'happy', from: 0, to: 1, direction: 'pingpong', color: '#000000ff' },
        { name: 'angry', from: 2, to: 3, direction: 'pingpong', color: '#000000ff' },
      ],
      frameDuration: 120,
      folder: 'Main',
      prompt: '',
    })

    const atlas = JSON.parse(readFileSync(join(ROOT, 'games', gameId, 'assets', generated.atlasPath), 'utf8')) as Record<string, unknown>
    const generatedSpritesheet = generated.character.spritesheets.find(item => item.path === generated.path)
    expect(generatedSpritesheet?.atlas?.atlasKind).toBe('Animation')
    expect(generatedSpritesheet?.atlas?.spritesheetType).toBe('Half Body')
    expect(generatedSpritesheet?.atlas?.frameTags).toEqual([
      { name: 'happy', from: 0, to: 1, direction: 'pingpong' },
      { name: 'angry', from: 2, to: 3, direction: 'pingpong' },
    ])
    expect(spritesheet(generated.character, 'Main', 'animationSheets')['actions']).toEqual({ happy: 'happy', angry: 'angry' })
    expect((atlas['meta'] as Record<string, unknown>)['atlasType']).toBe('Animation')
    expect((atlas['meta'] as Record<string, unknown>)['spritesheetType']).toBe('Half Body')
    expect(String(calls[0]?.body['prompt'])).toContain('This is an animation spritesheet, not an expression/state spritesheet.')
    expect(String(calls[0]?.body['prompt'])).toContain('Animation body type: Half Body.')
    expect(String(calls[0]?.body['prompt'])).toContain('Every cell is a chronological frame in a continuous motion sequence.')
    expect(String(calls[0]?.body['prompt'])).toContain('Frame tag ranges: happy: frames 0-1, pingpong; angry: frames 2-3, pingpong.')
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
        spritesheetBackgroundRemovalEnabled: false,
        spritesheetBackgroundRemovalCommand: 'uv run --script studio/tools/remove_chroma_key.py --input {input} --out {output} --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force',
        spritesheetBackgroundRemovalTimeoutSeconds: 300,
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
    expect(String(calls[1]?.body['prompt'])).toContain('primary character identity and art-style guide')
    expect(String(calls[1]?.body['prompt'])).toContain('Do not reinterpret the character in a different art style.')
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
        spritesheetBackgroundRemovalEnabled: false,
        spritesheetBackgroundRemovalCommand: 'uv run --script studio/tools/remove_chroma_key.py --input {input} --out {output} --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill --force',
        spritesheetBackgroundRemovalTimeoutSeconds: 300,
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
    expect(calls[0]?.body['output_format']).toBe('png')
    expect(result.path).toBe('characters/hero/character-sheet/main.png')
    expect(result.sourcePath).toBe('characters/hero/character-sheet/main.png')
    expect(result.revisedPrompt).toBe('Revised edit prompt.')
    expect(result.character.characterSheet.generated).not.toContain(result.path)
    expect(existsSync(join(ROOT, 'games', gameId, 'assets', result.path))).toBe(true)
    expect(readFileSync(join(ROOT, 'games', gameId, 'assets', result.path), 'utf8')).toBe('edited-image')
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
        type: 'spritesheet-library',
        defaultStateSheet: 'Main',
        defaultAnimationSheet: 'Main',
        defaultState: 'neutral',
        defaultAction: '',
        states: {},
        animationSheets: {},
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
        type: 'spritesheet-library',
        defaultStateSheet: 'Main',
        defaultAnimationSheet: 'Main',
        defaultState: 'neutral',
        defaultAction: '',
        states: {
          Main: {
            file: 'characters/hero/hero_spritesheet.png',
            atlas: '',
            sprites: { neutral: 'neutral', happy: 'happy', sad: 'sad' },
          },
        },
        animationSheets: {},
      },
      expressions: ['neutral', 'happy', 'sad'],
    })

    expect(result.atlas.frameCount).toBe(3)
    expect(result.character.atlasPath).toBe('characters/hero/spritesheets/Main/hero_atlas.json')
    expect(spritesheet(result.character)['sprites']).toEqual({
      neutral: 'neutral',
      happy: 'happy',
      sad: 'sad',
    })
  })
})
