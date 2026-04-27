import { useEffect, useState } from 'react'
import type { SaveManager } from '../SaveManager.ts'
import type { GameSaveState, SlotInfo } from '../types/save.d.ts'

interface SaveLoadMenuProps {
  isOpen: boolean
  onClose: () => void
  saveManager: SaveManager
  /** Returns the current game state to be written when the player clicks Save. */
  getState: () => GameSaveState
  /** Called with the loaded `GameSaveState` after a successful slot load. */
  onLoad: (state: GameSaveState) => void
}

/** Format a millisecond timestamp as a human-readable date/time string. */
export function formatTimestamp(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

export function formatPlaytime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function resolveSaveThumbnail(thumbnail: string | undefined): string | null {
  if (!thumbnail) return null
  if (thumbnail.startsWith('http') || thumbnail.startsWith('/') || thumbnail.startsWith('./')) return thumbnail
  return `./assets/${thumbnail}`
}

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.75)',
}

const PANEL_STYLE: React.CSSProperties = {
  width: 'min(820px, calc(100vw - 32px))',
  background: 'rgba(28,27,27,0.98)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 0,
  padding: '26px 32px 28px',
  fontFamily: 'var(--vn-font, "Manrope", sans-serif)',
  color: '#e5e2e1',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  maxHeight: '86vh',
  overflowY: 'auto',
  boxShadow: '0 28px 90px rgba(0,0,0,0.5)',
}

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '0.5px solid rgba(255,255,255,0.1)',
  paddingBottom: 16,
}

const TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 500,
  color: '#ffffff',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
}

const CLOSE_BTN_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 0,
  color: 'rgba(229,226,225,0.6)',
  fontSize: 16,
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'color 0.1s linear, border-color 0.1s linear',
  flexShrink: 0,
}

const SLOT_LIST_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  borderTop: '0.5px solid rgba(255,255,255,0.08)',
}

const THUMB_STYLE: React.CSSProperties = {
  width: 96,
  height: 54,
  objectFit: 'cover',
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(255,255,255,0.04)',
  flexShrink: 0,
  boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
}

const THUMB_PLACEHOLDER_STYLE: React.CSSProperties = {
  ...THUMB_STYLE,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.18)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

const SAVE_BTN_STYLE: React.CSSProperties = {
  flexShrink: 0,
  minWidth: 76,
  padding: '0 10px',
  height: 30,
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 0,
  color: 'rgba(229,226,225,0.76)',
  fontFamily: 'inherit',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.1s linear, color 0.1s linear, border-color 0.1s linear',
}

const LOAD_BTN_STYLE: React.CSSProperties = {
  flexShrink: 0,
  minWidth: 76,
  padding: '0 10px',
  height: 30,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 0,
  color: 'rgba(229,226,225,0.52)',
  fontFamily: 'inherit',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 0.1s linear, color 0.1s linear, border-color 0.1s linear',
}

const DELETE_BTN_STYLE: React.CSSProperties = {
  ...LOAD_BTN_STYLE,
  color: 'rgba(255,180,171,0.7)',
  border: '1px solid rgba(255,180,171,0.28)',
}

const ERROR_BANNER_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 0,
  background: 'rgba(255,180,171,0.05)',
  border: '1px solid rgba(255,180,171,0.3)',
  color: '#ffb4ab',
  fontSize: 11,
  letterSpacing: '0.05em',
}

const CONFIRM_BANNER_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 0,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e5e2e1',
  fontSize: 11,
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const SLOT_ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '82px minmax(0, 1fr) 86px',
  alignItems: 'center',
  gap: 14,
  minHeight: 96,
  padding: '14px 0',
  borderBottom: '0.5px solid rgba(255,255,255,0.08)',
}

const SLOT_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  lineHeight: 1.45,
}

const SLOT_CONTENT_STYLE: React.CSSProperties = {
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: '96px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 14,
}

const SLOT_META_STYLE: React.CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
}

