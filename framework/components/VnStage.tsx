import { useCallback, useEffect, useRef, useState } from 'react'
import { VnBackground } from './VnBackground.tsx'
import { VnCharacter } from './VnCharacter.tsx'
import { VnDialog } from './VnDialog.tsx'
import { VnChoices } from './VnChoices.tsx'
import { VnTransition } from './VnTransition.tsx'
import { VnSaveMenu } from './VnSaveMenu.tsx'
import { SaveControlsBar } from './SaveControlsBar.tsx'
import type { GameEngine } from '../engine/GameEngine.ts'
import type { GameSaveState } from '../types/save.d.ts'
import type { DialogOptions, VnDialogHandle } from './VnDialog.tsx'
import type { StepChoice } from '../engine/ScriptRunner.ts'

class AudioManager {
  #bgm: HTMLAudioElement | null = null
  #bgmId: string | null = null
  #ambience: HTMLAudioElement | null = null
  #ambienceId: string | null = null

  playBgm(id: string, audioData: { file?: string; volume?: number } | null): void {
    if (this.#bgmId === id) return
    this.#stopBgm()
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/bgm/${id}.ogg`
    const audio = new Audio(src)
    audio.volume = audioData?.volume ?? 0.8
    audio.loop = true
    void audio.play().catch(() => {})
    this.#bgm = audio; this.#bgmId = id
  }

  #stopBgm(): void {
    if (!this.#bgm) return
    this.#bgm.pause(); this.#bgm.src = ''
    this.#bgm = null; this.#bgmId = null
  }

  playAmbience(id: string, audioData: { file?: string; volume?: number } | null): void {
    if (this.#ambienceId === id) return
    this.#stopAmbience()
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/ambience/${id}.ogg`
    const audio = new Audio(src)
    audio.volume = audioData?.volume ?? 0.5
    audio.loop = true
    void audio.play().catch(() => {})
    this.#ambience = audio; this.#ambienceId = id
  }

  #stopAmbience(): void {
    if (!this.#ambience) return
    this.#ambience.pause(); this.#ambience.src = ''
    this.#ambience = null; this.#ambienceId = null
  }

  playSfx(id: string, audioData: { file?: string; volume?: number } | null): void {
    const src = audioData?.file ? `./assets/${audioData.file}` : `./assets/audio/sfx/${id}.ogg`
    const audio = new Audio(src)
    audio.volume = audioData?.volume ?? 1.0
    void audio.play().catch(() => {})
  }

  stopAll(): void {
    this.#stopBgm()
    this.#stopAmbience()
  }
}

interface CharacterState {
  id: string
  charData: Record<string, unknown> | null
  position: 'left' | 'center' | 'right'
  expression: string
  exiting: boolean
}

interface SceneState {
  id: string
  data: Record<string, unknown>
}

interface TransitionState {
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
   * When provided, the stage resumes from this saved game state instead of
   * calling `engine.start()`. Used by the "Continue" flow in {@link VnApp}.
   */
  resumeFrom?: GameSaveState
}

export function VnStage({ engine, showSlotMenu = true, showQuickSave = true, showAutoSave = true, resumeFrom }: VnStageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scene, setScene]           = useState<SceneState | null>(null)
  const [characters, setCharacters] = useState<Map<string, CharacterState>>(new Map())
  const [dialog, setDialog]         = useState<DialogOptions | null>(null)
  const [choices, setChoices]       = useState<StepChoice[] | null>(null)
  const [transition, setTransition] = useState<TransitionState | null>(null)
  const dialogRef = useRef<VnDialogHandle>(null)
  const audioRef  = useRef(new AudioManager())

  useEffect(() => {
    const bus   = engine.bus
    const audio = audioRef.current

    const unsubs = [
      bus.on<{ id: string; data: Record<string, unknown> }>('engine:scene', ({ id, data }) => {
        setScene({ id, data })
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
          next.set(id, {
            id,
            charData: charData ?? existing?.charData ?? null,
            position: (position ?? existing?.position ?? 'center') as 'left' | 'center' | 'right',
            expression: expression ?? existing?.expression ?? 'neutral',
            exiting: false,
          })
          return next
        })
      }),

      bus.on<DialogOptions>('engine:dialog', opts => {
        setChoices(null)
        setDialog(opts)
      }),

      bus.on<{ choices: StepChoice[] }>('engine:choices', ({ choices }) => {
        setChoices(choices)
      }),

      bus.on<{ config: Record<string, unknown>; done: () => void }>('engine:transition', ({ config, done }) => {
        setTransition({ config, done })
      }),

      bus.on<{ id: string } & Record<string, unknown>>('engine:bgm',      ({ id, ...data }) => audio.playBgm(id, data as { file?: string; volume?: number })),
      bus.on<{ id: string } & Record<string, unknown>>('engine:sfx',      ({ id, ...data }) => audio.playSfx(id, data as { file?: string; volume?: number })),
      bus.on<{ id: string } & Record<string, unknown>>('engine:ambience', ({ id, ...data }) => audio.playAmbience(id, data as { file?: string; volume?: number })),
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
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowRight') return
      if (choices) return
      e.preventDefault()
      if (dialogRef.current?.isTyping) {
        dialogRef.current.skip()
      } else {
        engine.advance()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [engine, choices])

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
    if (choices) return
    if (dialogRef.current?.isTyping) {
      dialogRef.current.skip()
    } else {
      engine.advance()
    }
  }, [engine, choices])

  const handleDialogComplete = useCallback((advanceMode: DialogOptions['advanceMode']) => {
    if (advanceMode === 'next' || advanceMode === 'choices') {
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
        <VnBackground scene={scene as Parameters<typeof VnBackground>[0]['scene']} />

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[...characters.values()].map(char => (
            <VnCharacter
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

        <VnSaveMenu
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          saveManager={engine.saveManager}
          getState={() => engine.getState()}
          onLoad={(state) => {
            engine.restoreState(state)
          }}
        />

        {/* Bottom panel: dialog box stacked above the controls bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'none',
        }}>
          <VnDialog ref={dialogRef} dialog={dialog} onComplete={handleDialogComplete} />
          {dialog && (
            <SaveControlsBar
              saveManager={engine.saveManager}
              getState={() => engine.getState()}
              onOpenMenu={() => setMenuOpen(true)}
              showSlotMenu={showSlotMenu}
              showQuickSave={showQuickSave}
              showAutoSave={showAutoSave}
              eventBus={engine.bus}
            />
          )}
        </div>

        {choices && (
          <VnChoices choices={choices} onChoose={handleChoose} />
        )}

        {transition && (
          <VnTransition
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
