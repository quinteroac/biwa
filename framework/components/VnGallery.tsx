import { useEffect, useMemo, useState } from 'react'
import type { GalleryItem } from '../types/extras.d.ts'
import {
  overlayButtonStyle,
  overlayEyebrowStyle,
  overlayFocusStyle,
  overlayHeaderStyle,
  overlayListRowStyle,
  overlayMutedStyle,
  overlayPanelStyle,
  overlaySurfaceStyle,
  overlayTitleStyle,
} from './OverlayPrimitives.ts'

export interface VnGalleryProps {
  isOpen: boolean
  items: GalleryItem[]
  unlockedIds: string[]
  onClose: () => void
}

function assetSrc(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path) || path.startsWith('./') || path.startsWith('/')) return path
  return `./assets/${path}`
}

export function VnGallery({ isOpen, items, unlockedIds, onClose }: VnGalleryProps) {
  const unlocked = useMemo(() => new Set(unlockedIds), [unlockedIds])
  const firstUnlocked = items.find(item => unlocked.has(item.id))?.id ?? null
  const [selectedId, setSelectedId] = useState<string | null>(firstUnlocked)
  const selected = items.find(item => item.id === selectedId) ?? null
  const selectedUnlocked = selected ? unlocked.has(selected.id) : false

  useEffect(() => {
    if (!isOpen) return
    setSelectedId(current => current && unlocked.has(current) ? current : firstUnlocked)
  }, [isOpen, firstUnlocked, unlocked])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CG gallery"
      tabIndex={-1}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      style={overlayStyle}
    >
      <div style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Gallery</div>
            <h2 style={titleStyle}>CG Gallery</h2>
          </div>
          <button type="button" onClick={onClose} style={buttonStyle}>Close</button>
        </header>

        <div style={bodyStyle}>
          <div style={gridStyle}>
            {items.map(item => {
              const isUnlocked = unlocked.has(item.id)
              const thumb = assetSrc(item.thumbnail ?? item.image)
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isUnlocked}
                  aria-label={isUnlocked ? `Open ${item.title ?? item.id}` : 'Locked gallery item'}
                  onClick={() => setSelectedId(item.id)}
                  style={{
                    ...thumbButtonStyle,
                    opacity: isUnlocked ? 1 : 0.45,
                    borderColor: selectedId === item.id ? 'var(--vn-accent, #c084fc)' : 'rgba(255,255,255,0.18)',
                  }}
                >
                  {isUnlocked && thumb ? (
                    <img src={thumb} alt="" style={thumbImageStyle} />
                  ) : (
                    <span style={lockedStyle}>Locked</span>
                  )}
                  <span style={thumbLabelStyle}>{isUnlocked ? (item.title ?? item.id) : '???'}</span>
                </button>
              )
            })}
          </div>

          <section style={previewStyle} aria-live="polite">
            {selected && selectedUnlocked ? (
              <>
                <img src={assetSrc(selected.image)} alt={selected.title ?? selected.id} style={previewImageStyle} />
                <div style={previewTextStyle}>
                  <h3 style={previewTitleStyle}>{selected.title ?? selected.id}</h3>
                  {selected.description && <p style={descriptionStyle}>{selected.description}</p>}
                </div>
              </>
            ) : (
              <div style={emptyStyle}>No unlocked CG selected.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  ...overlaySurfaceStyle,
  ...overlayFocusStyle,
  zIndex: 160,
} as const

const panelStyle = {
  ...overlayPanelStyle,
  width: 'min(1080px, calc(100vw - 32px))',
} as const

const headerStyle = {
  ...overlayHeaderStyle,
} as const

const eyebrowStyle = {
  ...overlayEyebrowStyle,
} as const

const titleStyle = {
  ...overlayTitleStyle,
  marginTop: 3,
} as const

const buttonStyle = {
  ...overlayButtonStyle,
} as const

const bodyStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(240px, 360px) minmax(0, 1fr)',
  gap: 18,
  padding: 20,
  overflow: 'auto',
} as const

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
  gap: 10,
  alignContent: 'start',
} as const

const thumbButtonStyle = {
  ...overlayListRowStyle,
  minHeight: 124,
  display: 'grid',
  gridTemplateRows: '1fr auto',
  padding: 0,
  overflow: 'hidden',
  cursor: 'pointer',
} as const

const thumbImageStyle = {
  width: '100%',
  height: 92,
  objectFit: 'cover',
  display: 'block',
} as const

const lockedStyle = {
  height: 92,
  display: 'grid',
  placeItems: 'center',
  color: 'rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.04)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
} as const

const thumbLabelStyle = {
  padding: '8px 9px',
  fontSize: 12,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const previewStyle = {
  minHeight: 360,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.12)',
} as const

const previewImageStyle = {
  width: '100%',
  maxHeight: 'min(58vh, 560px)',
  objectFit: 'contain',
  display: 'block',
  background: '#050505',
} as const

const previewTextStyle = {
  padding: '14px 16px 16px',
} as const

const previewTitleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: 0,
} as const

const descriptionStyle = {
  margin: '7px 0 0',
  color: 'rgba(255,255,255,0.68)',
  lineHeight: 1.5,
  fontSize: 14,
} as const

const emptyStyle = {
  ...overlayMutedStyle,
  display: 'grid',
  placeItems: 'center',
  minHeight: 360,
} as const
