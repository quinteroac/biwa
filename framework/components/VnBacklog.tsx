import { useMemo, useState } from 'react'
import type { BacklogEntry } from '../types/save.d.ts'

export interface VnBacklogProps {
  isOpen: boolean
  entries: BacklogEntry[]
  onClose: () => void
  onClear?: () => void
  onReplayVoice?: (voice: Record<string, unknown>) => void
}

export function VnBacklog({ isOpen, entries, onClose, onClear, onReplayVoice }: VnBacklogProps) {
  const [query, setQuery] = useState('')
  const [speaker, setSpeaker] = useState('all')
  const speakers = useMemo(() => {
    const names = new Set<string>()
    for (const entry of entries) {
      if (entry.speaker) names.add(entry.speaker)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [entries])
  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter(entry => {
      if (speaker !== 'all' && entry.speaker !== speaker) return false
      if (!needle) return true
      return entry.text.toLowerCase().includes(needle) || entry.speaker?.toLowerCase().includes(needle)
    })
  }, [entries, query, speaker])

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

        <div style={filterBarStyle}>
          <input
            type="search"
            aria-label="Search backlog"
            placeholder="Search"
            value={query}
            onChange={event => setQuery(event.currentTarget.value)}
            style={inputStyle}
          />
          <select
            aria-label="Filter backlog speaker"
            value={speaker}
            onChange={event => setSpeaker(event.currentTarget.value)}
            style={selectStyle}
          >
            <option value="all" style={optionStyle}>All speakers</option>
            {speakers.map(name => <option key={name} value={name} style={optionStyle}>{name}</option>)}
          </select>
        </div>

        <div style={{ overflowY: 'auto', padding: '8px 20px 20px' }}>
          {entries.length === 0 ? (
            <p style={{ color: 'rgba(229,226,225,0.62)' }}>No dialog history yet.</p>
          ) : filteredEntries.length === 0 ? (
            <p style={{ color: 'rgba(229,226,225,0.62)' }}>No backlog lines match the current filter.</p>
          ) : filteredEntries.map(entry => (
            <article key={entry.index} style={{
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={entryHeaderStyle}>
                {entry.speaker && (
                  <div style={{
                    color: entry.nameColor ?? '#ffffff',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}>
                    {entry.speaker}
                  </div>
                )}
                {entry.voice && onReplayVoice && (
                  <button type="button" onClick={() => onReplayVoice(entry.voice!)} style={replayButtonStyle}>Replay</button>
                )}
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7 }}>{entry.text}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

const filterBarStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(150px, 220px)',
  gap: 10,
  padding: '14px 20px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
} as const

const inputStyle = {
  height: 34,
  padding: '0 11px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#e5e2e1',
  font: 'inherit',
  fontSize: 13,
} as const

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  colorScheme: 'dark',
} as const

const optionStyle = {
  background: '#201f1f',
  color: '#e5e2e1',
} as const

const entryHeaderStyle = {
  minHeight: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 6,
} as const

const replayButtonStyle = {
  height: 24,
  padding: '0 9px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: 'rgba(229,226,225,0.72)',
  font: 'inherit',
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
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
