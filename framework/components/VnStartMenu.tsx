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
    background: 'var(--vn-menu-bg, linear-gradient(160deg, #0a0014 0%, #1a0030 55%, #0d001e 100%))',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    color: 'var(--vn-menu-text, #e2e8f0)',
    userSelect: 'none' as const,
  },
  decorLine: {
    width: '2px',
    height: '80px',
    background: 'linear-gradient(to bottom, transparent, var(--vn-accent, #c084fc), transparent)',
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: 'clamp(2rem, 6vw, 3.75rem)',
    fontWeight: 'normal' as const,
    letterSpacing: '0.08em',
    textAlign: 'center' as const,
    color: 'var(--vn-accent, #c084fc)',
    textShadow: '0 0 48px rgba(192, 132, 252, 0.45), 0 2px 8px rgba(0,0,0,0.8)',
    marginBottom: '3.5rem',
    lineHeight: 1.2,
    maxWidth: '80vw',
  },
  button: {
    padding: '0.75rem 2.5rem',
    fontSize: '1rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    background: 'transparent',
    color: 'var(--vn-accent, #c084fc)',
    border: '1px solid var(--vn-accent, #c084fc)',
    borderRadius: '2px',
    cursor: 'pointer',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    transition: 'background 0.2s, color 0.2s',
  },
  confirmation: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem',
  },
  confirmMessage: {
    fontSize: '0.875rem',
    color: 'var(--vn-menu-text-muted, #cbd5e1)',
    letterSpacing: '0.04em',
    textAlign: 'center' as const,
    margin: '0 0 0.25rem',
  },
  confirmActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  buttonSmall: {
    padding: '0.5rem 1.5rem',
    fontSize: '0.875rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    background: 'transparent',
    color: 'var(--vn-accent, #c084fc)',
    border: '1px solid var(--vn-accent, #c084fc)',
    borderRadius: '2px',
    cursor: 'pointer',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    transition: 'background 0.2s, color 0.2s',
  },
  buttonDisabled: {
    padding: '0.75rem 2.5rem',
    fontSize: '1rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    background: 'transparent',
    color: 'var(--vn-accent, #c084fc)',
    border: '1px solid var(--vn-accent, #c084fc)',
    borderRadius: '2px',
    cursor: 'not-allowed',
    fontFamily: 'var(--vn-font, "Georgia", serif)',
    opacity: 0.35,
  },
  menuButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.875rem',
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
                btn.style.background = 'var(--vn-accent, #c084fc)'
                btn.style.color = 'var(--vn-menu-bg-solid, #0a0014)'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.background = 'transparent'
                btn.style.color = 'var(--vn-accent, #c084fc)'
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
                btn.style.background = 'var(--vn-menu-cancel-hover-bg, rgba(226,232,240,0.1))'
                btn.style.color = 'var(--vn-menu-text, #e2e8f0)'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.background = 'transparent'
                btn.style.color = 'var(--vn-accent, #c084fc)'
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
                btn.style.background = 'var(--vn-accent, #c084fc)'
                btn.style.color = '#0a0014'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.background = 'transparent'
                btn.style.color = 'var(--vn-accent, #c084fc)'
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
                btn.style.background = 'var(--vn-accent, #c084fc)'
                btn.style.color = '#0a0014'
              }}
              onMouseLeave={e => {
                const btn = e.currentTarget
                btn.style.background = 'transparent'
                btn.style.color = 'var(--vn-accent, #c084fc)'
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
