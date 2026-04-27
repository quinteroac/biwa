import { EventBus } from './EventBus.ts'
import { VariableStore } from './VariableStore.ts'
import { ScriptRunner } from './ScriptRunner.ts'
import { SaveManager } from '../SaveManager.ts'
import { AssetLoader } from '../AssetLoader.ts'
import { MinigameRegistry } from '../minigames/MinigameRegistry.ts'
import { BgmController } from './BgmController.ts'
import { SfxController } from './SfxController.ts'
import { AmbienceController } from './AmbienceController.ts'
import { VoiceController } from './VoiceController.ts'
import type { GameSaveState, SavedAudioState, SavedCharacterState, SavedVisualState } from '../types/save.d.ts'
import type { GameConfig } from '../types/game-config.d.ts'
import type { TagCommand } from './ScriptRunner.ts'
import type { EngineEventMap } from '../types/events.d.ts'

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

export type EngineState = typeof STATE[keyof typeof STATE]

interface GameData {
  characters: Record<string, Record<string, unknown>>
  scenes: Record<string, Record<string, unknown>>
  audio: Record<string, Record<string, unknown>>
  minigames: Record<string, Record<string, unknown>>
}

export class GameEngine {
  static #instance: GameEngine | null = null

  #config: GameConfig
  #state: EngineState = STATE.IDLE
  #bus = new EventBus<EngineEventMap>()
  #vars = new VariableStore()
  #runner: ScriptRunner
  #saveManager!: SaveManager
  #assetLoader!: AssetLoader
  #minigameRegistry = new MinigameRegistry()
  #bgm: BgmController
  #sfx: SfxController
  #ambience: AmbienceController
  #voice: VoiceController
  #currentSceneId: string | null = null
  #currentSceneVariant: string | null = null
  #currentCharacters = new Map<string, SavedCharacterState>()
  #currentAudio: SavedAudioState = {}
  #locale: string
  #startedAt = Date.now()
  #restoredPlaytime = 0
  #pendingChoices: ReturnType<ScriptRunner['choices']['slice']> | null = null
  #advanceInProgress = false
  #data: GameData = { characters: {}, scenes: {}, audio: {}, minigames: {} }

