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
import { PlayerUnlocks } from '../player/PlayerUnlocks.ts'
import { PluginRegistry, createPluginContext, loadPluginDescriptor } from '../plugins/PluginRegistry.ts'
import { TagRegistry } from '../plugins/TagRegistry.ts'
import type { BacklogEntry, GameSaveState, SavedAudioState, SavedCharacterState, SavedVisualState } from '../types/save.d.ts'
import type { GameConfig } from '../types/game-config.d.ts'
import type { TagCommand } from './ScriptRunner.ts'
import type { EngineEventMap } from '../types/events.d.ts'
import type { RuntimeDiagnosticsSnapshot } from '../types/diagnostics.d.ts'
import type { GalleryItem, MusicRoomTrack, PlayerUnlockState, ReplayScene, UnlockKind } from '../types/extras.d.ts'
import type { VnPluginRendererDeclarations } from '../types/plugins.d.ts'

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
  gallery: Record<string, Record<string, unknown>>
  music: Record<string, Record<string, unknown>>
  replay: Record<string, Record<string, unknown>>
}

export class GameEngine {
  static #instance: GameEngine | null = null

  #config: GameConfig
  #state: EngineState = STATE.IDLE
  #bus = new EventBus<EngineEventMap>()
  #vars = new VariableStore()
  #runner: ScriptRunner
  #saveManager!: SaveManager
  #unlockStore!: PlayerUnlocks
  #assetLoader!: AssetLoader
  #minigameRegistry = new MinigameRegistry()
  #pluginRegistry = new PluginRegistry()
  #tagRegistry = new TagRegistry()
  #bgm: BgmController
  #sfx: SfxController
  #ambience: AmbienceController
  #voice: VoiceController
  #currentSceneId: string | null = null
  #currentSceneVariant: string | null = null
  #currentCharacters = new Map<string, SavedCharacterState>()
  #currentAudio: SavedAudioState = {}
  #currentVoiceForDialog: Record<string, unknown> | null = null
  #backlog: BacklogEntry[] = []
  #seenDialogKeys = new Set<string>()
  #backlogIndex = 0
  #locale: string
  #startedAt = Date.now()
  #restoredPlaytime = 0
  #pendingChoices: ReturnType<ScriptRunner['choices']['slice']> | null = null
  #advanceInProgress = false
  #booted = false
  #data: GameData = { characters: {}, scenes: {}, audio: {}, minigames: {}, gallery: {}, music: {}, replay: {} }

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
    const engine = await GameEngine.create(config)
    GameEngine.#instance = engine
    return engine
  }

  /** Creates and boots an isolated engine without touching the app singleton. */
  static async create(config: GameConfig): Promise<GameEngine> {
    const engine = new GameEngine(config)
    await engine.boot()
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

  /** Stable game id used for player preference namespaces. */
  get id(): string { return this.#config.id }

  /** Expose the internal SaveManager instance for UI components. */
  get saveManager(): SaveManager { return this.#saveManager }
  get plugins(): PluginRegistry { return this.#pluginRegistry }
  get tags(): TagRegistry { return this.#tagRegistry }

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
      backlog: this.getBacklog(),
      locale: this.#locale,
    }
    return { meta, state, visual }
  }

  getBacklog(): BacklogEntry[] {
    return this.#backlog.map(entry => ({ ...entry }))
  }

  getUnlocks(): PlayerUnlockState {
    return this.#unlockStore.load()
  }

  unlock(kind: UnlockKind, id: string): PlayerUnlockState {
    const next = this.#unlockStore.unlock(kind, id)
    this.#bus.emit('engine:unlocks', { unlocks: next, kind, id })
    return next
  }

  unlockGallery(id: string): PlayerUnlockState {
    return this.unlock('gallery', id)
  }

  unlockMusic(id: string): PlayerUnlockState {
    return this.unlock('music', id)
  }

  unlockReplay(id: string): PlayerUnlockState {
    return this.unlock('replay', id)
  }

  getGalleryItems(): GalleryItem[] {
    return Object.entries(this.#data.gallery).map(([id, data]) => normalizeGalleryItem(id, data))
  }

  getMusicTracks(): MusicRoomTrack[] {
    const source = Object.keys(this.#data.music).length > 0 ? this.#data.music : this.#data.audio
    return Object.entries(source).map(([id, data]) => normalizeMusicTrack(id, data))
  }

  getReplayScenes(): ReplayScene[] {
    return Object.entries(this.#data.replay).map(([id, data]) => normalizeReplayScene(id, data))
  }

  getDiagnosticsSnapshot(): RuntimeDiagnosticsSnapshot {
    return {
      state: this.#state,
      scene: {
        id: this.#currentSceneId,
        variant: this.#currentSceneVariant,
      },
      variables: this.#vars.snapshot(),
      characters: Array.from(this.#currentCharacters.values()).map(character => ({ ...character })),
      audio: { ...this.#currentAudio },
      plugins: this.#pluginRegistry.list().map(record => ({
        id: record.manifest.id,
        name: record.manifest.name,
        version: record.manifest.version,
        active: record.active,
        capabilities: [...record.manifest.capabilities],
        renderers: normalizeRendererDiagnostics(record.manifest.renderers),
        tags: [...(record.manifest.tags ?? [])],
      })),
      renderers: createPluginContext(this, this.#bus, './assets/', this.#tagRegistry).rendererRegistry.list().map(renderer => ({
        kind: renderer.kind,
        type: renderer.type,
        ...(renderer.pluginId ? { pluginId: renderer.pluginId } : {}),
      })),
    }
  }

  clearBacklog(): void {
    this.#backlog = []
    this.#bus.emit('engine:backlog', { entries: this.getBacklog() })
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

  /** Boots data, story and runtime services for manually constructed engines. */
  async boot(): Promise<void> {
    if (this.#booted) return
    this.#booted = true
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
    this.#unlockStore = new PlayerUnlocks(this.#config.id)
    this.#assetLoader = new AssetLoader()
    this.#loadSeenDialogKeys()

    const minigames = this.#config.minigames ?? {}
    for (const [id, loader] of Object.entries(minigames)) {
      this.#minigameRegistry.register(id, loader)
    }

    await this.#loadPlugins()

    await this.#loadData()

    this.#locale = this.#config.story.defaultLocale
    const storyPath = this.#config.story.locales[this.#locale]
    if (!storyPath) throw new Error(`[GameEngine] No story path for locale "${this.#locale}"`)
    await this.#runner.load(storyPath)
  }

  async #loadPlugins(): Promise<void> {
    for (const descriptor of this.#config.plugins ?? []) {
      const { manifest, module } = await loadPluginDescriptor(descriptor)
      this.#pluginRegistry.register(manifest, module)
    }
    await this.#pluginRegistry.setupAll(createPluginContext(this, this.#bus, './assets/', this.#tagRegistry))
  }

  async dispose(): Promise<void> {
    await this.#pluginRegistry.disposeAll()
  }

  async #loadData(): Promise<void> {
    const {
      characters: charDir,
      scenes: scenesDir,
      audio: audioDir,
      minigames: minigamesDir,
      gallery: galleryDir,
      music: musicDir,
      replay: replayDir,
    } = this.#config.data ?? {}

    await Promise.allSettled([
      this.#loadDataDir(charDir, 'characters'),
      this.#loadDataDir(scenesDir, 'scenes'),
      this.#loadDataDir(audioDir, 'audio'),
      this.#loadDataDir(minigamesDir, 'minigames'),
      this.#loadDataDir(galleryDir, 'gallery'),
      this.#loadDataDir(musicDir, 'music'),
      this.#loadDataDir(replayDir, 'replay'),
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
        ...this.#recordBacklog(step.text, displayName, nameColor),
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
        case 'sprite':
          this.#trackSprite(tag)
          this.#bus.emit('engine:character', this.#characterPayloadFromState(tag.id ?? ''))
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
        case 'unlock':
        case 'unlock_gallery':
        case 'unlock_music':
        case 'unlock_replay':
          this.#processUnlockTag(tag)
          break
        case 'speaker':
          break
        case 'volume':
          break
        default:
          if (!await this.#tagRegistry.dispatch(tag, { engine: this, eventBus: this.#bus })) {
            this.#bus.emit('engine:tag:unknown', { tag })
          }
      }
    }
  }

  #processUnlockTag(tag: TagCommand): void {
    const kind = normalizeUnlockKind(tag.type === 'unlock' ? tag['kind'] ?? tag['category'] : tag.type.replace(/^unlock_/, ''))
    const id = typeof tag.id === 'string' ? tag.id : undefined
    if (!kind || !id) return
    this.unlock(kind, id)
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

  #dialogSeenKey(text: string, speaker?: string | null): string {
    return `${speaker ?? ''}\n${text}`
  }

  #recordBacklog(text: string, speaker?: string | null, nameColor?: string | null): { backlogIndex: number; seenBefore: boolean } {
    const key = this.#dialogSeenKey(text, speaker)
    const seenBefore = this.#seenDialogKeys.has(key)
    this.#seenDialogKeys.add(key)
    const voice = this.#currentVoiceForDialog ? { ...this.#currentVoiceForDialog } : null
    const entry: BacklogEntry = {
      index: ++this.#backlogIndex,
      text,
      ...(speaker ? { speaker } : {}),
      ...(nameColor ? { nameColor } : {}),
      ...(voice ? { voice } : {}),
      timestamp: Date.now(),
    }
    this.#currentVoiceForDialog = null
    this.#backlog.push(entry)
    this.#bus.emit('engine:backlog', { entries: this.getBacklog() })
    this.#persistSeenDialogKeys()
    return { backlogIndex: entry.index, seenBefore }
  }

  #emitAudioTag(channel: keyof SavedAudioState, tag: TagCommand): void {
    const payload = this.#withAudioData(tag)
    if (payload.id === 'stop') {
      delete this.#currentAudio[channel]
      if (channel === 'voice') this.#currentVoiceForDialog = null
    } else {
      this.#currentAudio[channel] = payload
      if (channel === 'voice') this.#currentVoiceForDialog = { ...payload }
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
    const animation = typeof tag['animation'] === 'string'
      ? tag['animation']
      : typeof tag['expression'] === 'string'
        ? tag['expression']
        : previous?.animation ?? defaultAnimation(data)
    const sheet = typeof tag['sheet'] === 'string'
      ? tag['sheet']
      : previous?.sheet ?? defaultSheet(data, animation)

    this.#currentCharacters.set(id, { id, position, sheet, animation })
  }

  #trackSprite(tag: TagCommand): void {
    const id = tag.id
    if (!id) return
    const previous = this.#currentCharacters.get(id)
    const data = this.#data.characters[id] ?? {}
    const position = previous?.position ?? (typeof data['defaultPosition'] === 'string' ? data['defaultPosition'] : 'center')
    const animation = typeof tag['animation'] === 'string'
      ? tag['animation']
      : typeof tag['expression'] === 'string'
        ? tag['expression']
        : previous?.animation ?? defaultAnimation(data)
    const sheet = typeof tag['sheet'] === 'string' ? tag['sheet'] : previous?.sheet ?? defaultSheet(data, animation)
    this.#currentCharacters.set(id, { id, position, sheet, animation })
  }

  #characterPayloadFromState(id: string): TagCommand {
    const state = this.#currentCharacters.get(id)
    return state ? { type: 'character', ...state } : { type: 'character', id }
  }

  #restoreVisualState(visual: SavedVisualState | undefined): void {
    if (!visual) return

    this.#locale = visual.locale
    this.#currentCharacters.clear()
    this.#currentAudio = {}
    this.#backlog = visual.backlog?.map(entry => ({ ...entry })) ?? []
    this.#backlogIndex = this.#backlog.reduce((max, entry) => Math.max(max, entry.index), 0)
    for (const entry of this.#backlog) this.#seenDialogKeys.add(this.#dialogSeenKey(entry.text, entry.speaker))
    this.#bus.emit('engine:backlog', { entries: this.getBacklog() })

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

  #seenStorageKey(): string {
    return `vn:${this.#config.id}:seen-dialog`
  }

  #loadSeenDialogKeys(): void {
    try {
      const raw = localStorage.getItem(this.#seenStorageKey())
      if (!raw) return
      const values = JSON.parse(raw) as unknown
      if (Array.isArray(values)) this.#seenDialogKeys = new Set(values.map(String))
    } catch { /* non-fatal */ }
  }

  #persistSeenDialogKeys(): void {
    try {
      localStorage.setItem(this.#seenStorageKey(), JSON.stringify(Array.from(this.#seenDialogKeys)))
    } catch { /* non-fatal */ }
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

function readString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function normalizeRendererDiagnostics(renderers: VnPluginRendererDeclarations | undefined): Record<string, string[]> {
  if (!renderers) return {}
  return Object.fromEntries(Object.entries(renderers).map(([kind, values]) => [kind, [...values]]))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function hasMappedAnimation(sheet: unknown, key: string, field: 'actions' | 'sprites'): boolean {
  const mapping = asRecord(asRecord(sheet)?.[field])
  return Boolean(mapping?.[key]) || Object.keys(mapping ?? {}).length > 0
}

function defaultSheet(data: Record<string, unknown>, animationName: string): string {
  const animation = data['animation']
  if (typeof animation !== 'object' || animation === null || Array.isArray(animation)) return 'Main'
  const record = animation as Record<string, unknown>
  const animationSheets = asRecord(record['animationSheets']) ?? {}
  const defaultAnimationSheet = typeof record['defaultAnimationSheet'] === 'string' ? record['defaultAnimationSheet'] : 'Main'
  const selectedAnimationSheet = animationSheets[defaultAnimationSheet] ?? animationSheets['Main'] ?? Object.values(animationSheets)[0]
  if (selectedAnimationSheet && hasMappedAnimation(selectedAnimationSheet, animationName, 'actions')) return defaultAnimationSheet
  return typeof record['defaultStateSheet'] === 'string' ? record['defaultStateSheet'] : 'Main'
}

function defaultAnimation(data: Record<string, unknown>): string {
  const animation = data['animation']
  if (typeof animation !== 'object' || animation === null || Array.isArray(animation)) return 'neutral'
  const record = animation as Record<string, unknown>
  if (typeof record['defaultState'] === 'string') return record['defaultState']
  if (typeof record['defaultAction'] === 'string') return record['defaultAction']
  return typeof data['defaultExpression'] === 'string' ? data['defaultExpression'] : 'neutral'
}

function normalizeGalleryItem(id: string, data: Record<string, unknown>): GalleryItem {
  const itemId = readString(data, 'id') ?? id
  const item: GalleryItem = {
    id: itemId,
    image: readString(data, 'image') ?? readString(data, 'file') ?? '',
  }
  const title = readString(data, 'title')
  const thumbnail = readString(data, 'thumbnail')
  const description = readString(data, 'description')
  if (title) item.title = title
  if (thumbnail) item.thumbnail = thumbnail
  if (description) item.description = description
  return item
}

function normalizeMusicTrack(id: string, data: Record<string, unknown>): MusicRoomTrack {
  const itemId = readString(data, 'id') ?? id
  const loop = typeof data['loop'] === 'boolean' ? data['loop'] : undefined
  const volume = typeof data['volume'] === 'number' ? data['volume'] : undefined
  const item: MusicRoomTrack = {
    id: itemId,
  }
  const title = readString(data, 'title')
  const file = readString(data, 'file')
  const description = readString(data, 'description')
  if (title) item.title = title
  if (file) item.file = file
  if (description) item.description = description
  if (loop !== undefined) item.loop = loop
  if (volume !== undefined) item.volume = volume
  return item
}

function normalizeReplayScene(id: string, data: Record<string, unknown>): ReplayScene {
  const itemId = readString(data, 'id') ?? id
  const item: ReplayScene = {
    id: itemId,
  }
  const title = readString(data, 'title')
  const sceneId = readString(data, 'sceneId')
  const storyPath = readString(data, 'storyPath')
  const thumbnail = readString(data, 'thumbnail')
  const description = readString(data, 'description')
  if (title) item.title = title
  if (sceneId) item.sceneId = sceneId
  if (storyPath) item.storyPath = storyPath
  if (thumbnail) item.thumbnail = thumbnail
  if (description) item.description = description
  return item
}

function normalizeUnlockKind(value: unknown): UnlockKind | null {
  if (value === 'gallery' || value === 'music' || value === 'replay') return value
  return null
}
