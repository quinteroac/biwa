import { describe, expect, it, mock } from 'bun:test'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import type { GameConfig } from '../../types/game-config.d.ts'

interface EventBusLike {
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void
}

interface GameEngineLike {
  readonly bus: EventBusLike
  readonly state: string
  start(): void
  advance(): void
  choose(index: number): void
}

interface GameEngineModule {
  GameEngine: {
    init(config: GameConfig): Promise<GameEngineLike>
  }
}

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}

interface DialogPayload {
  text: string
  advanceMode: 'none' | 'next' | 'choices'
}

interface ChoicesPayload {
  choices: unknown[]
}

interface TransitionPayload {
  done(): void
}

function compileInk(ink: string): string {
  return new Compiler(ink).Compile().ToJson()
}

function createDeferred<T>(): Deferred<T> {
  let resolveFn: ((value: T) => void) | null = null
  const promise = new Promise<T>(resolve => {
    resolveFn = resolve
  })
  return {
    promise,
    resolve(value: T) {
      resolveFn?.(value)
    },
  }
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 500) {
      throw new Error('Timed out waiting for GameEngine test condition')
    }
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

async function createEngine(ink: string, configOverrides: Partial<GameConfig> = {}): Promise<GameEngineLike> {
  const storyJson = compileInk(ink)
  const documentMock = {
    documentElement: {
      style: {
        setProperty: mock(() => {}),
      },
    },
  }

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: documentMock as unknown as Document,
  })

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: mock(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('story.json')) {
        return new Response(storyJson, { status: 200 })
      }
      return new Response('', { status: 404 })
    }),
  })

  const config: GameConfig = {
    id: `us003-${crypto.randomUUID()}`,
    title: 'US-003 Fixture',
    version: '1.0.0',
    story: {
      defaultLocale: 'en',
      locales: {
        en: './story.json',
      },
    },
    saves: {
      autoSave: false,
    },
    ...configOverrides,
  }

  const moduleId = `../GameEngine.ts?us003=${crypto.randomUUID()}`
  const { GameEngine } = await import(moduleId) as GameEngineModule
  return GameEngine.init(config)
}

describe('GameEngine - US-003 duplicate advance guard', () => {
  it('US-003-AC01/AC02: ignores duplicate advance requests while one advance is in progress', async () => {
    const engine = await createEngine('Line one\nLine two\nLine three\n')
    const dialogs: string[] = []
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)

    engine.advance()
    engine.advance()
    engine.advance()

    await waitUntil(() => dialogs.length === 2)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(dialogs).toEqual(['Line one', 'Line two'])
    expect(engine.state).toBe('DIALOG')
  })

  it('US-003-AC03: blocks advances while choices are active', async () => {
    const engine = await createEngine('Choose carefully.\n* First\n  First result\n')
    const choicesEvents: number[] = []
    const dialogs: string[] = []
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })
    engine.bus.on<ChoicesPayload>('engine:choices', payload => {
      choicesEvents.push(payload.choices.length)
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)
    engine.advance()
    await waitUntil(() => choicesEvents.length === 1)

    engine.advance()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(engine.state).toBe('CHOICES')
    expect(choicesEvents).toEqual([1])
    expect(dialogs).toEqual(['Choose carefully.'])
  })

  it('US-003-AC03/AC04: blocks advances during transitions and resumes dialog after completion', async () => {
    const engine = await createEngine('# transition: fade\nLine one\nLine two\n')
    const dialogs: string[] = []
    const finishTransitionCallbacks: (() => void)[] = []
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })
    engine.bus.on<TransitionPayload>('engine:transition', payload => {
      finishTransitionCallbacks.push(payload.done)
    })

    engine.start()
    await waitUntil(() => finishTransitionCallbacks.length === 1)
    expect(engine.state).toBe('TRANSITION')

    engine.advance()
    finishTransitionCallbacks[0]?.()
    await waitUntil(() => dialogs.length === 1)

    expect(dialogs).toEqual(['Line one'])
    expect(engine.state).toBe('DIALOG')

    engine.advance()
    await waitUntil(() => dialogs.length === 2)
    expect(dialogs).toEqual(['Line one', 'Line two'])
  })

  it('US-003-AC03/AC04: blocks advances during minigames and resumes dialog after completion', async () => {
    const minigameResult = createDeferred<Record<string, unknown>>()
    let minigameDestroyed = false

    class SlowMinigame {
      async init(): Promise<void> {}

      async start(): Promise<Record<string, unknown>> {
        return minigameResult.promise
      }

      destroy(): void {
        minigameDestroyed = true
      }
    }

    const engine = await createEngine(
      'EXTERNAL launch_minigame(name)\nLine one\n~ launch_minigame("slow")\nAfter minigame\n',
      {
        minigames: {
          slow: async () => ({ default: SlowMinigame }),
        },
      },
    )
    const dialogs: string[] = []
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)
    engine.advance()
    await waitUntil(() => engine.state === 'MINIGAME')

    engine.advance()
    minigameResult.resolve({})
    await waitUntil(() => dialogs.length === 2)

    expect(dialogs).toEqual(['Line one', 'After minigame'])
    expect(engine.state).toBe('DIALOG')
    expect(minigameDestroyed).toBe(true)
  })

  it('US-003-AC03: blocks advances after the story has ended', async () => {
    const engine = await createEngine('Only line\n')
    const dialogs: string[] = []
    let endCount = 0
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })
    engine.bus.on('engine:end', () => {
      endCount += 1
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)
    engine.advance()
    await waitUntil(() => engine.state === 'ENDED')

    engine.advance()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(dialogs).toEqual(['Only line'])
    expect(endCount).toBe(1)
  })

  it('US-003-AC05: keeps existing Ink tag and choice formats unchanged', async () => {
    const engine = await createEngine('# scene: cafe_exterior\nTagged line\n* Continue\n  After choice\n')
    const dialogs: string[] = []
    const scenes: string[] = []
    let choicesCount = 0
    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload.text)
    })
    engine.bus.on<{ id: string }>('engine:scene', payload => {
      scenes.push(payload.id)
    })
    engine.bus.on<ChoicesPayload>('engine:choices', payload => {
      choicesCount = payload.choices.length
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)
    engine.advance()
    await waitUntil(() => choicesCount === 1)

    expect(scenes).toEqual(['cafe_exterior'])
    expect(dialogs).toEqual(['Tagged line'])
    expect(engine.state).toBe('CHOICES')
  })

  it('does not mark post-choice dialog for automatic advance', async () => {
    const engine = await createEngine('Pick a path.\n* [First]\n  After choice\n  Next manual line\n')
    const dialogs: DialogPayload[] = []
    let choicesCount = 0

    engine.bus.on<DialogPayload>('engine:dialog', payload => {
      dialogs.push(payload)
    })
    engine.bus.on<ChoicesPayload>('engine:choices', payload => {
      choicesCount = payload.choices.length
    })

    engine.start()
    await waitUntil(() => dialogs.length === 1)
    engine.advance()
    await waitUntil(() => choicesCount === 1)

    engine.choose(0)
    await waitUntil(() => dialogs.length === 2)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(dialogs.map(dialog => dialog.text)).toEqual(['Pick a path.', 'After choice'])
    expect(dialogs[1]?.advanceMode).toBe('none')
    expect(engine.state).toBe('DIALOG')
  })
})
