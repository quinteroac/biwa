import { describe, expect, it, mock } from 'bun:test'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import type { GameConfig } from '../../types/game-config.d.ts'

function compileInk(ink: string): string {
  return new Compiler(ink).Compile().ToJson()
}

async function importEngine() {
  return import(`../GameEngine.ts?instances=${crypto.randomUUID()}`)
}

function installBrowserMocks(stories: Record<string, string>): void {
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
      if (url in stories) return new Response(stories[url], { status: 200 })
      if (url.endsWith('/index.json')) return new Response('[]', { status: 200 })
      return new Response('{}', { status: 200 })
    }),
  })
}

function config(id: string, storyPath: string): GameConfig {
  return {
    id,
    title: id,
    version: '1.0.0',
    story: {
      defaultLocale: 'en',
      locales: { en: storyPath },
    },
    data: {
      scenes: './data/scenes/',
      characters: './data/characters/',
      audio: './data/audio/',
      minigames: './data/minigames/',
    },
    saves: { autoSave: false },
  }
}

describe('GameEngine instance policy', () => {
  it('create() returns booted isolated instances without setting the singleton', async () => {
    const { GameEngine } = await importEngine()
    installBrowserMocks({
      './story-a.json': compileInk('A line.\n'),
      './story-b.json': compileInk('B line.\n'),
    })

    const a = await GameEngine.create(config('engine-a', './story-a.json'))
    const b = await GameEngine.create(config('engine-b', './story-b.json'))

    expect(a).not.toBe(b)
    expect(a.title).toBe('engine-a')
    expect(b.title).toBe('engine-b')
    expect(GameEngine.instance).toBeNull()
  })

  it('init() keeps the app singleton contract', async () => {
    const { GameEngine } = await importEngine()
    installBrowserMocks({
      './story-singleton.json': compileInk('Singleton line.\n'),
    })

    const first = await GameEngine.init(config('singleton-a', './story-singleton.json'))
    const second = await GameEngine.init(config('singleton-b', './story-singleton.json'))

    expect(first).toBe(second)
    expect(GameEngine.instance).toBe(first)
    expect(second.title).toBe('singleton-a')
  })

  it('applies the configured dialog font size as a CSS variable', async () => {
    const setProperty = mock(() => {})
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: {
          style: { setProperty },
        },
      } as unknown as Document,
    })
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: mock(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input)
        if (url === './story-theme.json') return new Response(compileInk('Theme line.\n'), { status: 200 })
        if (url.endsWith('/index.json')) return new Response('[]', { status: 200 })
        return new Response('{}', { status: 200 })
      }),
    })

    const { GameEngine } = await importEngine()
    await GameEngine.create({
      ...config('theme-font-size', './story-theme.json'),
      theme: { fontSize: '22px' },
    })

    expect(setProperty).toHaveBeenCalledWith('--vn-dialog-font-size', '22px')
  })
})