const SLOT_TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 17,
  lineHeight: 1.15,
  fontWeight: 300,
  color: '#f2eeee',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const SLOT_SUBTITLE_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 400,
  color: 'rgba(229,226,225,0.46)',
  letterSpacing: '0.04em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const SLOT_TIME_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  color: 'rgba(229,226,225,0.36)',
  letterSpacing: '0.04em',
}

const SLOT_ACTIONS_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
  maxWidth: 86,
}

function SlotRow({
  slotKey,
  info,
  onSave,
  onLoad,
  onDelete,
}: {
  slotKey: number | 'auto'
  info: SlotInfo | undefined
  onSave: () => void
  onLoad?: (() => void) | undefined
  onDelete?: (() => void) | undefined
}) {
  const label = slotKey === 'auto' ? 'Auto Save' : `Slot ${slotKey}`
  const isOccupied = info !== undefined
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const thumbnailSrc = thumbnailFailed ? null : resolveSaveThumbnail(info?.meta.thumbnail)

  useEffect(() => {
    setThumbnailFailed(false)
  }, [info?.meta.thumbnail])

  return (
    <div style={SLOT_ROW_STYLE}>
      <div
        style={{
          ...SLOT_LABEL_STYLE,
          color: isOccupied ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
        }}
      >
        {label}
      </div>

      <div style={SLOT_CONTENT_STYLE}>
        {isOccupied ? (
          <>
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={() => setThumbnailFailed(true)}
              style={THUMB_STYLE}
            />
          ) : (
            <div style={THUMB_PLACEHOLDER_STYLE} aria-hidden="true">
              No Img
            </div>
          )}
          <div style={SLOT_META_STYLE}>
            <h3 style={SLOT_TITLE_STYLE}>{info.meta.displayName}</h3>
            <span style={SLOT_SUBTITLE_STYLE}>{info.meta.sceneName}</span>
            <span style={SLOT_TIME_STYLE}>
              {formatTimestamp(info.meta.timestamp)} · {formatPlaytime(info.meta.playtime)}
            </span>
          </div>
          </>
        ) : (
          <>
          <div style={THUMB_PLACEHOLDER_STYLE} aria-hidden="true">
            Empty
          </div>
          <span
            style={{
              ...SLOT_SUBTITLE_STYLE,
              color: 'rgba(229,226,225,0.28)',
            }}
          >
            Empty slot
          </span>
          </>
        )}
      </div>

      <div style={SLOT_ACTIONS_STYLE}>
        <button
          onClick={onSave}
          style={SAVE_BTN_STYLE}
          aria-label={`Save to ${label}`}
          type="button"
        >
          Save
        </button>
        {isOccupied && onLoad !== undefined && (
          <button
            onClick={onLoad}
            style={LOAD_BTN_STYLE}
            aria-label={`Load from ${label}`}
            type="button"
          >
            Load
          </button>
        )}
        {isOccupied && onDelete !== undefined && (
          <button
            onClick={onDelete}
            style={DELETE_BTN_STYLE}
            aria-label={`Delete ${label}`}
            type="button"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Overlay menu for browsing and writing save slots.
 * Renders when `isOpen` is `true`; calls `onClose` on close-button click or Escape key.
 * @param isOpen - Whether the menu is visible.
 * @param onClose - Callback invoked when the player dismisses the menu.
 * @param saveManager - The `SaveManager` instance used to read and write slot data.
 * @param getState - Returns the current `GameSaveState` to write when the player saves.
 */
export function SaveLoadMenu({ isOpen, onClose, saveManager, getState, onLoad }: SaveLoadMenuProps) {
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveCount, setSaveCount] = useState(0)
  const [pendingOverwriteSlot, setPendingOverwriteSlot] = useState<number | 'auto' | null>(null)
  const [pendingDeleteSlot, setPendingDeleteSlot] = useState<number | 'auto' | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handleSave(slot: number | 'auto') {
    const occupied = occupiedByKey.has(String(slot))
    if (occupied) {
      setPendingOverwriteSlot(slot)
      return
    }
    const ok = saveManager.save(slot, getState())
    if (ok) {
      setSaveError(null)
    } else {
      setSaveError('Could not save — storage may be full or unavailable.')
    }
    setSaveCount(c => c + 1)
  }

  function confirmOverwrite() {
    if (pendingOverwriteSlot === null) return
    const ok = saveManager.save(pendingOverwriteSlot, getState())
    if (ok) {
      setSaveError(null)
    } else {
      setSaveError('Could not save — storage may be full or unavailable.')
    }
    setPendingOverwriteSlot(null)
    setSaveCount(c => c + 1)
  }

  function cancelOverwrite() {
    setPendingOverwriteSlot(null)
  }

  function confirmDelete() {
    if (pendingDeleteSlot === null) return
    saveManager.deleteSlot(pendingDeleteSlot)
    setPendingDeleteSlot(null)
    setSaveCount(c => c + 1)
  }

  function cancelDelete() {
    setPendingDeleteSlot(null)
  }

  function handleLoad(slot: number | 'auto') {
    const saveSlot = saveManager.load(slot)
    if (saveSlot !== null) {
      setLoadError(null)
      onLoad(saveSlot.state)
      onClose()
    } else {
      setLoadError('Could not load — save data is missing or corrupted.')
    }
  }

  // Re-read slots every render so the list reflects the latest state (saveCount drives re-renders).
  void saveCount
  const occupiedSlots = saveManager.listSlots()
  const occupiedByKey = new Map<string, SlotInfo>(
    occupiedSlots.map(s => [String(s.slot), s]),
  )
  const totalSlots = saveManager.slotCount
  const allSlotKeys: (number | 'auto')[] = [
    'auto',
    ...Array.from({ length: totalSlots }, (_, i) => i + 1),
  ]

  return (
    <div
      style={OVERLAY_STYLE}
      onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Save / Load"
    >
      <div style={PANEL_STYLE}>
        <div style={HEADER_STYLE}>
          <h2 style={TITLE_STYLE}>Save / Load</h2>
          <button
            onClick={onClose}
            style={CLOSE_BTN_STYLE}
            aria-label="Close save menu"
            type="button"
          >
            ×
          </button>
        </div>

        {saveError !== null && (
          <div style={ERROR_BANNER_STYLE} role="alert">
            {saveError}
          </div>
        )}

        {loadError !== null && (
          <div style={ERROR_BANNER_STYLE} role="alert">
            {loadError}
          </div>
        )}

        {pendingOverwriteSlot !== null && (
          <div style={CONFIRM_BANNER_STYLE} role="alertdialog" aria-live="polite">
            <div style={{ flex: 1 }}>
              {pendingOverwriteSlot === 'auto' ? 'Auto save slot already exists.' : `Slot ${pendingOverwriteSlot} already contains a save.`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmOverwrite}
                style={SAVE_BTN_STYLE}
                type="button"
              >
                Overwrite
              </button>
              <button
                onClick={cancelOverwrite}
                style={LOAD_BTN_STYLE}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {pendingDeleteSlot !== null && (
          <div style={CONFIRM_BANNER_STYLE} role="alertdialog" aria-live="polite">
            <div style={{ flex: 1 }}>
              {pendingDeleteSlot === 'auto' ? 'Delete auto save slot?' : `Delete slot ${pendingDeleteSlot}?`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={confirmDelete}
                style={DELETE_BTN_STYLE}
                type="button"
              >
                Delete
              </button>
              <button
                onClick={cancelDelete}
                style={LOAD_BTN_STYLE}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={SLOT_LIST_STYLE}>
          {allSlotKeys.map(slotKey => (
            <SlotRow
              key={String(slotKey)}
              slotKey={slotKey}
              info={occupiedByKey.get(String(slotKey))}
              onSave={() => handleSave(slotKey)}
              onLoad={occupiedByKey.has(String(slotKey)) ? () => handleLoad(slotKey) : undefined}
              onDelete={occupiedByKey.has(String(slotKey)) ? () => setPendingDeleteSlot(slotKey) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
