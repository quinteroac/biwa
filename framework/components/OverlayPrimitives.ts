import type { CSSProperties } from 'react'

export const overlaySurfaceStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 150,
  padding: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.72)',
  pointerEvents: 'auto',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
  color: '#f7f3ef',
}

export const overlayPanelStyle: CSSProperties = {
  width: 'min(860px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 48px)',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(12,12,14,0.96)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 0,
  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
  color: '#f7f3ef',
  overflow: 'hidden',
}

export const overlayHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '18px 20px',
  borderBottom: '1px solid rgba(255,255,255,0.12)',
}

export const overlayEyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.54)',
}

export const overlayTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#f7f3ef',
}

export const overlayButtonStyle: CSSProperties = {
  minHeight: 32,
  padding: '0 12px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 0,
  color: '#f7f3ef',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

export const overlayButtonActiveStyle: CSSProperties = {
  ...overlayButtonStyle,
  background: 'rgba(229,226,225,0.88)',
  border: '1px solid rgba(229,226,225,0.95)',
  color: 'rgba(0,0,0,0.86)',
}

export const overlayInputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 34,
  padding: '0 11px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 0,
  color: '#f7f3ef',
  font: 'inherit',
  fontSize: 13,
}

export const overlaySelectStyle: CSSProperties = {
  ...overlayInputStyle,
  cursor: 'pointer',
  colorScheme: 'dark',
}

export const overlayOptionStyle: CSSProperties = {
  background: '#201f1f',
  color: '#f7f3ef',
}

export const overlayListRowStyle: CSSProperties = {
  minHeight: 66,
  padding: '11px 12px',
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#f7f3ef',
}

export const overlayMutedStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.56)',
  fontSize: 13,
}

export const overlaySectionTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  fontSize: 12,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.66)',
}

export const overlayFocusStyle: CSSProperties = {
  outline: 'none',
}