  constructor(config: GameConfig) {
    this.#config = config
    this.#runner = new ScriptRunner(this.#bus)
    this.#locale = config.story.defaultLocale
    this.#bgm = new BgmController(this.#bus)
    this.#sfx = new SfxController(this.#bus)
    this.#ambience = new AmbienceController(this.#bus)
    this.#voice = new VoiceController(this.#bus)
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

  get bus(): EventBus<EngineEventMap> { return this.#bus }
  get vars(): VariableStore { return this.#vars }
  get state(): EngineState { return this.#state }
  get data(): GameData { return this.#data }

  /** The game title from the loaded config. */
  get title(): string { return this.#config.title }

  /** Expose the internal SaveManager instance for UI components. */
  get saveManager(): SaveManager { return this.#saveManager }

  /** Return a serialisable snapshot compatible with `SaveManager.save()` */
  getState(): GameSaveState {
    const scene = this.#currentSceneId
      ? {
          id: this.#currentSceneId,
          ...(this.#currentSceneVariant ? { variant: this.#currentSceneVariant } : {}),
        }
      : undefined
    const sceneData = this.#currentSceneId ? this.#data.scenes[this.#currentSceneId] : undefined
    const thumbnail = typeof sceneData?.['thumbnail'] === 'string' ? sceneData['thumbnail'] : undefined
    const playtime = this.#restoredPlaytime + Math.floor((Date.now() - this.#startedAt) / 1000)
    const meta = {
      displayName: 'Manual save',
      sceneName: this.#currentSceneId ?? 'unknown',
      playtime,
      ...(thumbnail ? { thumbnail } : {}),
    }
    const state: Record<string, unknown> = {
      story: this.#runner.saveState(),
      vars: this.#vars.snapshot(),
    }
    const visual: SavedVisualState = {
      ...(scene ? { scene } : {}),
      characters: Array.from(this.#currentCharacters.values()),
      audio: { ...this.#currentAudio },
      locale: this.#locale,
    }
    return { meta, state, visual }
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
    this.#restoredPlaytime = saved.meta.playtime
    this.#startedAt = Date.now()
    this.#restoreVisualState(saved.visual)
    this.#setState(STATE.DIALOG)
    this.#requestAdvance()
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
      gameId:      this.#config.id,
      gameVersion: this.#config.version,
      slots:       this.#config.saves?.slots ?? 5,
      autoSave:    this.#config.saves?.autoSave ?? true,
    })
    this.#assetLoader = new AssetLoader()

    const minigames = this.#config.minigames ?? {}
    for (const [id, loader] of Object.entries(minigames)) {
      this.#minigameRegistry.register(id, loader)
    }

    await this.#loadData()

    this.#locale = this.#config.story.defaultLocale
    const storyPath = this.#config.story.locales[this.#locale]
    if (!storyPath) throw new Error(`[GameEngine] No story path for locale "${this.#locale}"`)
    await this.#runner.load(storyPath)
  }

  async #loadData(): Promise<void> {
    const {
      characters: charDir,
      scenes: scenesDir,
      audio: audioDir,
      minigames: minigamesDir,
    } = this.#config.data ?? {}

    await Promise.allSettled([
      this.#loadDataDir(charDir, 'characters'),
      this.#loadDataDir(scenesDir, 'scenes'),
      this.#loadDataDir(audioDir, 'audio'),
      this.#loadDataDir(minigamesDir, 'minigames'),
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
            const id = filename.split('/').pop()!.replace(/\.json$/, '')
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
      this.#bus.emit('end_screen', {
        title:   this.#config.endScreen?.title,
        message: this.#config.endScreen?.message,
      })
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
        : 'none'

      if (!step.canContinue && step.hasChoices) {
        this.#pendingChoices = this.#runner.choices.slice()
      }

      this.#bus.emit('engine:dialog', {
        text: step.text,
        speaker: displayName,
        nameColor,
        canContinue: step.canContinue,
        advanceMode,
      })
    } else if (step.type === 'tags-only') {
      await this.#advance()
    }
  }

  #requestAdvance(): void {
    if (this.#advanceInProgress) return
    this.#advanceInProgress = true
    void this.#advance().finally(() => {
      this.#advanceInProgress = false
    })
  }

  async #processTags(tags: TagCommand[]): Promise<void> {
    for (const tag of tags) {
      switch (tag.type) {
        case 'scene':
          this.#currentSceneId = tag.id ?? null
          this.#currentSceneVariant = typeof tag['variant'] === 'string' ? tag['variant'] : null
          this.#bus.emit('engine:scene', { ...tag, data: this.#data.scenes[tag.id ?? ''] })
          break
        case 'bgm':
          this.#emitAudioTag('bgm', tag)
          break
        case 'sfx':
          this.#bus.emit('engine:sfx', this.#withAudioData(tag))
          break
        case 'ambience':
          this.#emitAudioTag('ambience', tag)
          break
        case 'voice':
          this.#emitAudioTag('voice', tag)
          break
        case 'character':
          this.#trackCharacter(tag)
          this.#bus.emit('engine:character', tag)
          break
        case 'transition':
          await this.#runTransition(tag)
          break
        case 'minigame':
          await this.#runMinigame(tag.id ?? '', tag)
          break
        case 'end_screen':
          this.#setState(STATE.ENDED)
          this.#bus.emit('end_screen', {
            title:   (tag['title'] as string | undefined) ?? this.#config.endScreen?.title,
            message: (tag['message'] as string | undefined) ?? this.#config.endScreen?.message,
          })
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

  #withAudioData(tag: TagCommand): TagCommand {
    const data = tag.id ? this.#data.audio[tag.id] : undefined
    return data ? { ...data, ...tag } : tag
  }

  #emitAudioTag(channel: keyof SavedAudioState, tag: TagCommand): void {
    const payload = this.#withAudioData(tag)
    if (payload.id === 'stop') {
      delete this.#currentAudio[channel]
    } else {
      this.#currentAudio[channel] = payload
    }
    this.#bus.emit(`engine:${channel}`, payload)
  }

