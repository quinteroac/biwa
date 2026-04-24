import { useEffect, useState } from 'react'
import type { AudioChannel } from '../engine/VolumeController.ts'

/** Labels displayed for each audio channel. */
const CHANNEL_LABELS: Record<AudioChannel, string> = Object.freeze({
  master: 'Master',
  bgm: 'BGM',
  sfx: 'SFX',
  voice: 'Voice',
})

/** CSS variables namespace for volume control styling. */
const CSS_VARS = {
  labelColor: 'var(--vn-vol-label-color, rgba(229,226,225,0.55))',
  labelFont: 'var(--vn-vol-label-font, var(--vn-font, "Manrope", sans-serif))',
  labelSize: 'var(--vn-vol-label-size, 11px)',
  labelWeight: 'var(--vn-vol-label-weight, 500)',
  labelSpacing: 'var(--vn-vol-label-spacing, 0.2em)',
  valueColor: 'var(--vn-vol-value-color, rgba(229,226,225,0.8))',
  trackBg: 'var(--vn-vol-track-bg, rgba(255,255,255,0.1))',
  trackFill: 'var(--vn-vol-track-fill, rgba(192,132,252,0.6))',
  trackBorder: 'var(--vn-vol-track-border, rgba(255,255,255,0.2))',
  thumbBg: 'var(--vn-vol-thumb-bg, #c084fc)',
  thumbBorder: 'var(--vn-vol-thumb-border, rgba(255,255,255,0.4))',
  containerBg: 'var(--vn-vol-container-bg, transparent)',
  gap: 'var(--vn-vol-gap, 16px)',
  rowGap: 'var(--vn-vol-row-gap, 12px)',
}

/**
 * Props accepted by {@link VnVolumeControl}.
 */
export interface VnVolumeControlProps {
  /**
   * Initial volume levels per channel (0.0–1.0).
   * Defaults to 1.0 for all channels when not provided.
   */
  volumes?: Partial<Record<AudioChannel, number>>

  /**
   * Called when the user changes any slider.
   * Receives the channel name and the new normalized volume (0.0–1.0).
   */
  onVolumeChange: (channel: AudioChannel, volume: number) => void
}

const CONTAINER_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--vn-vol-gap, 16px)',
  background: CSS_VARS.containerBg,
  padding: '12px 0',
}

/**
 * Injects a style element for slider thumb pseudo-elements.
 * Inline styles cannot target ::-webkit-slider-thumb or ::-moz-range-thumb,
 * so we inject a small stylesheet at mount time using the same CSS variables.
 */
function injectSliderThumbStyles(): () => void {
  const id = 'vn-volume-control-thumb-styles'
  if (document.getElementById(id)) return () => {}
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    .vn-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      background: ${CSS_VARS.thumbBg};
      border: 1px solid ${CSS_VARS.thumbBorder};
      border-radius: 0;
      cursor: pointer;
    }
    .vn-volume-slider::-moz-range-thumb {
      width: 12px;
      height: 12px;
      background: ${CSS_VARS.thumbBg};
      border: 1px solid ${CSS_VARS.thumbBorder};
      border-radius: 0;
      cursor: pointer;
    }
    .vn-volume-slider::-ms-thumb {
      width: 12px;
      height: 12px;
      background: ${CSS_VARS.thumbBg};
      border: 1px solid ${CSS_VARS.thumbBorder};
      border-radius: 0;
      cursor: pointer;
    }
  `
  document.head.appendChild(style)
  return () => { style.remove() }
}

/**
 * A compact volume-control panel with one slider per audio channel.
 *
 * Each slider shows the channel label (e.g. "Master", "BGM", "SFX", "Voice")
 * and the current volume as a percentage. All colours and fonts are driven
 * by CSS custom properties so games can theme the panel without touching
 * component code.
 *
 * @example
 * ```tsx
 * <VnVolumeControl
 *   volumes={{ master: 1.0, bgm: 0.8, sfx: 1.0, voice: 0.5 }}
 *   onVolumeChange={(ch, vol) => volumeController.setVolume(ch, vol)}
 * />
 * ```
 *
 * @param props - {@link VnVolumeControlProps}
 * @returns A React element with a vertical list of volume sliders.
 */
export function VnVolumeControl({
  volumes: initialVolumes = {},
  onVolumeChange,
}: VnVolumeControlProps): React.ReactElement {
  useEffect(() => injectSliderThumbStyles(), [])
  const [channelVolumes, setChannelVolumes] = useState<Record<AudioChannel, number>>(
    () => ({
      master: initialVolumes.master ?? 1.0,
      bgm: initialVolumes.bgm ?? 1.0,
      sfx: initialVolumes.sfx ?? 1.0,
      voice: initialVolumes.voice ?? 1.0,
    }),
  )

  const channels: AudioChannel[] = ['master', 'bgm', 'sfx', 'voice']

  function handleSliderChange(channel: AudioChannel, rawValue: string): void {
    const normalized = Number(rawValue) / 100
    const clamped = Math.max(0, Math.min(1, normalized))
    setChannelVolumes((prev) => ({ ...prev, [channel]: clamped }))
    onVolumeChange(channel, clamped)
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`

  return (
    <div style={CONTAINER_STYLE} role="group" aria-label="Volume controls">
      {channels.map((ch) => (
        <div
          key={ch}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: CSS_VARS.rowGap,
          }}
        >
          <label
            style={{
              color: CSS_VARS.labelColor,
              fontFamily: CSS_VARS.labelFont,
              fontSize: CSS_VARS.labelSize,
              fontWeight: CSS_VARS.labelWeight,
              letterSpacing: CSS_VARS.labelSpacing,
              textTransform: 'uppercase',
              minWidth: 60,
              userSelect: 'none',
            }}
          >
            {CHANNEL_LABELS[ch]}
          </label>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round((channelVolumes[ch] ?? 1.0) * 100)}
            onChange={(e) => handleSliderChange(ch, e.target.value)}
            aria-label={`${CHANNEL_LABELS[ch]} volume`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((channelVolumes[ch] ?? 1.0) * 100)}
            className="vn-volume-slider"
            style={sliderStyle(channelVolumes[ch] ?? 1.0)}
          />

          <span
            style={{
              color: CSS_VARS.valueColor,
              fontFamily: CSS_VARS.labelFont,
              fontSize: CSS_VARS.labelSize,
              fontWeight: CSS_VARS.labelWeight,
              letterSpacing: CSS_VARS.labelSpacing,
              minWidth: 36,
              textAlign: 'right' as const,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pct(channelVolumes[ch] ?? 1.0)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Generates inline styles for a range input, applying CSS variable-driven
 * colours to the track and thumb via a data-URI SVG background hack that
 * works across browsers for SSR-compatible rendering.
 *
 * The fill percentage is baked into a linear-gradient so the slider track
 * visually fills to the correct level.
 */
function sliderStyle(volume: number): React.CSSProperties {
  const fillPct = Math.round(volume * 100)

  return {
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    width: '100%',
    maxWidth: 300,
    height: 6,
    background: `linear-gradient(to right, ${CSS_VARS.trackFill} 0%, ${CSS_VARS.trackFill} ${fillPct}%, ${CSS_VARS.trackBg} ${fillPct}%, ${CSS_VARS.trackBg} 100%)`,
    border: `1px solid ${CSS_VARS.trackBorder}`,
    borderRadius: 0,
    outline: 'none',
    cursor: 'pointer',
    // Thumb styling via pseudo-element workaround — inline styles
    // only reach the track; thumb gets CSS vars at runtime.
  }
}
