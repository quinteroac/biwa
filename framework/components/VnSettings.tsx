import type { PlayerPreferencesPatch, PlayerPreferencesState } from '../player/PlayerPreferences.ts'
import {
  overlayButtonActiveStyle,
  overlayButtonStyle,
  overlayFocusStyle,
  overlayHeaderStyle,
  overlayInputStyle,
  overlayPanelStyle,
  overlaySurfaceStyle,
  overlayTitleStyle,
} from './OverlayPrimitives.ts'

export interface VnSettingsProps {
  isOpen: boolean
  preferences: PlayerPreferencesState
  onChange: (patch: PlayerPreferencesPatch) => void
  onReset: () => void
  onClose: () => void
}

const OVERLAY_STYLE: React.CSSProperties = {
  ...overlaySurfaceStyle,
  ...overlayFocusStyle,
  position: 'absolute',
  zIndex: 110,
}

const PANEL_STYLE: React.CSSProperties = {
  ...overlayPanelStyle,
  width: '100%',
  maxWidth: 520,
  padding: '26px 30px',
  gap: 18,
}

const HEADER_STYLE: React.CSSProperties = {
  ...overlayHeaderStyle,
  padding: 0,
  paddingBottom: 14,
}

const TITLE_STYLE: React.CSSProperties = {
  ...overlayTitleStyle,
}

const CLOSE_STYLE: React.CSSProperties = {
  ...overlayButtonStyle,
  width: 28,
  height: 28,
  minHeight: 28,
  padding: 0,
}

const ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr minmax(160px, 220px)',
  gap: 16,
  alignItems: 'center',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(229,226,225,0.68)',
}

const VALUE_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(229,226,225,0.45)',
  marginTop: 4,
}

const BUTTON_STYLE: React.CSSProperties = {
  ...overlayButtonStyle,
  minHeight: 28,
  padding: '0 10px',
  fontSize: 10,
}

const ACTIVE_BUTTON_STYLE: React.CSSProperties = {
  ...overlayButtonActiveStyle,
  minHeight: 28,
  padding: '0 10px',
  fontSize: 10,
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={active ? ACTIVE_BUTTON_STYLE : BUTTON_STYLE}
    >
      {label}
    </button>
  )
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}) {
  return (
    <label style={ROW_STYLE}>
      <span>
        <span style={LABEL_STYLE}>{label}</span>
        <span style={VALUE_STYLE}>{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        style={overlayInputStyle}
      />
    </label>
  )
}

export function VnSettings({ isOpen, preferences, onChange, onReset, onClose }: VnSettingsProps) {
  if (!isOpen) return null

  return (
    <div
      style={OVERLAY_STYLE}
      role="dialog"
      aria-modal="true"
      aria-label="Player settings"
      tabIndex={-1}
      autoFocus
      onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
      onClick={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div style={PANEL_STYLE} onClick={(event) => event.stopPropagation()}>
        <div style={HEADER_STYLE}>
          <h2 style={TITLE_STYLE}>Settings</h2>
          <button type="button" aria-label="Close settings" onClick={onClose} style={CLOSE_STYLE}>×</button>
        </div>

        <RangeRow
          label="Text speed"
          value={preferences.textSpeedMs}
          min={0}
          max={120}
          step={5}
          display={preferences.textSpeedMs === 0 ? 'Instant' : `${preferences.textSpeedMs} ms`}
          onChange={(textSpeedMs) => onChange({ textSpeedMs })}
        />

        <RangeRow
          label="Auto delay"
          value={preferences.autoBaseDelayMs}
          min={0}
          max={4000}
          step={100}
          display={`${preferences.autoBaseDelayMs} ms base`}
          onChange={(autoBaseDelayMs) => onChange({ autoBaseDelayMs })}
        />

        <RangeRow
          label="Text size"
          value={preferences.textScale}
          min={0.8}
          max={1.6}
          step={0.05}
          display={`${Math.round(preferences.textScale * 100)}%`}
          onChange={(textScale) => onChange({ textScale })}
        />

        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>Reading defaults</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <ToggleButton active={preferences.skipReadOnly} label="Read Only" onClick={() => onChange({ skipReadOnly: !preferences.skipReadOnly })} />
            <ToggleButton active={preferences.highContrast} label="Contrast" onClick={() => onChange({ highContrast: !preferences.highContrast })} />
            <ToggleButton active={preferences.reduceMotion} label="No Motion" onClick={() => onChange({ reduceMotion: !preferences.reduceMotion })} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onReset} style={BUTTON_STYLE}>Reset</button>
          <button type="button" onClick={onClose} style={ACTIVE_BUTTON_STYLE}>Done</button>
        </div>
      </div>
    </div>
  )
}
