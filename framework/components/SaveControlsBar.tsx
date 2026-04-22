import { createElement, useEffect, useState } from 'react'
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
   * Callback invoked when the player clicks the "Save / Load" button.
   * Typically opens the full `VnSaveMenu` overlay.
   */
  onOpenMenu: () => void

  /**
   * When `true` (default), renders the "Quick Save" button that saves to slot 1.
   * Set to `false` to hide the button, e.g. in scenes where saving is disabled.
   */
  showQuickSave?: boolean

  /**
   * When `true` (default), renders the "Save / Load" button that opens the
   * slot menu. Set to `false` to hide the button, e.g. in scenes where
   * saving should be disabled.
   */
  showSlotMenu?: boolean
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

const TOAST_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: 32,
  right: 32,
  padding: '10px 18px',
  borderRadius: 8,
  background: 'rgba(10,10,20,0.92)',
  border: '1px solid var(--vn-accent, #c084fc)',
  color: '#f8f8f8',
  fontFamily: 'var(--vn-font, "Georgia", serif)',
  fontSize: 14,
  zIndex: 200,
  pointerEvents: 'none',
  transition: 'opacity 0.4s ease',
}

/**
 * A slim horizontal controls bar that exposes quick-save and slot-menu
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
 *   showSlotMenu={true}
 * />
 * ```
 *
 * @param props - {@link SaveControlsBarProps}
 * @returns A React element with the Quick Save and (optionally) Save / Load buttons.
 */
export function SaveControlsBar({ saveManager, getState, onOpenMenu, showQuickSave = true, showSlotMenu = true }: SaveControlsBarProps): React.ReactElement {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (toastMessage === null) return
    const id = setTimeout(() => setToastMessage(null), 2000)
    return () => clearTimeout(id)
  }, [toastMessage])

  function handleQuickSave(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = quickSave(saveManager, getState)
    setToastMessage(ok ? 'Game saved' : 'Save failed')
  }

  function handleOpenMenu(e: React.MouseEvent) {
    e.stopPropagation()
    onOpenMenu()
  }

  return createElement(
    'div',
    { style: BAR_STYLE },
    showQuickSave
      ? createElement(
          'button',
          {
            type: 'button',
            style: BTN_STYLE,
            onClick: handleQuickSave,
            'aria-label': 'Quick save',
          },
          'Quick Save',
        )
      : null,
    showSlotMenu
      ? createElement(
          'button',
          {
            type: 'button',
            style: BTN_STYLE,
            onClick: handleOpenMenu,
            'aria-label': 'Open save menu',
          },
          'Save / Load',
        )
      : null,
    createElement(
      'div',
      {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        style: { ...TOAST_STYLE, opacity: toastMessage !== null ? 1 : 0 },
      },
      toastMessage ?? '',
    ),
  )
}
