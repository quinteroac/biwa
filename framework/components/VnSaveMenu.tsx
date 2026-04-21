import { createElement } from 'react'
import type { SaveManager } from '../SaveManager.ts'
import type { GameSaveState } from '../types/save.d.ts'
import { SaveLoadMenu } from './SaveLoadMenu.tsx'

/**
 * Props accepted by {@link VnSaveMenu}.
 */
export interface VnSaveMenuProps {
  /**
   * Whether the save/load overlay is visible.
   * Set to `true` to open the menu, `false` to hide it without unmounting.
   */
  isOpen: boolean

  /**
   * Callback invoked when the player dismisses the menu (close button, Escape key,
   * or backdrop click). Typically sets `isOpen` to `false`.
   */
  onClose: () => void

  /**
   * The game's `SaveManager` instance. Used to read slot data, write saves, and
   * load saved states. Must be the same instance used by the rest of the game.
   */
  saveManager: SaveManager

  /**
   * Returns the current serialisable game state at call time.
   * Called immediately when the player clicks a Save button, so the snapshot
   * must reflect the game's live state.
   */
  getState: () => GameSaveState

  /**
   * Called with the deserialized {@link GameSaveState} after a successful slot
   * load. Use this to restore the game to the loaded state.
   * The menu closes automatically after this callback fires.
   */
  onLoad: (state: GameSaveState) => void
}

/**
 * Save/load menu overlay for visual-novel games built with this framework.
 *
 * Mounts an accessible dialog listing all save slots (occupied and empty).
 * Each occupied slot shows the save display name, scene name, and timestamp.
 * Players can save to any slot or load from any occupied slot.
 *
 * @example
 * ```tsx
 * <VnSaveMenu
 *   isOpen={menuOpen}
 *   onClose={() => setMenuOpen(false)}
 *   saveManager={engine.saveManager}
 *   getState={() => engine.getState()}
 *   onLoad={(state) => engine.restoreState(state)}
 * />
 * ```
 *
 * @param props - {@link VnSaveMenuProps}
 * @returns A React element, or `null` when `isOpen` is `false`.
 */
export function VnSaveMenu(props: VnSaveMenuProps): React.ReactElement | null {
  return createElement(SaveLoadMenu, props)
}
