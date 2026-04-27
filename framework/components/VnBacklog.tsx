import type { BacklogEntry } from '../types/save.d.ts'

export interface VnBacklogProps {
  isOpen: boolean
  entries: BacklogEntry[]
  onClose: () => void
  onClear?: () => void
}

export function VnBacklog({ isOpen, entries, onClose, onClear }: VnBacklogProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Backlog"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0,0,0,0.72)',
        color: '#e5e2e1',
        fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        padding: 32,
      }}
    >
      <section style={{
        width: 'min(860px, 100%)',
        background: 'rgba(12,12,14,0.94)',
        border: '1px solid rgba(255,255,255,0.16)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Backlog</h2>
          <div style={{ flex: 1 }} />
          {onClear && (
            <button type="button" onClick={onClear} style={buttonStyle}>Clear</button>
          )}
          <button type="button" onClick={onClose} style={buttonStyle}>Close</button>
        </header>

        <div style={{ overflowY: 'auto', padding: '8px 20px 20px' }}>
          {entries.length === 0 ? (
            <p style={{ color: 'rgba(229,226,225,0.62)' }}>No dialog history yet.</p>
          ) : entries.map(entry => (
            <article key={entry.index} style={{
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              {entry.speaker && (
                <div style={{
                  color: entry.nameColor ?? '#ffffff',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}>
                  {entry.speaker}
                </div>
              )}
              <div style={{ fontSize: 16, lineHeight: 1.7 }}>{entry.text}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

const buttonStyle = {
  height: 32,
  padding: '0 12px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#e5e2e1',
  font: 'inherit',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
}
