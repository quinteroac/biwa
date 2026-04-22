import { EventBus } from './EventBus.ts'
import { VariableStore } from './VariableStore.ts'
import { ScriptRunner } from './ScriptRunner.ts'
import { SaveManager } from '../SaveManager.ts'
import { AssetLoader } from '../AssetLoader.ts'
import { MinigameRegistry } from '../minigames/MinigameRegistry.ts'
import type { GameSaveState } from '../types/save.d.ts'
import type { GameConfig } from '../types/game-config.d.ts'

const STATE = Object.freeze({
  IDLE:       'IDLE',
  LOADING:    'LOADING',
  DIALOG:     'DIALOG',
  CHOICES:    'CHOICES',
  TRANSITION: 'TRANSITION',
  MINIGAME:   'MINIGAME',
  PAUSED:     'PAUSED',
  ENDED:      'ENDED',
} as const)

type EngineState = typeof STATE[keyof typeof STATE]

interface GameData {
  characters: Record<string, Record<string, unknown>>
  scenes: Record<string, Record<string, unknown>>
}

export class GameEngine {
  static #instance: GameEngine | null = null

  #config: GameConfig
  #state: EngineState = STATE.IDLE
  #bus = new EventBus()
  #vars = new VariableStore()
  #runner: ScriptRunner
  #saveManager!: SaveManager
  #assetLoader!: AssetLoader
  #minigameRegistry = new MinigameRegistry()
  #currentSceneId: string | null = null
  #pendingChoices: ReturnType<ScriptRunner['choices']['slice']> | null = null
  #autoAdvance = false
  #data: GameData = { characters: {}, scenes: {} }

  constructor(config: GameConfig) {
    this.#config = config
    this.#runner = new ScriptRunner(this.#bus)
  }

