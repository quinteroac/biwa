import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { VnStage } from './VnStage.tsx'
import { VnStartMenu } from './VnStartMenu.tsx'
import { VnEndScreen } from './VnEndScreen.tsx'
import type { GameEngine } from '../engine/GameEngine.ts'
import type { GameSaveState } from '../types/save.d.ts'
import type { VnEndScreenProps } from './VnEndScreen.tsx'
import type { VnStageComponents, VnStageProps } from './VnStage.tsx'
import type { VnStartMenuProps } from './VnStartMenu.tsx'
import type { ReactElement } from 'react'

export interface VnAppComponents {
  StartMenu?: (props: VnStartMenuProps) => ReactElement | null
  EndScreen?: (props: VnEndScreenProps) => ReactElement | null
  Stage?: (props: VnStageProps) => ReactElement | null
  stageComponents?: VnStageComponents
}

export interface VnAppOptions {
  showNewGame?: boolean
  showContinue?: boolean
  showSlotMenu?: boolean
  showQuickSave?: boolean
  showAutoSave?: boolean
  components?: VnAppComponents
}

interface VnAppProps {
  engine: GameEngine
  showNewGame?: boolean | undefined
  showContinue?: boolean | undefined
  showSlotMenu?: boolean | undefined
  showQuickSave?: boolean | undefined
  showAutoSave?: boolean | undefined
  components?: VnAppComponents | undefined
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
function VnApp({ engine, showNewGame, showContinue, showSlotMenu, showQuickSave, showAutoSave, components }: VnAppProps) {
  const StartMenuComponent = components?.StartMenu ?? VnStartMenu
  const EndScreenComponent = components?.EndScreen ?? VnEndScreen
  const StageComponent = components?.Stage ?? VnStage
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

  const handleReturnToMenu = useCallback(() => {
    setEndScreen(null)
    setStarted(false)
    setResumeSave(null)
  }, [])

  if (endScreen !== null) {
    return (
      <EndScreenComponent
        {...(endScreen.title !== undefined ? { title: endScreen.title } : {})}
        {...(endScreen.message !== undefined ? { message: endScreen.message } : {})}
        onReturnToMenu={handleReturnToMenu}
      />
    )
  }

  if (!started) {
    return (
      <StartMenuComponent
        title={engine.title}
        onStart={handleStart}
        hasSaves={hasSaves}
        onContinue={handleContinue}
        {...(showNewGame !== undefined ? { showNewGame } : {})}
        {...(showContinue !== undefined ? { showContinue } : {})}
      />
    )
  }

  return (
    <StageComponent
      engine={engine}
      {...(showSlotMenu !== undefined ? { showSlotMenu } : {})}
      {...(showQuickSave !== undefined ? { showQuickSave } : {})}
      {...(showAutoSave !== undefined ? { showAutoSave } : {})}
      {...(resumeSave !== null ? { resumeFrom: resumeSave } : {})}
      {...(components?.stageComponents ? { components: components.stageComponents } : {})}
    />
  )
}

/**
 * Mount the visual-novel application into the given DOM container.
 *
 * @param engine - Initialised GameEngine instance.
 * @param container - DOM element to render into.
 * @param options - Optional display configuration and component overrides.
 * @param options.showNewGame - When `false`, hides the "New Game" button. Defaults to `true`.
 * @param options.showContinue - When `false`, hides the "Continue" button. Defaults to `true`.
 * @returns The React root so the caller can unmount if needed.
 */
export function mountVnApp(
  engine: GameEngine,
  container: Element,
  options?: VnAppOptions,
): ReturnType<typeof createRoot> {
  const root = createRoot(container)
  root.render(
    <VnApp
      engine={engine}
      {...(options?.showNewGame !== undefined ? { showNewGame: options.showNewGame } : {})}
      {...(options?.showContinue !== undefined ? { showContinue: options.showContinue } : {})}
      {...(options?.showSlotMenu !== undefined ? { showSlotMenu: options.showSlotMenu } : {})}
      {...(options?.showQuickSave !== undefined ? { showQuickSave: options.showQuickSave } : {})}
      {...(options?.showAutoSave !== undefined ? { showAutoSave: options.showAutoSave } : {})}
      {...(options?.components !== undefined ? { components: options.components } : {})}
    />,
  )
  return root
}
