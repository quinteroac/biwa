import { describe, expect, it, mock } from 'bun:test'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import type { GameConfig } from '../../types/game-config.d.ts'
import type { GameSaveState } from '../../types/save.d.ts'

interface EventBusLike {
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void
}

interface GameEngineLike {
  readonly bus: EventBusLike
  readonly state: string
  start(): void
  getState(): GameSaveState
  restoreState(saved: GameSaveState): void
}

interface GameEngineModule {
  GameEngine: {
    init(config: GameConfig): Promise<GameEngineLike>
  }
}

interface DialogPayload {
  text: string
}

interface ScenePayload {
  id: string
  variant?: string
  data?: Record<string, unknown>
}

interface CharacterPayload {
  id: string
  position?: string
  expression?: string
}

function compileInk(ink: string): string {
  return new Compiler(ink).Compile().ToJson()
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 500) {
      throw new Error('Timed out waiting for GameEngine save test condition')
    }
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

async function createEngine(ink: string): Promise<GameEngineLike> {
  const storyJson = compileInk(ink)
  const jsonFixtures: Record<string, unknown> = {
    './data/scenes/index.json': ['cafe.json'],
    './data/scenes/cafe.json': {
      type: 'static',
      src: 'images/cafe-day.jpg',
      thumbnail: 'images/thumbs/cafe.jpg',
      variants: {
        night: { src: 'images/cafe-night.jpg' },
      },
    },
    './data/characters/index.json': ['kai.json'],
    './data/characters/kai.json': {
      displayName: 'Kai',
      defaultPosition: 'center',
      defaultExpression: 'neutral',
    },
    './data/audio/index.json': ['theme.json'],
    './data/audio/theme.json': {
      file: 'audio/theme.mp3',
      volume: 0.6,
      loop: true,
    },
  }

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      documentElement: {
        style: {
          setProperty: mock(() => {}),
        },
      },
    } as unknown as Document,
  })

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: mock(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('story.json')) {
        return new Response(storyJson, { status: 200 })
      }
      if (url in jsonFixtures) {
        return new Response(JSON.stringify(jsonFixtures[url]), { status: 200 })
      }
      return new Response('', { status: 404 })
    }),
  })

  const config: GameConfig = {
    id: `save-${crypto.randomUUID()}`,
    title: 'Save Fixture',
    version: '1.0.0',
    story: {
      defaultLocale: 'en',
      locales: {
        en: './story.json',
      },
    },
    data: {
      scenes: './data/scenes/',
      characters: './data/characters/',
      audio: './data/audio/',
    },
    saves: {
      autoSave: false,
    },
  }

  const moduleId = `../GameEngine.ts?save=${crypto.randomUUID()}`
  const { GameEngine } = await import(moduleId) as GameEngineModule
  return GameEngine.init(config)
}

describe('GameEngine save/load snapshots', () => {
  it('captures scene, character, audio, locale, thumbnail and elapsed playtime', async () => {
    const engine = await createEngine(`# scene: cafe, variant: night
# character: kai, position: left, expression: happy
# bgm: theme
Kai: Hello there.
`)
    const dialogs: string[] = []
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)

    const state = engine.getState()

    expect(state.meta.sceneName).toBe('cafe')
    expect(state.meta.thumbnail).toBe('images/thumbs/cafe.jpg')
    expect(state.meta.playtime).toBeGreaterThanOrEqual(0)
    expect(state.visual?.scene).toEqual({ id: 'cafe', variant: 'night' })
    expect(state.visual?.characters).toEqual([{ id: 'kai', position: 'left', expression: 'happy' }])
    expect(state.visual?.audio.bgm).toMatchObject({
      type: 'bgm',
      id: 'theme',
      file: 'audio/theme.mp3',
      volume: 0.6,
    })
    expect(state.visual?.locale).toBe('en')
  })

  it('restores visible scene, characters and persistent audio before advancing story', async () => {
    const engine = await createEngine('Restored line.\n')
    const scenes: ScenePayload[] = []
    const characters: CharacterPayload[] = []
    const bgm: Record<string, unknown>[] = []
    const dialogs: string[] = []

    engine.bus.on<ScenePayload>('engine:scene', payload => {
      scenes.push(payload)
    })
    engine.bus.on<CharacterPayload>('engine:character', payload => {
      characters.push(payload)
    })
    engine.bus.on<Record<string, unknown>>('engine:bgm', payload => {
      bgm.push(payload)
    })
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })

    engine.restoreState({
      meta: {
        displayName: 'Manual save',
        sceneName: 'cafe',
        playtime: 12,
        thumbnail: 'images/thumbs/cafe.jpg',
      },
      state: {
        vars: { metKai: true },
      },
      visual: {
        scene: { id: 'cafe', variant: 'night' },
        characters: [{ id: 'kai', position: 'right', expression: 'sad' }],
        audio: {
          bgm: { type: 'bgm', id: 'theme', file: 'audio/theme.mp3', volume: 0.6 },
        },
        locale: 'en',
      },
    })

    expect(scenes[0]).toMatchObject({ id: 'cafe', variant: 'night' })
    expect(characters[0]).toEqual({ id: 'kai', position: 'right', expression: 'sad' })
    expect(bgm[0]).toMatchObject({ type: 'bgm', id: 'theme', file: 'audio/theme.mp3' })

    await waitUntil(() => dialogs.length === 1)

    const restored = engine.getState()
    expect(restored.meta.playtime).toBeGreaterThanOrEqual(12)
    expect(restored.visual?.scene).toEqual({ id: 'cafe', variant: 'night' })
    expect(restored.visual?.characters).toEqual([{ id: 'kai', position: 'right', expression: 'sad' }])
    expect(restored.visual?.audio.bgm).toMatchObject({ id: 'theme', file: 'audio/theme.mp3' })
  })
})