  static async init(config: GameConfig): Promise<GameEngine> {
    if (GameEngine.#instance) return GameEngine.#instance
    const engine = new GameEngine(config)
    GameEngine.#instance = engine
    await engine.#boot()
    return engine
  }

  static get instance(): GameEngine | null {
    return GameEngine.#instance
  }

  get bus(): EventBus { return this.#bus }
  get vars(): VariableStore { return this.#vars }
  get state(): EngineState { return this.#state }
  get data(): GameData { return this.#data }

  /** The game title from the loaded config. */
  get title(): string { return this.#config.title }

  /** Expose the internal SaveManager instance for UI components. */
  get saveManager(): SaveManager { return this.#saveManager }

  /** Return a serialisable snapshot compatible with `SaveManager.save()` */
  getState(): GameSaveState {
    const meta = {
      displayName: 'Manual save',
      sceneName: this.#currentSceneId ?? 'unknown',
      playtime: 0,
    }
    const state: Record<string, unknown> = {
      story: this.#runner.saveState(),
      vars: this.#vars.snapshot(),
    }
    return { meta, state }
  }

  /** Restore a previously saved `GameSaveState`. */
  restoreState(saved: GameSaveState): void {
    const s = saved.state as Record<string, unknown>
    if (s['story'] && typeof s['story'] === 'string') {
      this.#runner.loadState(s['story'] as string)
    }
    if (s['vars'] && typeof s['vars'] === 'object') {
      this.#vars.restore(s['vars'] as Record<string, unknown>)
    }
    this.#setState(STATE.DIALOG)
    void this.#advance()
  }

  #setState(state: EngineState): void {
    this.#state = state
    this.#bus.emit('engine:state', state)
  }

  async #boot(): Promise<void> {
    this.#setState(STATE.LOADING)

    const { theme = {} } = this.#config
    if (theme.font)     document.documentElement.style.setProperty('--vn-font', theme.font)
    if (theme.dialogBg) document.documentElement.style.setProperty('--vn-dialog-bg', theme.dialogBg)
    if (theme.accent)   document.documentElement.style.setProperty('--vn-accent', theme.accent)
    if (theme.cssVars) {
      for (const [k, v] of Object.entries(theme.cssVars)) {
        document.documentElement.style.setProperty(k, v)
      }
    }

    this.#saveManager = new SaveManager({
      gameId:   this.#config.id,
      slots:    this.#config.saves?.slots ?? 5,
      autoSave: this.#config.saves?.autoSave ?? true,
    })
    this.#assetLoader = new AssetLoader()

    const minigames = this.#config.minigames ?? {}
    for (const [id, loader] of Object.entries(minigames)) {
      this.#minigameRegistry.register(id, loader)
    }

    await this.#loadData()

    const locale = this.#config.story.defaultLocale
    const storyPath = this.#config.story.locales[locale]
    if (!storyPath) throw new Error(`[GameEngine] No story path for locale "${locale}"`)
    await this.#runner.load(storyPath)
  }

  async #loadData(): Promise<void> {
    const { characters: charDir, scenes: scenesDir } = this.#config.data ?? {}

    await Promise.allSettled([
      this.#loadDataDir(charDir, 'characters'),
      this.#loadDataDir(scenesDir, 'scenes'),
    ])
  }

  async #loadDataDir(dir: string | undefined, key: keyof GameData): Promise<void> {
    if (!dir) return
    try {
      const res = await fetch(`${dir}index.json`)
      if (!res.ok) return
      const filenames = await res.json() as string[]
      await Promise.allSettled(
        filenames.map(async filename => {
          try {
            const r = await fetch(`${dir}${filename}`)
            if (!r.ok) return
            const data = await r.json() as Record<string, unknown>
            const id = filename.replace(/\.json$/, '')
            this.#data[key][id] = data
          } catch { /* non-fatal */ }
        })
      )
    } catch { /* non-fatal */ }
  }

  async #advance(): Promise<void> {
    const step = this.#runner.step()

    if (step === null) {
      this.#setState(STATE.ENDED)
      this.#bus.emit('engine:end', {})
      return
    }

    if (step.type === 'choices') {
      this.#setState(STATE.CHOICES)
      this.#bus.emit('engine:choices', { choices: step.choices })
      return
    }

    await this.#processTags(step.tags ?? [])

    if (step.pendingMinigame) {
      await this.#runMinigame(step.pendingMinigame, {})
    }

    if (step.type === 'dialog' && step.text) {
      this.#setState(STATE.DIALOG)

      const speaker = step.speaker
      let displayName = speaker
      let nameColor: string | null = null

      if (speaker) {
        const charData = this.#data.characters[speaker.toLowerCase()]
        if (charData) {
          displayName = (charData['displayName'] as string | undefined) ?? speaker
          nameColor = (charData['nameColor'] as string | null) ?? null
        }
      }

      const advanceMode = !step.canContinue && step.hasChoices
        ? 'choices'
        : this.#autoAdvance
          ? 'next'
          : 'none'

      if (!step.canContinue && step.hasChoices) {
        this.#pendingChoices = this.#runner.choices
      }

      this.#bus.emit('engine:dialog', {
        text: step.text,
        speaker: displayName,
        nameColor,
        canContinue: step.canContinue,
        advanceMode,
      })
      this.#autoAdvance = false
    } else if (step.type === 'tags-only') {
      await this.#advance()
    }
  }

  async #processTags(tags: ReturnType<ScriptRunner['step']> extends { tags: infer T } ? T : never): Promise<void> {
    for (const tag of tags) {
      switch (tag.type) {
        case 'scene':
          this.#currentSceneId = tag.id ?? null
          this.#bus.emit('engine:scene', { id: tag.id, data: this.#data.scenes[tag.id ?? ''] })
          break
        case 'bgm':
          this.#bus.emit('engine:bgm', tag)
          break
        case 'sfx':
          this.#bus.emit('engine:sfx', tag)
          break
        case 'ambience':
          this.#bus.emit('engine:ambience', tag)
          break
        case 'character':
          this.#bus.emit('engine:character', tag)
          break
        case 'transition':
          await this.#runTransition(tag)
          break
        case 'minigame':
          await this.#runMinigame(tag.id ?? '', tag)
          break
        case 'save':
          this.#autoSave()
          break
        case 'speaker':
          break
      }
    }
  }

  #runTransition(config: Record<string, unknown>): Promise<void> {
    return new Promise(resolve => {
      this.#setState(STATE.TRANSITION)
      this.#bus.emit('engine:transition', { config, done: () => { resolve() } })
    })
  }

  async #runMinigame(id: string, tag: Record<string, unknown>): Promise<void> {
    this.#setState(STATE.MINIGAME)
    this.#bus.emit('engine:minigame:start', { id, tag })

    try {
      const instance = await this.#minigameRegistry.get(id)
      await instance.init(tag)
      const result = await instance.start()

      this.#bus.emit('engine:minigame:end', { id, result })

      if (result && typeof result === 'object') {
        for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
          this.#runner.setVariable(`mg_${k}`, v)
        }
        if ('completed' in result) this.#runner.setVariable('minigame_completed', !!(result as Record<string, unknown>)['completed'])
        if ('score' in result)     this.#runner.setVariable('minigame_score', (result as Record<string, unknown>)['score'] ?? 0)
      }

      instance.destroy()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error(`[GameEngine] Minigame "${id}" error:`, err)
      this.#bus.emit('engine:minigame:end', { id, result: null, error: err.message })
    }

    this.#setState(STATE.DIALOG)
  }

  #autoSave(): void {
    const state = {
      story: this.#runner.saveState(),
      vars: this.#vars.snapshot(),
    }
    this.#saveManager.autoSave(state)
  }

  #choose(index: number): void {
    this.#runner.choose(index)
    this.#setState(STATE.DIALOG)
    this.#autoAdvance = true
    void this.#advance()
  }

  start(): void {
    this.#setState(STATE.DIALOG)
    void this.#advance()
  }

  advance(): void {
    if (this.#state !== STATE.DIALOG) return
    if (this.#pendingChoices) {
      const choices = this.#pendingChoices
      this.#pendingChoices = null
      this.#setState(STATE.CHOICES)
      this.#bus.emit('engine:choices', { choices })
    } else {
      void this.#advance()
    }
  }

  choose(index: number): void {
    this.#choose(index)
  }
}
