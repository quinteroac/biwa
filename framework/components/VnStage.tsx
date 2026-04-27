import { useCallback, useEffect, useRef, useState } from 'react'
import { VnBackground } from './VnBackground.tsx'
import { VnCharacter } from './VnCharacter.tsx'
import { VnDialog } from './VnDialog.tsx'
import { VnChoices } from './VnChoices.tsx'
import { VnTransition } from './VnTransition.tsx'
import { VnSaveMenu } from './VnSaveMenu.tsx'
import { VnVolumeControl } from './VnVolumeControl.tsx'
import { VnBacklog } from './VnBacklog.tsx'
import { SaveControlsBar } from './SaveControlsBar.tsx'
import { getStageAdvanceAction, isAcceptedAdvanceKey } from './VnStageAdvance.ts'
import { getAutoDelayMs, getAutoModeAction, getSkipModeAction } from './VnPlayerModes.ts'
import { AudioManager } from '../engine/AudioManager.ts'
import type { AudioPlaybackData } from '../engine/AudioManager.ts'
import type { GameEngine } from '../engine/GameEngine.ts'
import type { BacklogEntry, GameSaveState } from '../types/save.d.ts'
import type { DialogOptions, VnDialogHandle } from './VnDialog.tsx'
import type { StepChoice } from '../engine/ScriptRunner.ts'

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

function readStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

function writeStoredBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch { /* non-fatal */ }
}

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
}

export function VnStage({ engine, showSlotMenu = true, showQuickSave = true, showAutoSave = true, resumeFrom, components = {} }: VnStageProps) {
  const BackgroundComponent = components.Background ?? VnBackground
  const CharacterComponent = components.Character ?? VnCharacter
  const DialogComponent = components.Dialog ?? VnDialog
  const ChoicesComponent = components.Choices ?? VnChoices
  const TransitionComponent = components.Transition ?? VnTransition
  const SaveMenuComponent = components.SaveMenu ?? VnSaveMenu
  const SaveControlsComponent = components.SaveControls ?? SaveControlsBar
  const VolumeControlComponent = components.VolumeControl ?? VnVolumeControl
  const BacklogComponent = components.Backlog ?? VnBacklog
  const engineStorageId = getEngineStorageId(engine)
  const [menuOpen, setMenuOpen] = useState(false)
  const [audioOpen, setAudioOpen] = useState(false)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [autoMode, setAutoMode] = useState(() => readStoredBoolean(`vn:${engineStorageId}:player:auto`, false))
  const [skipMode, setSkipMode] = useState(() => readStoredBoolean(`vn:${engineStorageId}:player:skip`, false))
  const [skipReadOnly, setSkipReadOnly] = useState(() => readStoredBoolean(`vn:${engineStorageId}:player:skip-read-only`, true))
  const [scene, setScene]           = useState<SceneState | null>(null)
  const [characters, setCharacters] = useState<Map<string, CharacterState>>(new Map())
  const [dialog, setDialog]         = useState<DialogOptions | null>(null)
  const [backlog, setBacklog]       = useState<BacklogEntry[]>(() => getEngineBacklog(engine))
  const [choices, setChoices]       = useState<StepChoice[] | null>(null)
  const [transition, setTransition] = useState<TransitionState | null>(null)
  const dialogRef = useRef<VnDialogHandle>(null)
  const audioRef  = useRef(new AudioManager())

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
    writeStoredBoolean(`vn:${engineStorageId}:player:auto`, autoMode)
  }, [engineStorageId, autoMode])

  useEffect(() => {
    writeStoredBoolean(`vn:${engineStorageId}:player:skip`, skipMode)
  }, [engineStorageId, skipMode])

  useEffect(() => {
    writeStoredBoolean(`vn:${engineStorageId}:player:skip-read-only`, skipReadOnly)
  }, [engineStorageId, skipReadOnly])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isAcceptedAdvanceKey(e.key)) return
      const action = getStageAdvanceAction(choices !== null, dialogRef.current?.isTyping ?? false)
      if (action === 'ignore') return
      e.preventDefault()
      if (action === 'reveal') {
        dialogRef.current?.skip()
      } else {
        engine.advance()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [engine, choices])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setBacklogOpen(open => !open)
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        setAutoMode(value => !value)
        setSkipMode(false)
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setSkipMode(value => !value)
        setAutoMode(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Open save menu with Escape when it's closed (avoid interfering when menu is open).
  useEffect(() => {
    if (menuOpen) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(true)
      }
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [menuOpen])

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
    if (!autoMode || !dialog) return
    let scheduled: ReturnType<typeof setTimeout> | null = null
    const interval = setInterval(() => {
      if (scheduled) return
      const action = getAutoModeAction({
        hasDialog: Boolean(dialog),
        hasChoices: choices !== null,
        hasBlockingOverlay: menuOpen || audioOpen || backlogOpen || transition !== null,
        isTyping: dialogRef.current?.isTyping ?? false,
      })
      if (action !== 'advance') return
      scheduled = setTimeout(() => {
        scheduled = null
        engine.advance()
      }, getAutoDelayMs(dialog.text))
    }, 120)
    return () => {
      clearInterval(interval)
      if (scheduled) clearTimeout(scheduled)
    }
  }, [autoMode, dialog, choices, menuOpen, audioOpen, backlogOpen, transition, engine])

  useEffect(() => {
    if (!skipMode || !dialog) return
    const interval = setInterval(() => {
      const action = getSkipModeAction({
        hasDialog: Boolean(dialog),
        hasChoices: choices !== null,
        hasBlockingOverlay: menuOpen || audioOpen || backlogOpen || transition !== null,
        isTyping: dialogRef.current?.isTyping ?? false,
        dialogSeenBefore: dialog.seenBefore,
      }, skipReadOnly)
      if (action === 'stop-skip') {
        setSkipMode(false)
      } else if (action === 'reveal') {
        dialogRef.current?.skip()
      } else if (action === 'advance') {
        engine.advance()
      }
    }, 80)
    return () => clearInterval(interval)
  }, [skipMode, skipReadOnly, dialog, choices, menuOpen, audioOpen, backlogOpen, transition, engine])

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
        aria-pressed={autoMode}
        onClick={() => {
          setAutoMode(value => !value)
          setSkipMode(false)
        }}
        style={getPlayerButtonStyle(autoMode)}
        title={autoMode ? 'Auto mode on' : 'Auto mode off'}
      >
        Auto
      </button>
      <button
        type="button"
        aria-label="Toggle skip mode"
        aria-pressed={skipMode}
        onClick={() => {
          setSkipMode(value => !value)
          setAutoMode(false)
        }}
        style={getPlayerButtonStyle(skipMode)}
        title={skipMode ? 'Skip mode on' : 'Skip mode off'}
      >
        Skip
      </button>
      <button
        type="button"
        aria-label="Toggle read-only skip"
        aria-pressed={skipReadOnly}
        onClick={() => setSkipReadOnly(value => !value)}
        style={getPlayerButtonStyle(skipReadOnly)}
        title={skipReadOnly ? 'Read-only skip on' : 'Read-only skip off'}
      >
        Read
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

        {/* Bottom panel: dialog box stacked above the controls bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'none',
        }}>
          <DialogComponent ref={dialogRef} dialog={dialog} onComplete={handleDialogComplete} />
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
