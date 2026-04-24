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
        background: '#131313',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
        color: '#e5e2e1',
        textAlign: 'center',
        padding: '64px',
        userSelect: 'none',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(2rem, 6vw, 42px)',
          fontWeight: 200,
          letterSpacing: '-0.02em',
          margin: 0,
          color: '#ffffff',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {message && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: 14,
            fontWeight: 300,
            color: 'rgba(229,226,225,0.55)',
            maxWidth: '36rem',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
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
            padding: '0',
            width: 200,
            height: 48,
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 500,
            background: 'transparent',
            color: 'rgba(229,226,225,0.7)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 0,
            cursor: 'pointer',
            fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
            transition: 'color 0.1s linear, border-color 0.1s linear',
          }}
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
          Return to Menu
        </button>
      )}
    </div>
  )
}
