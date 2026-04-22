import { createElement } from 'react'
import type { SaveManager } from '../SaveManager.ts'
import type { GameSaveState } from '../types/save.d.ts'
import { quickSave } from './VnQuickSave.tsx'

/**
 * Props accepted by {@link SaveControlsBar}.
 */
export interface SaveControlsBarProps {
  /**
   * The game's `SaveManager` instance forwarded from the engine.
   */
  saveManager: SaveManager

  /**
   * Returns the current serialisable game state at call time.
   * Called immediately when the player triggers quick-save.
   */
  getState: () => GameSaveState

  /**
   * Callback invoked when the player clicks the "Save Menu" button.
   * Typically opens the full `VnSaveMenu` overlay.
   */
  onOpenMenu: () => void
}

const BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 10,
  padding: '4px 24px 8px',
  pointerEvents: 'none',
}

const BTN_STYLE: React.CSSProperties = {
  padding: '4px 14px',
  background: 'transparent',
  border: '1px solid var(--vn-accent, #c084fc)',
  borderRadius: 6,
  color: 'var(--vn-accent, #c084fc)',
  fontFamily: 'var(--vn-font, "Georgia", serif)',
  fontSize: 12,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  transition: 'background 0.15s, color 0.15s',
  pointerEvents: 'auto',
}

/**
 * A slim horizontal controls bar that exposes quick-save and menu-open
 * actions without obscuring the stage or interfering with click-to-advance.
 *
 * The container uses `pointerEvents: none` so clicks on the empty strip
 * pass through to the stage background. Only the individual buttons
 * capture pointer events.
 *
 * @example
 * ```tsx
 * <SaveControlsBar
 *   saveManager={engine.saveManager}
 *   getState={() => engine.getState()}
 *   onOpenMenu={() => setMenuOpen(true)}
 * />
 * ```
 *
 * @param props - {@link SaveControlsBarProps}
 * @returns A React element with the Quick Save and Save Menu buttons.
 */
export function SaveControlsBar({ saveManager, getState, onOpenMenu }: SaveControlsBarProps): React.ReactElement {
  function handleQuickSave(e: React.MouseEvent) {
    e.stopPropagation()
    quickSave(saveManager, getState)
  }

  function handleOpenMenu(e: React.MouseEvent) {
    e.stopPropagation()
    onOpenMenu()
  }

  return createElement(
    'div',
    { style: BAR_STYLE },
    createElement(
      'button',
      {
        type: 'button',
        style: BTN_STYLE,
        onClick: handleQuickSave,
        'aria-label': 'Quick save',
      },
      'Quick Save',
    ),
    createElement(
      'button',
      {
        type: 'button',
        style: BTN_STYLE,
        onClick: handleOpenMenu,
        'aria-label': 'Open save menu',
      },
      'Save Menu',
    ),
  )
}
