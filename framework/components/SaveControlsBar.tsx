import { createElement, useEffect, useRef, useState } from 'react'
import type { EventBus } from '../engine/EventBus.ts'
import type { SaveManager } from '../SaveManager.ts'
import type { GameSaveState } from '../types/save.d.ts'
import { quickSave } from './VnQuickSave.tsx'

const AUTO_SAVE_KEY = 'vn:autoSave'

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
   * Called immediately when the player triggers quick-save or on auto-save.
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

  /**
   * When `true` (default), renders the "Auto Save" toggle that automatically
   * saves to the `'auto'` slot on every `engine:dialog` event.
   * Set to `false` to hide the toggle entirely.
   */
  showAutoSave?: boolean

  /**
   * The game's `EventBus` instance. Required for auto-save to subscribe to
   * `engine:dialog` events. When omitted, auto-save subscription is skipped.
   */
  eventBus?: EventBus
}

const TOGGLE_LABEL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--vn-accent, #c084fc)',
  fontFamily: 'var(--vn-font, "Georgia", serif)',
  fontSize: 12,
  fontWeight: 'bold',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  userSelect: 'none',
  pointerEvents: 'auto',
}

const TOGGLE_SWITCH_STYLE = (checked: boolean): React.CSSProperties => ({
  position: 'relative',
  display: 'inline-block',
  width: 28,
  height: 16,
  background: checked ? 'var(--vn-accent, #c084fc)' : 'rgba(192,132,252,0.2)',
  border: '1px solid var(--vn-accent, #c084fc)',
  borderRadius: 8,
  transition: 'background 0.2s',
  flexShrink: 0,
})

const TOGGLE_KNOB_STYLE = (checked: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 2,
  left: checked ? 12 : 2,
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: '#fff',
  transition: 'left 0.2s',
})

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
 * @returns A React element with the Quick Save, Auto Save toggle, and (optionally) Save / Load buttons.
 */
export function SaveControlsBar({ saveManager, getState, onOpenMenu, showQuickSave = true, showSlotMenu = true, showAutoSave = true, eventBus }: SaveControlsBarProps): React.ReactElement {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTO_SAVE_KEY)
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  // Keep a ref so the event handler always sees the latest getState/saveManager
  const autoSaveRef = useRef({ saveManager, getState, autoSaveEnabled })
  autoSaveRef.current = { saveManager, getState, autoSaveEnabled }

  useEffect(() => {
    if (!eventBus) return
    const unsub = eventBus.on('engine:dialog', () => {
      if (autoSaveRef.current.autoSaveEnabled) {
        autoSaveRef.current.saveManager.save('auto', autoSaveRef.current.getState())
      }
    })
    return unsub
  }, [eventBus])

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

  function handleAutoSaveToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !autoSaveEnabled
    setAutoSaveEnabled(next)
    try {
      localStorage.setItem(AUTO_SAVE_KEY, String(next))
    } catch {
      console.warn('[SaveControlsBar] Could not persist autoSave preference')
    }
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
    showAutoSave
      ? createElement(
          'label',
          {
            style: TOGGLE_LABEL_STYLE,
            onClick: handleAutoSaveToggle,
            'aria-label': 'Toggle auto save',
            role: 'switch',
            'aria-checked': autoSaveEnabled,
          },
          createElement('span', { style: TOGGLE_SWITCH_STYLE(autoSaveEnabled) },
            createElement('span', { style: TOGGLE_KNOB_STYLE(autoSaveEnabled) }),
          ),
          'Auto Save',
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
