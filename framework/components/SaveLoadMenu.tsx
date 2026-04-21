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

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
}

const PANEL_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: 540,
  background: 'var(--vn-dialog-bg, rgba(10,10,20,0.95))',
  border: '1px solid var(--vn-accent, #c084fc)',
  borderRadius: 14,
  padding: '28px 32px',
  fontFamily: 'var(--vn-font, "Georgia", serif)',
  color: '#f8f8f8',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  maxHeight: '80vh',
  overflowY: 'auto',
}

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 'bold',
  color: 'var(--vn-accent, #c084fc)',
  letterSpacing: '0.03em',
}

const CLOSE_BTN_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  color: '#f8f8f8',
  fontSize: 20,
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s',
  flexShrink: 0,
}

const SLOT_LIST_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const SAVE_BTN_STYLE: React.CSSProperties = {
  marginLeft: 'auto',
  flexShrink: 0,
  padding: '5px 14px',
  background: 'transparent',
  border: '1px solid var(--vn-accent, #c084fc)',
  borderRadius: 6,
  color: 'var(--vn-accent, #c084fc)',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  transition: 'background 0.15s, color 0.15s',
}

const LOAD_BTN_STYLE: React.CSSProperties = {
  marginLeft: 8,
  flexShrink: 0,
  padding: '5px 14px',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.35)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.75)',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  transition: 'background 0.15s, color 0.15s',
}

const ERROR_BANNER_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(220,50,50,0.15)',
  border: '1px solid rgba(220,50,50,0.5)',
  color: '#fca5a5',
  fontSize: 13,
}

const CONFIRM_BANNER_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(40,40,40,0.9)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#f8f8f8',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

function SlotRow({
  slotKey,
  info,
  onSave,
  onLoad,
}: {
  slotKey: number | 'auto'
  info: SlotInfo | undefined
  onSave: () => void
  onLoad?: () => void
}) {
  const label = slotKey === 'auto' ? 'Auto Save' : `Slot ${slotKey}`
  const isOccupied = info !== undefined

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 16px',
        borderRadius: 8,
        background: isOccupied
          ? 'var(--vn-choice-hover, rgba(192,132,252,0.1))'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isOccupied ? 'var(--vn-accent, #c084fc)' : 'rgba(255,255,255,0.1)'}`,
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          width: 80,
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 'bold',
          color: isOccupied ? 'var(--vn-accent, #c084fc)' : 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>

      {isOccupied ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: '#f8f8f8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {info.meta.displayName}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {info.meta.sceneName}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {formatTimestamp(info.meta.timestamp)}
          </span>
        </div>
      ) : (
        <span
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.3)',
            fontStyle: 'italic',
          }}
        >
          Empty slot
        </span>
      )}
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

        <div style={SLOT_LIST_STYLE}>
          {allSlotKeys.map(slotKey => (
            <SlotRow
              key={String(slotKey)}
              slotKey={slotKey}
              info={occupiedByKey.get(String(slotKey))}
              onSave={() => handleSave(slotKey)}
              onLoad={occupiedByKey.has(String(slotKey)) ? () => handleLoad(slotKey) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
