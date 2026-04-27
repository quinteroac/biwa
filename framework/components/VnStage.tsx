import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VnBackground } from './VnBackground.tsx'
import { VnCharacter } from './VnCharacter.tsx'
import { VnDialog } from './VnDialog.tsx'
import { VnChoices } from './VnChoices.tsx'
import { VnTransition } from './VnTransition.tsx'
import { VnSaveMenu } from './VnSaveMenu.tsx'
import { VnVolumeControl } from './VnVolumeControl.tsx'
import { VnBacklog } from './VnBacklog.tsx'
import { VnSettings } from './VnSettings.tsx'
import { SaveControlsBar } from './SaveControlsBar.tsx'
import { getStageAdvanceAction } from './VnStageAdvance.ts'
import { getAutoDelayMs, getAutoModeAction, getSkipModeAction } from './VnPlayerModes.ts'
import { mergePlayerInputMap, resolveKeyboardAction } from './VnInputMap.ts'
import { PlayerPreferences } from '../player/PlayerPreferences.ts'
import { AudioManager } from '../engine/AudioManager.ts'
import type { AudioPlaybackData } from '../engine/AudioManager.ts'
import type { GameEngine } from '../engine/GameEngine.ts'
import type { BacklogEntry, GameSaveState } from '../types/save.d.ts'
import type { DialogOptions, VnDialogHandle } from './VnDialog.tsx'
import type { StepChoice } from '../engine/ScriptRunner.ts'
import type { PlayerInputMap } from './VnInputMap.ts'
import type { PlayerPreferencesPatch, PlayerPreferencesState } from '../player/PlayerPreferences.ts'

export interface CharacterState {
  id: string
  charData: Record<string, unknown> | null
  position: 'left' | 'center' | 'right'
  expression: string
  exiting: boolean
}

export interface SceneState {
  id: string
  data: Record<string, unknown>
  variant?: string
}

export interface TransitionState {
  config: Record<string, unknown>
  done: () => void
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500&display=swap');

