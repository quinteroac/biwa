import { createElement, useEffect, useRef, useState } from 'react'
import type { EventBus } from '../engine/EventBus.ts'
import type { SaveManager } from '../SaveManager.ts'
import type { GameSaveState } from '../types/save.d.ts'
import type { ReactNode } from 'react'
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
   * Optional controls rendered at the start of the same bottom bar. Used by
   * the default stage for player reading controls such as backlog, auto and skip.
   */
  leadingControls?: ReactNode

  /**
   * The game's `EventBus` instance. Required for auto-save to subscribe to
   * `engine:dialog` events. When omitted, auto-save subscription is skipped.
   */
  eventBus?: EventBus<any>
}

const TOGGLE_LABEL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 28,
  padding: '0 10px',
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.24)',
  borderRadius: 0,
  color: 'rgba(229,226,225,0.78)',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  userSelect: 'none',
  pointerEvents: 'auto',
}

const TOGGLE_SWITCH_STYLE = (checked: boolean): React.CSSProperties => ({
  position: 'relative',
  display: 'inline-block',
  width: 24,
  height: 14,
  background: checked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 0,
  transition: 'background 0.1s linear',
  flexShrink: 0,
})

const TOGGLE_KNOB_STYLE = (checked: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: 2,
  left: checked ? 10 : 2,
  width: 8,
  height: 8,
  borderRadius: 0,
  background: '#fff',
  transition: 'left 0.1s linear',
})

const BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
  padding: '8px 64px 12px',
  background: 'rgba(0,0,0,0.55)',
  pointerEvents: 'none',
}

const BTN_STYLE: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  background: 'rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.24)',
  borderRadius: 0,
  color: 'rgba(229,226,225,0.78)',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  pointerEvents: 'auto',
}

const TOAST_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: 32,
  right: 32,
  padding: '8px 16px',
  borderRadius: 0,
  background: '#201f1f',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'rgba(229,226,225,0.8)',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
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
export function SaveControlsBar({ saveManager, getState, onOpenMenu, showQuickSave = true, showSlotMenu = true, showAutoSave = true, leadingControls, eventBus }: SaveControlsBarProps): React.ReactElement {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const autoSaveKey = saveManager.autoSavePreferenceKey

  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(autoSaveKey)
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
      localStorage.setItem(autoSaveKey, String(next))
    } catch {
      console.warn('[SaveControlsBar] Could not persist autoSave preference')
    }
  }

  return createElement(
    'div',
    { style: BAR_STYLE },
    leadingControls ?? null,
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
