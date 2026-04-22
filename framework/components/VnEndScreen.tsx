interface VnEndScreenProps {
  /** Primary heading shown on the end screen. Defaults to "The End". */
  title?: string
  /** Optional message displayed beneath the title. */
  message?: string
  /** Called when the player clicks "Return to Menu". */
  onReturnToMenu?: () => void
}

/**
 * Full-screen end screen displayed when the story concludes.
 *
 * Rendered by {@link VnApp} in response to the `"end_screen"` EventBus event.
 *
 * @param title           - Heading text. Defaults to `"The End"`.
 * @param message         - Optional subtitle / closing message.
 * @param onReturnToMenu  - Called when the player clicks "Return to Menu".
 */
export function VnEndScreen({ title = 'The End', message, onReturnToMenu }: VnEndScreenProps) {
  return (
    <div
      data-testid="vn-end-screen"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--vn-end-bg, #000)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--vn-font, "Georgia", serif)',
        color: 'var(--vn-end-color, #fff)',
        textAlign: 'center',
        padding: '2rem',
        userSelect: 'none',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(2rem, 6vw, 4rem)',
          fontWeight: 'bold',
          letterSpacing: '0.1em',
          margin: 0,
          opacity: 0.95,
        }}
      >
        {title}
      </h1>
      {message && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
            opacity: 0.75,
            maxWidth: '36rem',
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
      )}
      {onReturnToMenu && (
        <button
          data-testid="vn-end-screen-return"
          onClick={onReturnToMenu}
          style={{
            marginTop: '3rem',
            padding: '0.75rem 2.5rem',
            fontSize: '1rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: 'transparent',
            color: 'var(--vn-accent, #c084fc)',
            border: '1px solid var(--vn-accent, #c084fc)',
            borderRadius: '2px',
            cursor: 'pointer',
            fontFamily: 'var(--vn-font, "Georgia", serif)',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            const btn = e.currentTarget
            btn.style.background = 'var(--vn-accent, #c084fc)'
            btn.style.color = 'var(--vn-end-bg, #0a0014)'
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget
            btn.style.background = 'transparent'
            btn.style.color = 'var(--vn-accent, #c084fc)'
          }}
        >
          Return to Menu
        </button>
      )}
    </div>
  )
}
