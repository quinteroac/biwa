import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { RuntimeDiagnosticsSnapshot } from '../types/diagnostics.d.ts'

export interface VnDevtoolsOverlayProps {
  snapshot: RuntimeDiagnosticsSnapshot | null
  onRefresh: () => void
}

export function VnDevtoolsOverlay({ snapshot, onRefresh }: VnDevtoolsOverlayProps) {
  const [open, setOpen] = useState(false)
  const variables = useMemo(() => snapshot ? Object.entries(snapshot.variables) : [], [snapshot])

  return (
    <aside
      data-testid="vn-devtools"
      onClick={event => event.stopPropagation()}
      style={open ? panelStyle : dockStyle}
    >
      <button type="button" onClick={() => setOpen(value => !value)} style={toggleStyle}>
        Dev
      </button>
      {open && (
        <div style={contentStyle}>
          <header style={headerStyle}>
            <strong style={titleStyle}>Runtime</strong>
            <button type="button" onClick={onRefresh} style={buttonStyle}>Refresh</button>
          </header>
          {!snapshot ? (
            <p style={mutedStyle}>Waiting for diagnostics.</p>
          ) : (
            <>
              <Section title="Scene">
                <Row label="state" value={snapshot.state} />
                <Row label="id" value={snapshot.scene.id ?? 'none'} />
                <Row label="variant" value={snapshot.scene.variant ?? 'default'} />
              </Section>
              <Section title="Characters">
                {snapshot.characters.length === 0 ? <p style={mutedStyle}>none</p> : snapshot.characters.map(character => (
                  <Row key={character.id} label={character.id} value={`${character.position} / ${character.expression}`} />
                ))}
              </Section>
              <Section title="Audio">
                {(['bgm', 'ambience', 'voice'] as const).map(channel => (
                  <Row key={channel} label={channel} value={String(snapshot.audio[channel]?.id ?? 'none')} />
                ))}
              </Section>
              <Section title="Variables">
                {variables.length === 0 ? <p style={mutedStyle}>none</p> : variables.map(([key, value]) => (
                  <Row key={key} label={key} value={JSON.stringify(value)} />
                ))}
              </Section>
              <Section title="Plugins">
                {snapshot.plugins.map(plugin => (
                  <Row key={plugin.id} label={plugin.id} value={plugin.active ? 'active' : 'inactive'} />
                ))}
              </Section>
              <Section title="Renderers">
                {snapshot.renderers.length === 0 ? <p style={mutedStyle}>none</p> : snapshot.renderers.map(renderer => (
                  <Row key={`${renderer.kind}:${renderer.type}`} label={renderer.kind} value={`${renderer.type}${renderer.pluginId ? ` (${renderer.pluginId})` : ''}`} />
                ))}
              </Section>
            </>
          )}
        </div>
      )}
    </aside>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </div>
  )
}

const dockStyle = {
  position: 'absolute',
  top: 20,
  left: 20,
  zIndex: 180,
  pointerEvents: 'auto',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
} as const

const panelStyle = {
  ...dockStyle,
  width: 360,
  maxWidth: 'calc(100vw - 40px)',
  maxHeight: 'calc(100vh - 40px)',
  overflow: 'hidden',
  background: 'rgba(8,8,10,0.92)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#e5e2e1',
  boxShadow: '0 18px 64px rgba(0,0,0,0.45)',
} as const

const toggleStyle = {
  height: 30,
  padding: '0 11px',
  background: 'rgba(229,226,225,0.88)',
  border: '1px solid rgba(229,226,225,0.95)',
  color: 'rgba(0,0,0,0.86)',
  font: 'inherit',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
} as const

const contentStyle = {
  padding: 14,
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 92px)',
} as const

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 12,
} as const

const titleStyle = {
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const

const buttonStyle = {
  height: 26,
  padding: '0 9px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#e5e2e1',
  font: 'inherit',
  fontSize: 10,
  textTransform: 'uppercase',
  cursor: 'pointer',
} as const

const sectionStyle = {
  padding: '10px 0',
  borderTop: '1px solid rgba(255,255,255,0.1)',
} as const

const sectionTitleStyle = {
  margin: '0 0 8px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(229,226,225,0.58)',
} as const

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '96px minmax(0, 1fr)',
  gap: 8,
  marginBottom: 5,
  fontSize: 11,
  lineHeight: 1.4,
} as const

const labelStyle = {
  color: 'rgba(229,226,225,0.52)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const valueStyle = {
  color: 'rgba(229,226,225,0.88)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

const mutedStyle = {
  margin: 0,
  color: 'rgba(229,226,225,0.52)',
  fontSize: 12,
} as const