  #trackCharacter(tag: TagCommand): void {
    const id = tag.id
    if (!id) {
      if (tag.exit) this.#currentCharacters.clear()
      return
    }
    if (tag.exit) {
      this.#currentCharacters.delete(id)
      return
    }

    const previous = this.#currentCharacters.get(id)
    const data = this.#data.characters[id] ?? {}
    const position = typeof tag['position'] === 'string'
      ? tag['position']
      : previous?.position ?? (typeof data['defaultPosition'] === 'string' ? data['defaultPosition'] : 'center')
    const expression = typeof tag['expression'] === 'string'
      ? tag['expression']
      : previous?.expression ?? (typeof data['defaultExpression'] === 'string' ? data['defaultExpression'] : 'neutral')

    this.#currentCharacters.set(id, { id, position, expression })
  }

  #restoreVisualState(visual: SavedVisualState | undefined): void {
    if (!visual) return

    this.#locale = visual.locale
    this.#currentCharacters.clear()
    this.#currentAudio = {}

    if (visual.scene) {
      this.#currentSceneId = visual.scene.id
      this.#currentSceneVariant = visual.scene.variant ?? null
      this.#bus.emit('engine:scene', {
        type: 'scene',
        id: visual.scene.id,
        ...(visual.scene.variant ? { variant: visual.scene.variant } : {}),
        data: this.#data.scenes[visual.scene.id],
      })
    }

    for (const character of visual.characters) {
      this.#currentCharacters.set(character.id, character)
      this.#bus.emit('engine:character', character)
    }

    if (visual.audio.bgm) {
      this.#currentAudio.bgm = visual.audio.bgm
      this.#bus.emit('engine:bgm', { ...visual.audio.bgm, restored: true })
    }
    if (visual.audio.ambience) {
      this.#currentAudio.ambience = visual.audio.ambience
      this.#bus.emit('engine:ambience', { ...visual.audio.ambience, restored: true })
    }
    if (visual.audio.voice) {
      this.#currentAudio.voice = visual.audio.voice
      this.#bus.emit('engine:voice', { ...visual.audio.voice, restored: true })
    }
  }

  async #runMinigame(id: string, tag: Record<string, unknown>): Promise<void> {
    this.#setState(STATE.MINIGAME)
    this.#bus.emit('engine:minigame:start', { id, tag })

    try {
      const metadata = this.#data.minigames[id] ?? {}
      const defaultConfig = metadata['config']
      const config = typeof defaultConfig === 'object' && defaultConfig !== null
        ? { ...(defaultConfig as Record<string, unknown>), ...tag }
        : tag
      const instance = await this.#minigameRegistry.get(id)
      await instance.init(config)
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
    this.#saveManager.autoSave(this.getState())
  }

  #choose(index: number): void {
    this.#runner.choose(index)
    this.#setState(STATE.DIALOG)
    this.#requestAdvance()
  }

  start(): void {
    if (this.#state === STATE.ENDED) {
      this.#runner.reset()
    }
    this.#setState(STATE.DIALOG)
    this.#requestAdvance()
  }

  advance(): void {
    if (this.#state !== STATE.DIALOG) return
    if (this.#pendingChoices) {
      const choices = this.#pendingChoices
      this.#pendingChoices = null
      this.#setState(STATE.CHOICES)
      this.#bus.emit('engine:choices', { choices })
    } else {
      this.#requestAdvance()
    }
  }

  choose(index: number): void {
    this.#choose(index)
  }
}
