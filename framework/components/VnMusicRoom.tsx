import { useEffect, useMemo, useRef, useState } from 'react'
import type { MusicRoomTrack, ReplayScene } from '../types/extras.d.ts'

export interface VnMusicRoomProps {
  isOpen: boolean
  tracks: MusicRoomTrack[]
  unlockedTrackIds: string[]
  replayScenes?: ReplayScene[]
  unlockedReplayIds?: string[]
  onClose: () => void
}

function audioSrc(track: MusicRoomTrack): string {
  if (track.file) {
    if (/^https?:\/\//.test(track.file) || track.file.startsWith('./') || track.file.startsWith('/')) return track.file
    return `./assets/${track.file}`
  }
  return `./assets/audio/bgm/${track.id}.ogg`
}

export function VnMusicRoom({ isOpen, tracks, unlockedTrackIds, replayScenes = [], unlockedReplayIds = [], onClose }: VnMusicRoomProps) {
  const unlockedTracks = useMemo(() => new Set(unlockedTrackIds), [unlockedTrackIds])
  const unlockedReplay = useMemo(() => new Set(unlockedReplayIds), [unlockedReplayIds])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setPlayingId(null)
  }

  useEffect(() => stop, [])
  useEffect(() => {
    if (!isOpen) stop()
  }, [isOpen])

  if (!isOpen) return null

  const play = (track: MusicRoomTrack) => {
    if (playingId === track.id) {
      stop()
      return
    }
    stop()
    const audio = new Audio(audioSrc(track))
    audio.loop = track.loop ?? true
    audio.volume = track.volume ?? 0.8
    audio.addEventListener('ended', () => setPlayingId(null), { once: true })
    audioRef.current = audio
    setPlayingId(track.id)
    void audio.play().catch(() => setPlayingId(null))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Music room"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      style={overlayStyle}
    >
      <div style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Extras</div>
            <h2 style={titleStyle}>Music Room</h2>
          </div>
          <button type="button" onClick={onClose} style={buttonStyle}>Close</button>
        </header>

        <div style={bodyStyle}>
          <section aria-label="Unlocked music tracks">
            <h3 style={sectionTitleStyle}>Tracks</h3>
            <div style={listStyle}>
              {tracks.map(track => {
                const isUnlocked = unlockedTracks.has(track.id)
                return (
                  <button
                    key={track.id}
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => play(track)}
                    aria-pressed={playingId === track.id}
                    style={{
                      ...rowButtonStyle,
                      opacity: isUnlocked ? 1 : 0.45,
                      borderColor: playingId === track.id ? 'var(--vn-accent, #c084fc)' : 'rgba(255,255,255,0.16)',
                    }}
                  >
                    <span>
                      <strong style={rowTitleStyle}>{isUnlocked ? (track.title ?? track.id) : 'Locked track'}</strong>
                      {isUnlocked && track.description && <span style={rowDescriptionStyle}>{track.description}</span>}
                    </span>
                    <span style={rowActionStyle}>{playingId === track.id ? 'Stop' : 'Play'}</span>
                  </button>
                )
              })}
              {tracks.length === 0 && <div style={emptyStyle}>No tracks configured.</div>}
            </div>
          </section>

          <section aria-label="Unlocked replay scenes">
            <h3 style={sectionTitleStyle}>Replay</h3>
            <div style={listStyle}>
              {replayScenes.map(scene => {
                const isUnlocked = unlockedReplay.has(scene.id)
                return (
                  <div
                    key={scene.id}
                    aria-disabled={!isUnlocked}
                    style={{ ...replayRowStyle, opacity: isUnlocked ? 1 : 0.45 }}
                  >
                    <strong style={rowTitleStyle}>{isUnlocked ? (scene.title ?? scene.id) : 'Locked replay'}</strong>
                    {isUnlocked && scene.description && <span style={rowDescriptionStyle}>{scene.description}</span>}
                  </div>
                )
              })}
              {replayScenes.length === 0 && <div style={emptyStyle}>No replay scenes configured.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: 155,
  padding: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.72)',
  pointerEvents: 'auto',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
} as const

const panelStyle = {
  width: 'min(820px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 48px)',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(12,12,14,0.96)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
  color: '#f7f3ef',
} as const

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '18px 20px',
  borderBottom: '1px solid rgba(255,255,255,0.12)',
} as const

const eyebrowStyle = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'rgba(255,255,255,0.54)',
} as const

const titleStyle = {
  margin: '3px 0 0',
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: 0,
} as const

const buttonStyle = {
  height: 34,
  padding: '0 14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 0,
  color: '#f7f3ef',
  cursor: 'pointer',
  font: 'inherit',
} as const

const bodyStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 18,
  padding: 20,
  overflow: 'auto',
} as const

const sectionTitleStyle = {
  margin: '0 0 10px',
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.66)',
} as const

const listStyle = {
  display: 'grid',
  gap: 9,
} as const

const rowButtonStyle = {
  minHeight: 66,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '11px 12px',
  textAlign: 'left',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 0,
  color: '#f7f3ef',
  cursor: 'pointer',
  font: 'inherit',
} as const

const replayRowStyle = {
  minHeight: 66,
  display: 'grid',
  gap: 4,
  padding: '11px 12px',
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.14)',
} as const

const rowTitleStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
} as const

const rowDescriptionStyle = {
  display: 'block',
  marginTop: 4,
  fontSize: 12,
  color: 'rgba(255,255,255,0.62)',
  lineHeight: 1.4,
} as const

const rowActionStyle = {
  flex: '0 0 auto',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.68)',
} as const

const emptyStyle = {
  padding: '18px 12px',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.56)',
  fontSize: 13,
} as const
