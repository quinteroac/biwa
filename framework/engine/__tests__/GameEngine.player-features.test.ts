import { describe, expect, it, mock } from 'bun:test'
import { Compiler } from 'inkjs/compiler/Compiler.js'
import type { GameConfig } from '../../types/game-config.d.ts'
import type { BacklogEntry, GameSaveState } from '../../types/save.d.ts'

interface EventBusLike {
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void
}

interface GameEngineLike {
  readonly bus: EventBusLike
  start(): void
  advance(): void
  getBacklog(): BacklogEntry[]
  clearBacklog(): void
  getState(): GameSaveState
  restoreState(saved: GameSaveState): void
}

interface DialogPayload {
  text: string
  seenBefore?: boolean
}

function compileInk(ink: string): string {
  return new Compiler(ink).Compile().ToJson()
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 500) throw new Error('Timed out waiting for player feature condition')
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

async function createEngine(ink: string, gameId = `player-${crypto.randomUUID()}`): Promise<GameEngineLike> {
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
      return new Response('', { status: 404 })
    }),
  })

  const config: GameConfig = {
    id: gameId,
    title: 'Player Features',
    version: '1.0.0',
    story: { defaultLocale: 'en', locales: { en: './story.json' } },
    saves: { autoSave: false },
  }

  const { GameEngine } = await import(`../GameEngine.ts?player=${crypto.randomUUID()}`)
  return GameEngine.create(config) as Promise<GameEngineLike>
}

describe('GameEngine player features', () => {
  it('records dialog backlog entries and clearBacklog notifies listeners', async () => {
    const engine = await createEngine('Kai: First.\nSara: Second.\n')
    const updates: BacklogEntry[][] = []
    engine.bus.on<{ entries: BacklogEntry[] }>('engine:backlog', payload => updates.push(payload.entries))

    engine.start()
    await waitUntil(() => engine.getBacklog().length === 1)
    engine.advance()
    await waitUntil(() => engine.getBacklog().length === 2)

    expect(engine.getBacklog().map(entry => entry.text)).toEqual(['First.', 'Second.'])
    expect(engine.getBacklog().map(entry => entry.speaker)).toEqual(['Kai', 'Sara'])

    engine.clearBacklog()
    expect(engine.getBacklog()).toEqual([])
    expect(updates.at(-1)).toEqual([])
  })

  it('marks repeated dialog as seenBefore for read-only skip', async () => {
    const engine = await createEngine('Kai: Repeat.\nKai: Repeat.\n')
    const dialogs: DialogPayload[] = []
    engine.bus.on<DialogPayload>('engine:dialog', payload => dialogs.push(payload))

    engine.start()
    await waitUntil(() => dialogs.length === 1)
    engine.advance()
    await waitUntil(() => dialogs.length === 2)

    expect(dialogs[0]!.seenBefore).toBe(false)
    expect(dialogs[1]!.seenBefore).toBe(true)
  })

  it('persists backlog in save snapshots and restores it', async () => {
    const engine = await createEngine('Saved line.\nRestored line.\n')
    engine.start()
    await waitUntil(() => engine.getBacklog().length === 1)
    const state = engine.getState()

    engine.clearBacklog()
    expect(engine.getBacklog()).toEqual([])

    engine.restoreState(state)
    expect(engine.getBacklog().map(entry => entry.text)).toEqual(['Saved line.'])
  })
})
