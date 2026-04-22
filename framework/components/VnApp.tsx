import { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { VnStage } from './VnStage.tsx'
import { VnStartMenu } from './VnStartMenu.tsx'
import type { GameEngine } from '../engine/GameEngine.ts'

interface VnAppProps {
  engine: GameEngine
}

/**
 * Root application component.
 *
 * Renders {@link VnStartMenu} first. VnStage (and therefore engine.start())
 * is mounted only after the player picks an action from the start menu.
 */
function VnApp({ engine }: VnAppProps) {
  const [started, setStarted] = useState(false)

  const hasSaves = engine.saveManager.listSlots().length > 0

  const handleStart = useCallback(() => {
    setStarted(true)
  }, [])

  if (!started) {
    return <VnStartMenu title={engine.title} onStart={handleStart} hasSaves={hasSaves} />
  }

  return <VnStage engine={engine} />
}

/**
 * Mount the visual-novel application into the given DOM container.
 *
 * @param engine - Initialised GameEngine instance.
 * @param container - DOM element to render into.
 * @returns The React root so the caller can unmount if needed.
 */
export function mountVnApp(engine: GameEngine, container: Element): ReturnType<typeof createRoot> {
  const root = createRoot(container)
  root.render(<VnApp engine={engine} />)
  return root
}

