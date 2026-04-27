import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import type { GameEngine } from '../GameEngine.ts'
import type { GameConfig } from '../../types/game-config.d.ts'
import type { PlayerUnlockState } from '../../types/extras.d.ts'

const store: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const key of Object.keys(store)) delete store[key] },
  },
  writable: true,
})

function compileInk(ink: string): string {
  return new Compiler(ink).Compile().ToJson()
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 500) throw new Error('Timed out waiting for unlock condition')
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

async function createEngine(ink: string, gameId = `unlock-${crypto.randomUUID()}`): Promise<GameEngine> {
  const storyJson = compileInk(ink)

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      documentElement: {
        style: { setProperty: mock(() => {}) },
      },
    } as unknown as Document,
  })

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: mock(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('story.json')) return new Response(storyJson, { status: 200 })
      if (url.endsWith('data/gallery/index.json')) return Response.json(['cg_001.json'])
      if (url.endsWith('data/gallery/cg_001.json')) return Response.json({ id: 'cg_001', title: 'Cafe CG', image: 'gallery/cg_001.png' })
      if (url.endsWith('data/music/index.json')) return Response.json(['theme.json'])
      if (url.endsWith('data/music/theme.json')) return Response.json({ id: 'theme', title: 'Theme', file: 'audio/bgm/theme.ogg' })
      if (url.endsWith('data/replay/index.json')) return Response.json(['chapter_01.json'])
      if (url.endsWith('data/replay/chapter_01.json')) return Response.json({ id: 'chapter_01', title: 'Chapter 01', sceneId: 'cafe' })
      return new Response('', { status: 404 })
    }),
  })

  const config: GameConfig = {
    id: gameId,
    title: 'Unlock Features',
    version: '1.0.0',
    story: { defaultLocale: 'en', locales: { en: './story.json' } },
    data: {
      gallery: './data/gallery/',
      music: './data/music/',
      replay: './data/replay/',
    },
    saves: { autoSave: false },
  }

  const { GameEngine } = await import(`../GameEngine.ts?unlocks=${crypto.randomUUID()}`)
  return GameEngine.create(config) as Promise<GameEngine>
}

describe('GameEngine unlocks', () => {
  beforeEach(() => localStorage.clear())

  it('loads extras data and persists unlock tags', async () => {
    const engine = await createEngine([
      '# unlock: cg_001, kind: gallery',
      '# unlock_music: theme',
      '# unlock_replay: chapter_01',
      'Unlocked.',
    ].join('\n'))
    const updates: PlayerUnlockState[] = []
    engine.bus.on<{ unlocks: PlayerUnlockState }>('engine:unlocks', payload => updates.push(payload.unlocks))

    engine.start()
    await waitUntil(() => updates.length === 3)

    expect(engine.getGalleryItems()).toEqual([{ id: 'cg_001', title: 'Cafe CG', image: 'gallery/cg_001.png' }])
    expect(engine.getMusicTracks()).toEqual([{ id: 'theme', title: 'Theme', file: 'audio/bgm/theme.ogg' }])
    expect(engine.getReplayScenes()).toEqual([{ id: 'chapter_01', title: 'Chapter 01', sceneId: 'cafe' }])
    expect(engine.getUnlocks()).toEqual({
      gallery: ['cg_001'],
      music: ['theme'],
      replay: ['chapter_01'],
    })
  })

  it('exposes direct unlock API helpers', async () => {
    const engine = await createEngine('Ready.')

    engine.unlockGallery('cg_001')
    engine.unlockMusic('theme')

    expect(engine.getUnlocks().gallery).toEqual(['cg_001'])
    expect(engine.getUnlocks().music).toEqual(['theme'])
  })
})
