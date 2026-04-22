interface VnEndScreenProps {
  /** Primary heading shown on the end screen. Defaults to "The End". */
  title?: string
  /** Optional message displayed beneath the title. */
  message?: string
}

/**
 * Full-screen end screen displayed when the story concludes.
 *
 * Rendered by {@link VnApp} in response to the `"end_screen"` EventBus event.
 *
 * @param title   - Heading text. Defaults to `"The End"`.
 * @param message - Optional subtitle / closing message.
 */
export function VnEndScreen({ title = 'The End', message }: VnEndScreenProps) {
  return (
    <div
      data-testid="vn-end-screen"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--vn-font, "Georgia", serif)',
        color: '#fff',
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
    </div>
  )
}
