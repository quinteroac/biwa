import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { VnStage } from './VnStage.tsx'
import { VnStartMenu } from './VnStartMenu.tsx'
import { VnEndScreen } from './VnEndScreen.tsx'
import type { GameEngine } from '../engine/GameEngine.ts'
import type { GameSaveState } from '../types/save.d.ts'

interface VnAppProps {
  engine: GameEngine
  showNewGame?: boolean
  showContinue?: boolean
}

interface EndScreenPayload {
  title?: string
  message?: string
}

/**
 * Root application component.
 *
 * Renders {@link VnStartMenu} first. VnStage (and therefore engine.start())
 * is mounted only after the player picks an action from the start menu.
 * When the engine emits `"end_screen"`, VnStage is replaced with
 * {@link VnEndScreen}.
 */
function VnApp({ engine, showNewGame, showContinue }: VnAppProps) {
  const [started, setStarted] = useState(false)
  const [resumeSave, setResumeSave] = useState<GameSaveState | null>(null)
  const [endScreen, setEndScreen] = useState<EndScreenPayload | null>(null)

  const hasSaves = engine.saveManager.listSlots().length > 0

  useEffect(() => {
    return engine.bus.on<EndScreenPayload>('end_screen', payload => {
      setEndScreen(payload ?? {})
    })
  }, [engine])

  const handleStart = useCallback(() => {
    setResumeSave(null)
    setStarted(true)
  }, [])

  const handleContinue = useCallback(() => {
    const slots = engine.saveManager.listSlots()
    if (slots.length === 0) return
    const mostRecent = slots.reduce((prev, curr) =>
      curr.meta.timestamp > prev.meta.timestamp ? curr : prev
    )
    const loaded = engine.saveManager.load(mostRecent.slot)
    if (!loaded) return
    setResumeSave(loaded.state)
    setStarted(true)
  }, [engine])

  if (endScreen !== null) {
    return <VnEndScreen title={endScreen.title} message={endScreen.message} />
  }

  if (!started) {
    return (
      <VnStartMenu
        title={engine.title}
        onStart={handleStart}
        hasSaves={hasSaves}
        onContinue={handleContinue}
        showNewGame={showNewGame}
        showContinue={showContinue}
      />
    )
  }

  return <VnStage engine={engine} resumeFrom={resumeSave ?? undefined} />
}

/**
 * Mount the visual-novel application into the given DOM container.
 *
 * @param engine - Initialised GameEngine instance.
 * @param container - DOM element to render into.
 * @param options - Optional display configuration for the start menu.
 * @param options.showNewGame - When `false`, hides the "New Game" button. Defaults to `true`.
 * @param options.showContinue - When `false`, hides the "Continue" button. Defaults to `true`.
 * @returns The React root so the caller can unmount if needed.
 */
export function mountVnApp(
  engine: GameEngine,
  container: Element,
  options?: { showNewGame?: boolean; showContinue?: boolean },
): ReturnType<typeof createRoot> {
  const root = createRoot(container)
  root.render(<VnApp engine={engine} showNewGame={options?.showNewGame} showContinue={options?.showContinue} />)
  return root
}