  @keyframes vn-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
`

interface PlayerFeatureEngine {
  id?: string
  getBacklog?: () => BacklogEntry[]
  clearBacklog?: () => void
}

function getPlayerFeatureEngine(engine: GameEngine): PlayerFeatureEngine {
  return engine as PlayerFeatureEngine
}

function getEngineStorageId(engine: GameEngine): string {
  return getPlayerFeatureEngine(engine).id ?? 'default'
}

function getEngineBacklog(engine: GameEngine): BacklogEntry[] {
  return getPlayerFeatureEngine(engine).getBacklog?.() ?? []
}

function clearEngineBacklog(engine: GameEngine): void {
  getPlayerFeatureEngine(engine).clearBacklog?.()
}

/**
 * Props accepted by {@link VnStage}.
 */
export interface VnStageProps {
  /** The game engine instance to drive this stage. */
  engine: GameEngine

  /**
   * When `true` (default), the "Save / Load" slot-menu button is shown in
   * the controls bar. Set to `false` to remove it from the DOM entirely.
   */
  showSlotMenu?: boolean

  /**
   * When `true` (default), the "Quick Save" button is shown in the controls
   * bar. Set to `false` to remove it from the DOM entirely.
   */
  showQuickSave?: boolean

  /**
   * When `true` (default), the "Auto Save" toggle is shown in the controls
   * bar. Set to `false` to remove it from the DOM entirely.
   */
  showAutoSave?: boolean

  /**
   * When provided, the stage resumes from this saved game state instead of
   * calling `engine.start()`. Used by the "Continue" flow in {@link VnApp}.
   */
  resumeFrom?: GameSaveState

  /**
   * Optional keyboard map for player actions. Omitted actions use defaults.
   */
  inputMap?: Partial<PlayerInputMap>

  /**
   * Optional component overrides for games that need a custom shell without
   * forking the stage orchestration. Omitted slots use the framework defaults.
   */
  components?: VnStageComponents
}

export interface VnStageComponents {
  Background?: typeof VnBackground
  Character?: typeof VnCharacter
  Dialog?: typeof VnDialog
  Choices?: typeof VnChoices
  Transition?: typeof VnTransition
  SaveMenu?: typeof VnSaveMenu
  SaveControls?: typeof SaveControlsBar
  VolumeControl?: typeof VnVolumeControl
  Backlog?: typeof VnBacklog
  Settings?: typeof VnSettings
}

export function VnStage({ engine, showSlotMenu = true, showQuickSave = true, showAutoSave = true, resumeFrom, inputMap, components = {} }: VnStageProps) {
  const BackgroundComponent = components.Background ?? VnBackground
  const CharacterComponent = components.Character ?? VnCharacter
  const DialogComponent = components.Dialog ?? VnDialog
  const ChoicesComponent = components.Choices ?? VnChoices
  const TransitionComponent = components.Transition ?? VnTransition
  const SaveMenuComponent = components.SaveMenu ?? VnSaveMenu
  const SaveControlsComponent = components.SaveControls ?? SaveControlsBar
  const VolumeControlComponent = components.VolumeControl ?? VnVolumeControl
  const BacklogComponent = components.Backlog ?? VnBacklog
  const SettingsComponent = components.Settings ?? VnSettings
  const engineStorageId = getEngineStorageId(engine)
  const preferencesStore = useMemo(() => new PlayerPreferences(engineStorageId), [engineStorageId])
  const resolvedInputMap = useMemo(() => mergePlayerInputMap(inputMap), [inputMap])
  const [menuOpen, setMenuOpen] = useState(false)
  const [audioOpen, setAudioOpen] = useState(false)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [preferences, setPreferences] = useState<PlayerPreferencesState>(() => preferencesStore.load())
  const [scene, setScene]           = useState<SceneState | null>(null)
  const [characters, setCharacters] = useState<Map<string, CharacterState>>(new Map())
  const [dialog, setDialog]         = useState<DialogOptions | null>(null)
  const [backlog, setBacklog]       = useState<BacklogEntry[]>(() => getEngineBacklog(engine))
  const [choices, setChoices]       = useState<StepChoice[] | null>(null)
  const [transition, setTransition] = useState<TransitionState | null>(null)
  const dialogRef = useRef<VnDialogHandle>(null)
  const audioRef  = useRef(new AudioManager())

  const updatePreferences = useCallback((patch: PlayerPreferencesPatch) => {
    setPreferences(prev => {
      const next = { ...prev, ...patch }
      preferencesStore.save(next)
      return next
    })
  }, [preferencesStore])

  const resetPreferences = useCallback(() => {
    setPreferences(preferencesStore.reset())
  }, [preferencesStore])

  useEffect(() => {
    setPreferences(preferencesStore.load())
  }, [preferencesStore])

  useEffect(() => {
    const bus   = engine.bus
    const audio = audioRef.current

    const unsubs = [
      bus.on<{ id: string; data: Record<string, unknown>; variant?: string }>('engine:scene', ({ id, data, variant }) => {
        setScene({ id, data, ...(variant !== undefined ? { variant } : {}) })
        const ambSfx = (data?.['ambient'] as Record<string, unknown> | undefined)?.['sfx'] as string | undefined
        if (ambSfx) audio.playAmbience(ambSfx, null)
      }),

      bus.on<{ id: string; position?: string; expression?: string; exit?: boolean }>('engine:character', ({ id, position, expression, exit: shouldExit }) => {
        setCharacters(prev => {
          const next = new Map(prev)
          if (shouldExit) {
            const char = next.get(id)
            if (char) next.set(id, { ...char, exiting: true })
            return next
          }
          const charData = (engine.data?.characters?.[id.toLowerCase()] as Record<string, unknown>) ?? null
          const existing = next.get(id)
          const defaultPosition = charData?.['defaultPosition'] as 'left' | 'center' | 'right' | undefined
          const defaultExpression = charData?.['defaultExpression'] as string | undefined
          next.set(id, {
            id,
            charData: charData ?? existing?.charData ?? null,
            position: (position ?? existing?.position ?? defaultPosition ?? 'center') as 'left' | 'center' | 'right',
            expression: expression ?? existing?.expression ?? defaultExpression ?? 'neutral',
            exiting: false,
          })
          return next
        })
      }),

      bus.on<DialogOptions>('engine:dialog', opts => {
        setChoices(null)
        setDialog(opts)
      }),

      bus.on<{ entries: BacklogEntry[] }>('engine:backlog', ({ entries }) => {
        setBacklog(entries)
      }),

      bus.on<{ choices: StepChoice[] }>('engine:choices', ({ choices }) => {
        setChoices(choices)
      }),

      bus.on<{ config: Record<string, unknown>; done: () => void }>('engine:transition', ({ config, done }) => {
        setTransition({ config, done })
      }),

      bus.on<{ id: string } & Record<string, unknown>>('engine:bgm',      ({ id, ...data }) => audio.playBgm(id, data as AudioPlaybackData)),
      bus.on<{ id: string } & Record<string, unknown>>('engine:sfx',      ({ id, ...data }) => audio.playSfx(id, data as AudioPlaybackData)),
      bus.on<{ id: string } & Record<string, unknown>>('engine:ambience', ({ id, ...data }) => audio.playAmbience(id, data as AudioPlaybackData)),
      bus.on<{ id: string } & Record<string, unknown>>('engine:voice',    ({ id, ...data }) => audio.playVoice(id, data as AudioPlaybackData)),
    ]

    if (resumeFrom) {
      engine.restoreState(resumeFrom)
    } else {
      engine.start()
    }

    return () => {
      audio.stopAll()
      unsubs.forEach(fn => fn())
    }
  }, [engine, resumeFrom])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const action = resolveKeyboardAction(e.key, resolvedInputMap)
      if (!action) return

      if (action === 'advance') {
        const advanceAction = getStageAdvanceAction(choices !== null, dialogRef.current?.isTyping ?? false)
        if (advanceAction === 'ignore') return
        e.preventDefault()
        if (advanceAction === 'reveal') {
          dialogRef.current?.skip()
        } else {
          engine.advance()
        }
        return
      }

      e.preventDefault()
      if (action === 'backlog') {
        setBacklogOpen(open => !open)
      } else if (action === 'auto') {
        updatePreferences({ autoMode: !preferences.autoMode, skipMode: false })
      } else if (action === 'skip') {
        updatePreferences({ skipMode: !preferences.skipMode, autoMode: false })
      } else if (action === 'saveLoad') {
        if (!menuOpen) setMenuOpen(true)
      } else if (action === 'settings') {
        setSettingsOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [engine, choices, menuOpen, preferences.autoMode, preferences.skipMode, resolvedInputMap, updatePreferences])

  const handleStageClick = useCallback(() => {
    const action = getStageAdvanceAction(choices !== null, dialogRef.current?.isTyping ?? false)
    if (action === 'ignore') return
    if (action === 'reveal') {
      dialogRef.current?.skip()
    } else {
      engine.advance()
    }
  }, [engine, choices])

  useEffect(() => {
    if (!preferences.autoMode || !dialog) return
    let scheduled: ReturnType<typeof setTimeout> | null = null
    const interval = setInterval(() => {
      if (scheduled) return
      const action = getAutoModeAction({
        hasDialog: Boolean(dialog),
        hasChoices: choices !== null,
        hasBlockingOverlay: menuOpen || audioOpen || backlogOpen || settingsOpen || transition !== null,
        isTyping: dialogRef.current?.isTyping ?? false,
      })
      if (action !== 'advance') return
      scheduled = setTimeout(() => {
        scheduled = null
        engine.advance()
      }, getAutoDelayMs(dialog.text, preferences.autoBaseDelayMs, preferences.autoPerCharacterDelayMs))
    }, 120)
    return () => {
      clearInterval(interval)
      if (scheduled) clearTimeout(scheduled)
    }
  }, [preferences.autoMode, preferences.autoBaseDelayMs, preferences.autoPerCharacterDelayMs, dialog, choices, menuOpen, audioOpen, backlogOpen, settingsOpen, transition, engine])

  useEffect(() => {
    if (!preferences.skipMode || !dialog) return
    const interval = setInterval(() => {
      const action = getSkipModeAction({
        hasDialog: Boolean(dialog),
        hasChoices: choices !== null,
        hasBlockingOverlay: menuOpen || audioOpen || backlogOpen || settingsOpen || transition !== null,
        isTyping: dialogRef.current?.isTyping ?? false,
        dialogSeenBefore: dialog.seenBefore,
      }, preferences.skipReadOnly)
      if (action === 'stop-skip') {
        updatePreferences({ skipMode: false })
      } else if (action === 'reveal') {
        dialogRef.current?.skip()
      } else if (action === 'advance') {
        engine.advance()
      }
    }, 80)
    return () => clearInterval(interval)
  }, [preferences.skipMode, preferences.skipReadOnly, dialog, choices, menuOpen, audioOpen, backlogOpen, settingsOpen, transition, engine, updatePreferences])

  const handleDialogComplete = useCallback((advanceMode: DialogOptions['advanceMode']) => {
    if (advanceMode === 'next') {
      engine.advance()
    }
  }, [engine])

  const handleChoose = useCallback((index: number) => {
    setChoices(null)
    engine.choose(index)
  }, [engine])

  const handleCharacterExited = useCallback((id: string) => {
    setCharacters(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const playerControls = (
    <div style={playerControlsStyle} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Open dialog backlog"
        aria-pressed={backlogOpen}
        onClick={() => setBacklogOpen(true)}
        style={getPlayerButtonStyle(backlogOpen)}
      >
        Log
      </button>
      <button
        type="button"
        aria-label="Toggle auto mode"
        aria-pressed={preferences.autoMode}
        onClick={() => {
          updatePreferences({ autoMode: !preferences.autoMode, skipMode: false })
        }}
        style={getPlayerButtonStyle(preferences.autoMode)}
        title={preferences.autoMode ? 'Auto mode on' : 'Auto mode off'}
      >
        Auto
      </button>
      <button
        type="button"
        aria-label="Toggle skip mode"
        aria-pressed={preferences.skipMode}
        onClick={() => {
          updatePreferences({ skipMode: !preferences.skipMode, autoMode: false })
        }}
        style={getPlayerButtonStyle(preferences.skipMode)}
        title={preferences.skipMode ? 'Skip mode on' : 'Skip mode off'}
      >
        Skip
      </button>
      <button
        type="button"
        aria-label="Toggle read-only skip"
        aria-pressed={preferences.skipReadOnly}
        onClick={() => updatePreferences({ skipReadOnly: !preferences.skipReadOnly })}
        style={getPlayerButtonStyle(preferences.skipReadOnly)}
        title={preferences.skipReadOnly ? 'Read-only skip on' : 'Read-only skip off'}
      >
        Read
      </button>
      <button
        type="button"
        aria-label="Open player settings"
        aria-pressed={settingsOpen}
        onClick={() => setSettingsOpen(true)}
        style={getPlayerButtonStyle(settingsOpen)}
      >
        Settings
      </button>
    </div>
  )

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div
        onClick={handleStageClick}
        style={{
          position: 'fixed', inset: 0, overflow: 'hidden',
          background: 'var(--vn-stage-bg, #131313)', cursor: 'pointer', userSelect: 'none',
          fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
        }}
      >
        <BackgroundComponent scene={scene as Parameters<typeof VnBackground>[0]['scene']} />

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[...characters.values()].map(char => (
            <CharacterComponent
              key={char.id}
              id={char.id}
              charData={char.charData as Parameters<typeof VnCharacter>[0]['charData']}
              position={char.position}
              expression={char.expression}
              exiting={char.exiting}
              onExited={handleCharacterExited}
            />
          ))}
        </div>

        <SaveMenuComponent
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          saveManager={engine.saveManager}
          getState={() => engine.getState()}
          onLoad={(state) => {
            engine.restoreState(state)
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 340,
            maxWidth: 'calc(100vw - 40px)',
            zIndex: 90,
            pointerEvents: 'auto',
            fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-expanded={audioOpen}
            aria-controls="vn-audio-controls"
            onClick={() => setAudioOpen(open => !open)}
            style={{
              display: 'block',
              marginLeft: 'auto',
              height: 32,
              padding: '0 14px',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.24)',
              borderRadius: 0,
              color: 'rgba(229,226,225,0.78)',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Audio
          </button>
          {audioOpen && (
            <div
              id="vn-audio-controls"
              style={{
                marginTop: 8,
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.72)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 18px 48px rgba(0,0,0,0.35)',
              }}
            >
              <VolumeControlComponent
                volumes={audioRef.current.getVolumes()}
                onVolumeChange={(channel, volume) => audioRef.current.setVolume(channel, volume)}
              />
            </div>
          )}
        </div>

        <BacklogComponent
          isOpen={backlogOpen}
          entries={backlog}
          onClose={() => setBacklogOpen(false)}
          onClear={() => clearEngineBacklog(engine)}
        />

        <SettingsComponent
          isOpen={settingsOpen}
          preferences={preferences}
          onChange={updatePreferences}
          onReset={resetPreferences}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Bottom panel: dialog box stacked above the controls bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'none',
        }}>
          <DialogComponent
            ref={dialogRef}
            dialog={dialog}
            onComplete={handleDialogComplete}
            textSpeedMs={preferences.textSpeedMs}
            textScale={preferences.textScale}
            highContrast={preferences.highContrast}
            reduceMotion={preferences.reduceMotion}
          />
          {dialog && (
            <SaveControlsComponent
              saveManager={engine.saveManager}
              getState={() => engine.getState()}
              onOpenMenu={() => setMenuOpen(true)}
              showSlotMenu={showSlotMenu}
              showQuickSave={showQuickSave}
              showAutoSave={showAutoSave}
              leadingControls={playerControls}
              eventBus={engine.bus}
            />
          )}
        </div>

        {choices && (
          <ChoicesComponent choices={choices} onChoose={handleChoose} />
        )}

        {transition && (
          <TransitionComponent
            config={transition.config as Parameters<typeof VnTransition>[0]['config']}
            onDone={() => {
              const done = transition.done
              setTransition(null)
              done()
            }}
          />
        )}
      </div>
    </>
  )
}

const playerButtonStyle = {
  height: 28,
  padding: '0 10px',
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.24)',
  borderRadius: 0,
  color: 'rgba(229,226,225,0.78)',
  fontFamily: 'inherit',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
}

const playerControlsStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  pointerEvents: 'auto' as const,
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
}

function getPlayerButtonStyle(active: boolean) {
  if (!active) return playerButtonStyle
  return {
    ...playerButtonStyle,
    background: 'rgba(229,226,225,0.88)',
    border: '1px solid rgba(229,226,225,0.95)',
    color: 'rgba(0,0,0,0.86)',
  }
}
