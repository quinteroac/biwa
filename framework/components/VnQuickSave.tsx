import { createElement, useEffect, useState } from 'react'
import type { SaveManager } from '../SaveManager.ts'
import type { GameSaveState } from '../types/save.d.ts'

/** The designated quick-save slot number. */
const QUICK_SAVE_SLOT = 1

/**
 * Props accepted by {@link VnQuickSave}.
 */
export interface VnQuickSaveProps {
  /**
   * The game's `SaveManager` instance. Quick-save always writes to slot 1.
   */
  saveManager: SaveManager

  /**
   * Returns the current serialisable game state at call time.
   * Called immediately when the player triggers the quick-save action.
   */
  getState: () => GameSaveState
}

const BTN_STYLE: React.CSSProperties = {
  padding: '6px 16px',
  background: 'transparent',
  border: '1px solid var(--vn-accent, #c084fc)',
  borderRadius: 6,
  color: 'var(--vn-accent, #c084fc)',
  fontFamily: 'var(--vn-font, "Georgia", serif)',
  fontSize: 13,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  transition: 'background 0.15s, color 0.15s',
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
 * A minimal quick-save button that writes to save slot 1 without opening the menu.
 * A non-blocking toast notification appears briefly after a successful save.
 *
 * @example
 * ```tsx
 * <VnQuickSave
 *   saveManager={engine.saveManager}
 *   getState={() => engine.getState()}
 * />
 * ```
 *
 * @param props - {@link VnQuickSaveProps}
 * @returns A React element containing the Quick Save button and status toast.
 */
export function VnQuickSave({ saveManager, getState }: VnQuickSaveProps): React.ReactElement {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (message === null) return
    const id = setTimeout(() => setMessage(null), 2000)
    return () => clearTimeout(id)
  }, [message])

  function handleQuickSave() {
    const ok = saveManager.save(QUICK_SAVE_SLOT, getState())
    setMessage(ok ? 'Game saved' : 'Save failed')
  }

  return createElement(
    'div',
    { style: { display: 'inline-block' } },
    createElement(
      'button',
      {
        onClick: handleQuickSave,
        style: BTN_STYLE,
        type: 'button',
        'aria-label': 'Quick save',
      },
      'Quick Save',
    ),
    // Always-present ARIA live region so screen readers pick up the toast message.
    createElement(
      'div',
      {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        style: { ...TOAST_STYLE, opacity: message !== null ? 1 : 0 },
      },
      message ?? '',
    ),
  )
}

/**
 * Imperatively triggers a quick-save without rendering any UI.
 * Useful when integrating the quick-save action into a keyboard shortcut or
 * game-loop hook rather than a visible button.
 *
 * @param saveManager - The `SaveManager` instance to write to.
 * @param getState - Returns the current `GameSaveState` at call time.
 * @returns `true` if the save succeeded, `false` if localStorage is unavailable.
 */
export function quickSave(saveManager: SaveManager, getState: () => GameSaveState): boolean {
  return saveManager.save(QUICK_SAVE_SLOT, getState())
}
