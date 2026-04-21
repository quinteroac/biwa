import { createRoot } from 'react-dom/client'
import { VnStage } from './VnStage.tsx'
import type { GameEngine } from '../engine/GameEngine.ts'

export function mountVnApp(engine: GameEngine, container: Element): ReturnType<typeof createRoot> {
  const root = createRoot(container)
  root.render(<VnStage engine={engine} />)
  return root
}
