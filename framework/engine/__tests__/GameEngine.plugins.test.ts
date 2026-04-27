import { describe, expect, it, mock } from 'bun:test'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import type { GameConfig } from '../../types/game-config.d.ts'
import type { VnPluginRecord } from '../../types/plugins.d.ts'

function compileInk(ink: string): string {
  return new Compiler(ink).Compile().ToJson()
}

function installBrowserMocks(): void {
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
      if (url.endsWith('story.json')) return new Response(compileInk('Plugin line.\n'), { status: 200 })
      if (url.endsWith('/index.json')) return Response.json([])
      return new Response('', { status: 404 })
    }),
  })
}

async function importEngine() {
  return import(`../GameEngine.ts?plugins=${crypto.randomUUID()}`)
}

describe('GameEngine plugins', () => {
  it('loads configured plugins and exposes registry records', async () => {
    installBrowserMocks()
    const setup = mock(() => {})
    const dispose = mock(() => {})
    const config: GameConfig = {
      id: 'plugin-runtime',
      title: 'Plugin Runtime',
      version: '1.0.0',
      story: { defaultLocale: 'en', locales: { en: './story.json' } },
      plugins: [{
        id: 'runtime-plugin',
        name: 'Runtime Plugin',
        version: '1.0.0',
        type: 'plugin',
        capabilities: ['engine-event'],
        loader: async () => ({ setup, dispose }),
      }],
    }

    const { GameEngine } = await importEngine()
    const engine = await GameEngine.create(config)

    expect(engine.plugins.list().map((record: VnPluginRecord) => record.manifest.id)).toEqual(['runtime-plugin'])
    expect(setup).toHaveBeenCalledTimes(1)
    expect((setup.mock.calls[0] as unknown[])[0]).toMatchObject({ gameId: 'plugin-runtime' })

    await engine.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('dispatches plugin-declared Ink tags through the tag registry', async () => {
    const storyJson = compileInk('# effect: shake, intensity: 0.4\nPlugin line.\n')
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
        if (url.endsWith('/index.json')) return Response.json([])
        return new Response('', { status: 404 })
      }),
    })

    const handler = mock(() => {})
    const config: GameConfig = {
      id: 'plugin-tags',
      title: 'Plugin Tags',
      version: '1.0.0',
      story: { defaultLocale: 'en', locales: { en: './story.json' } },
      plugins: [{
        id: 'tag-plugin',
        name: 'Tag Plugin',
        version: '1.0.0',
        type: 'plugin',
        capabilities: ['ink-tag'],
        tags: ['effect'],
        loader: async () => ({
          setup(context) {
            context.tags.register('effect', handler, { pluginId: 'tag-plugin' })
          },
        }),
      }],
    }

    const { GameEngine } = await importEngine()
    const engine = await GameEngine.create(config)
    engine.start()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0] as unknown[] | undefined)?.[0]).toMatchObject({ type: 'effect', id: 'shake', intensity: '0.4' })
    expect(engine.tags.has('effect')).toBe(true)
  })
})
