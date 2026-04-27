/**
 * VnStartMenu
 *
 * Displayed by VnApp before VnStage mounts. Shows the game title and lets the
 * player choose an initial action (e.g. New Game). Only after the player selects
 * an action does VnStage mount and engine.start() get called.
 */

import { useState } from 'react'

export interface VnStartMenuProps {
  /** The game title shown prominently on screen. */
  title: string
  /** Called when the player confirms starting a new game. */
  onStart: () => void
  /**
   * Whether there is at least one existing save slot. When `true`, clicking
   * "New Game" first shows an inline confirmation before calling `onStart`.
   * The "Continue" button is also enabled when `true`.
   */
  hasSaves?: boolean
  /**
   * Called when the player clicks "Continue". Only invoked when `hasSaves` is
   * `true`. If omitted the button is still rendered but will be disabled.
   */
  onContinue?: () => void
  /** When `false`, the "New Game" button is hidden. Defaults to `true`. */
  showNewGame?: boolean
  /** When `false`, the "Continue" button is hidden. Defaults to `true`. */
  showContinue?: boolean
}

const MENU_STYLES = {
  wrapper: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--vn-menu-bg-solid, #131313)',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    color: '#e5e2e1',
    userSelect: 'none' as const,
  },
  decorLine: {
    display: 'none' as const,
  },
  title: {
    fontSize: 'clamp(2rem, 6vw, 42px)',
    fontWeight: '200' as const,
    letterSpacing: '-0.02em',
    textAlign: 'center' as const,
    color: 'var(--vn-accent, #ffffff)',
    marginBottom: '3.5rem',
    lineHeight: 1.2,
    maxWidth: '80vw',
    margin: '0 0 3.5rem',
  },
  button: {
    padding: '0',
    width: 200,
    height: 48,
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
    background: 'transparent',
    color: 'rgba(229,226,225,0.7)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 0,
    cursor: 'pointer',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    transition: 'color 0.1s linear, border-color 0.1s linear',
  },
  confirmation: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },
  confirmMessage: {
    fontSize: 11,
    color: 'rgba(229,226,225,0.5)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    margin: '0 0 0.25rem',
  },
  confirmActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  buttonSmall: {
    padding: '0',
    width: 120,
    height: 40,
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
    background: 'transparent',
    color: 'rgba(229,226,225,0.7)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 0,
    cursor: 'pointer',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    transition: 'color 0.1s linear, border-color 0.1s linear',
  },
  buttonDisabled: {
    padding: '0',
    width: 200,
    height: 48,
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
    background: 'transparent',
    color: 'rgba(229,226,225,0.7)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 0,
    cursor: 'not-allowed',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    opacity: 0.25,
  },
  menuButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },
}

export function VnStartMenu({
  title,
  onStart,
  hasSaves = false,
  onContinue,
  showNewGame = true,
  showContinue = true,
}: VnStartMenuProps) {
  const [confirming, setConfirming] = useState(false)

  function handleNewGame() {
    if (hasSaves) {
      setConfirming(true)
    } else {
      onStart()
    }
  }

  function handleConfirm() {
    onStart()
  }

  function handleCancel() {
    setConfirming(false)
  }

  return (
    <div style={MENU_STYLES.wrapper} data-testid="vn-start-menu">
      <div style={MENU_STYLES.decorLine} aria-hidden="true" />

      <h1 style={MENU_STYLES.title} data-testid="vn-start-menu-title">
        {title}
      </h1>

      {confirming ? (
        <div style={MENU_STYLES.confirmation} data-testid="vn-new-game-confirm">
          <p style={MENU_STYLES.confirmMessage}>
            Start over? Your saves will not be deleted.
          </p>
          <div style={MENU_STYLES.confirmActions}>
            <button
              style={MENU_STYLES.buttonSmall}
              onClick={handleConfirm}
              data-testid="vn-confirm-new-game"
              onMouseEnter={e => {
                const btn = e.currentTarget
                btn.style.color = '#ffffff'
                btn.style.borderColor = 'rgba(255,255,255,0.6)'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.color = 'rgba(229,226,225,0.7)'
                btn.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
            >
              Confirm
            </button>
            <button
              style={MENU_STYLES.buttonSmall}
              onClick={handleCancel}
              data-testid="vn-cancel-new-game"
              onMouseEnter={e => {
                const btn = e.currentTarget
                btn.style.color = '#ffffff'
                btn.style.borderColor = 'rgba(255,255,255,0.6)'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.color = 'rgba(229,226,225,0.7)'
                btn.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={MENU_STYLES.menuButtons}>
          {showNewGame && (
            <button
              style={MENU_STYLES.button}
              onClick={handleNewGame}
              data-testid="vn-start-menu-start"
              onMouseEnter={e => {
                const btn = e.currentTarget
                btn.style.color = '#ffffff'
                btn.style.borderColor = 'rgba(255,255,255,0.6)'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.color = 'rgba(229,226,225,0.7)'
                btn.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
            >
              New Game
            </button>
          )}

          {showContinue && (hasSaves ? (
            <button
              style={MENU_STYLES.button}
              onClick={onContinue}
              data-testid="vn-start-menu-continue"
              onMouseEnter={e => {
                const btn = e.currentTarget
                btn.style.color = '#ffffff'
                btn.style.borderColor = 'rgba(255,255,255,0.6)'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.color = 'rgba(229,226,225,0.7)'
                btn.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
            >
              Continue
            </button>
          ) : (
            <button
              style={MENU_STYLES.buttonDisabled}
              disabled
              data-testid="vn-start-menu-continue"
              aria-disabled="true"
            >
              Continue
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
