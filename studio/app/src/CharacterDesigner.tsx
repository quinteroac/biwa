import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCharacter, fetchCharacters, generateCharacterAtlas, saveCharacter } from './api.ts'
import type { StudioCharacterDraft, StudioProjectSummary } from '../../shared/types.ts'

const positionOptions = ['left', 'center', 'right']
const NEW_CHARACTER_PATH = '__new_character__.md'

function newCharacterDraft(): StudioCharacterDraft {
  return {
    id: 'new_character',
    displayName: 'New Character',
    role: '',
    physicalDescription: '',
    personality: '',
    palette: '',
    outfit: '',
    prompt: '',
    nameColor: '#ffffff',
    isNarrator: false,
    defaultPosition: 'center',
    defaultExpression: 'neutral',
    scale: 1,
    offset: { x: 0, y: 0 },
    animation: {
      type: 'spritesheet',
      file: 'characters/new_character/new_character_spritesheet.png',
      atlas: 'characters/new_character/new_character_atlas.json',
    },
    expressions: ['neutral', 'happy', 'sad', 'angry'],
    body: '',
  }
}

function characterPathForDraft(draft: StudioCharacterDraft, activePath: string | null): string {
  if (activePath && activePath !== NEW_CHARACTER_PATH) return activePath
  const id = draft.id.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'new_character'
  return `${id}.md`
}

function draftFromCharacter(character: NonNullable<Awaited<ReturnType<typeof fetchCharacter>>['character']>): StudioCharacterDraft {
  return {
    id: character.id,
    displayName: character.displayName,
    role: character.role,
    physicalDescription: character.physicalDescription,
    personality: character.personality,
    palette: character.palette,
    outfit: character.outfit,
    prompt: character.prompt,
    nameColor: character.nameColor,
    isNarrator: character.isNarrator,
    defaultPosition: character.defaultPosition,
    defaultExpression: character.defaultExpression,
    scale: character.scale,
    offset: character.offset,
    animation: character.animation,
    expressions: character.expressions,
    body: character.body,
  }
}

function expressionText(draft: StudioCharacterDraft): string {
  return draft.expressions.join(', ')
}

function updateExpressionText(draft: StudioCharacterDraft, text: string): StudioCharacterDraft {
  const expressions = text.split(',').map(item => item.trim()).filter(Boolean)
  return { ...draft, expressions }
}

function numericValue(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function animationFile(draft: StudioCharacterDraft): string {
  return typeof draft.animation['file'] === 'string' ? draft.animation['file'] : ''
}

function animationAtlas(draft: StudioCharacterDraft): string {
  return typeof draft.animation['atlas'] === 'string' ? draft.animation['atlas'] : ''
}

function setAnimationField(draft: StudioCharacterDraft, key: string, value: string): StudioCharacterDraft {
  return {
    ...draft,
    animation: {
      ...draft.animation,
      [key]: value,
    },
  }
}

function atlasPreviewStyle(character: NonNullable<Awaited<ReturnType<typeof fetchCharacter>>['character']>, draft: StudioCharacterDraft): CSSProperties | null {
  const frame = character.atlas?.previewFrame
  const sheet = character.atlas?.sheetSize
  if (!character.previewUrl || !frame || !sheet || sheet.w <= 0 || sheet.h <= 0) return null
  const displayScale = Math.min(1, 280 / frame.w, 360 / frame.h)
  return {
    width: `${frame.w * displayScale}px`,
    height: `${frame.h * displayScale}px`,
    backgroundImage: `url("${character.previewUrl}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sheet.w * displayScale}px ${sheet.h * displayScale}px`,
    backgroundPosition: `-${frame.x * displayScale}px -${frame.y * displayScale}px`,
    transform: `translate(${draft.offset.x ?? 0}px, ${draft.offset.y ?? 0}px) scale(${draft.scale})`,
  }
}

export function CharacterDesigner(props: {
  project: StudioProjectSummary
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [draft, setDraft] = useState<StudioCharacterDraft | null>(null)
  const charactersQuery = useQuery({
    queryKey: ['studio-characters', props.project.id],
    queryFn: () => fetchCharacters(props.project.id),
  })
  const characters = charactersQuery.data?.characters ?? []
  const activePath = selectedPath ?? characters[0]?.path ?? null
  const isNewCharacter = activePath === NEW_CHARACTER_PATH
  const characterQuery = useQuery({
    queryKey: ['studio-character', props.project.id, activePath],
    queryFn: () => fetchCharacter(props.project.id, activePath ?? ''),
    enabled: Boolean(activePath) && !isNewCharacter,
  })
  const activeCharacter = characterQuery.data?.character
  const expressionPreview = useMemo(() => draft?.expressions ?? [], [draft])
  const previewStyle = activeCharacter && draft ? atlasPreviewStyle(activeCharacter, draft) : null
  const saveMutation = useMutation({
    mutationFn: () => {
      const currentDraft = draft as StudioCharacterDraft
      return saveCharacter(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft)
    },
    onSuccess: response => {
      setDraft(draftFromCharacter(response.character))
      setSelectedPath(response.character.path)
      queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const atlasMutation = useMutation({
    mutationFn: () => {
      const currentDraft = draft as StudioCharacterDraft
      return generateCharacterAtlas(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft)
    },
    onSuccess: response => {
      setDraft(draftFromCharacter(response.character))
      setSelectedPath(response.character.path)
      queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, activePath] })
      queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })

  useEffect(() => {
    if (!selectedPath && characters[0]) setSelectedPath(characters[0].path)
  }, [characters, selectedPath])

  useEffect(() => {
    if (isNewCharacter) return
    if (!characterQuery.data) return
    setDraft(draftFromCharacter(characterQuery.data.character))
  }, [characterQuery.data, isNewCharacter])

  return (
    <div className="character-workspace">
      <aside className="studio-panel character-list-panel">
        <div className="studio-panel-heading">
          <span>Characters</span>
          <button
            className="ghost-button"
            onClick={() => {
              setSelectedPath(NEW_CHARACTER_PATH)
              setDraft(newCharacterDraft())
            }}
            type="button"
          >
            New
          </button>
        </div>
        <div className="scene-list">
          {isNewCharacter ? (
            <button className="is-active" type="button">
              <span>{draft?.displayName ?? 'New Character'}</span>
              <small>unsaved</small>
            </button>
          ) : null}
          {characters.map(character => (
            <button
              className={character.path === activePath ? 'is-active' : ''}
              key={character.path}
              onClick={() => setSelectedPath(character.path)}
              type="button"
            >
              <span>{character.displayName}</span>
              <small>{character.id}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="studio-panel character-editor-panel">
        <div className="studio-panel-heading">
          <span>Character Sheet</span>
          <div className="story-actions">
            <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
              Doctor
            </button>
            <button className="ghost-button" disabled={!draft || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
              {saveMutation.isPending ? 'Saving' : 'Save Character'}
            </button>
          </div>
        </div>

        {draft ? (
          <div className="scene-form">
            <div className="scene-form-grid">
              <label>
                <span>Display Name</span>
                <input value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} />
              </label>
              <label>
                <span>Role</span>
                <input value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Physical Description</span>
              <textarea value={draft.physicalDescription} onChange={event => setDraft({ ...draft, physicalDescription: event.target.value })} />
            </label>
            <label>
              <span>Personality</span>
              <textarea value={draft.personality} onChange={event => setDraft({ ...draft, personality: event.target.value })} />
            </label>
            <div className="scene-form-grid">
              <label>
                <span>Palette</span>
                <input value={draft.palette} onChange={event => setDraft({ ...draft, palette: event.target.value })} />
              </label>
              <label>
                <span>Outfit</span>
                <input value={draft.outfit} onChange={event => setDraft({ ...draft, outfit: event.target.value })} />
              </label>
            </div>
            <label>
              <span>Prompt Base</span>
              <textarea value={draft.prompt} onChange={event => setDraft({ ...draft, prompt: event.target.value })} />
            </label>

            <div className="character-fieldset">
              <div className="studio-panel-heading">
                <span>Runtime Metadata</span>
                <small>VnCharacter</small>
              </div>
              <div className="scene-form-grid">
                <label>
                  <span>Default Position</span>
                  <select value={draft.defaultPosition} onChange={event => setDraft({ ...draft, defaultPosition: event.target.value })}>
                    {positionOptions.map(position => <option key={position} value={position}>{position}</option>)}
                  </select>
                </label>
                <label>
                  <span>Default Expression</span>
                  <input value={draft.defaultExpression} onChange={event => setDraft({ ...draft, defaultExpression: event.target.value })} />
                </label>
                <label>
                  <span>Scale</span>
                  <input
                    step="0.01"
                    type="number"
                    value={draft.scale}
                    onChange={event => setDraft({ ...draft, scale: numericValue(event.target.value, draft.scale) })}
                  />
                </label>
                <label>
                  <span>Name Color</span>
                  <input value={draft.nameColor} onChange={event => setDraft({ ...draft, nameColor: event.target.value })} />
                </label>
                <label>
                  <span>Offset X</span>
                  <input
                    type="number"
                    value={draft.offset.x ?? 0}
                    onChange={event => setDraft({ ...draft, offset: { ...draft.offset, x: numericValue(event.target.value, 0) } })}
                  />
                </label>
                <label>
                  <span>Offset Y</span>
                  <input
                    type="number"
                    value={draft.offset.y ?? 0}
                    onChange={event => setDraft({ ...draft, offset: { ...draft.offset, y: numericValue(event.target.value, 0) } })}
                  />
                </label>
              </div>
            </div>

            <div className="character-fieldset">
              <div className="studio-panel-heading">
                <span>Atlas Mapping</span>
                <button
                  className="ghost-button"
                  disabled={!draft || atlasMutation.isPending}
                  onClick={() => atlasMutation.mutate()}
                  type="button"
                >
                  {atlasMutation.isPending ? 'Generating' : 'Generate Atlas'}
                </button>
              </div>
              <label>
                <span>Expressions</span>
                <input value={expressionText(draft)} onChange={event => setDraft(updateExpressionText(draft, event.target.value))} />
              </label>
              <div className="scene-form-grid">
                <label>
                  <span>Spritesheet</span>
                  <input value={animationFile(draft)} onChange={event => setDraft(setAnimationField(draft, 'file', event.target.value))} />
                </label>
                <label>
                  <span>Atlas JSON</span>
                  <input value={animationAtlas(draft)} onChange={event => setDraft(setAnimationField(draft, 'atlas', event.target.value))} />
                </label>
              </div>
              <div className="expression-list" aria-label="Expression map">
                {expressionPreview.map(expression => (
                  <span key={expression}>{expression}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">Select a character to edit its sheet and runtime metadata.</p>
        )}
      </section>

      <aside className="studio-panel character-preview-panel">
        <div className="studio-panel-heading">
          <span>Sprite Preview</span>
          <small>{activeCharacter?.atlas?.frameCount ?? 0} frames</small>
        </div>
        <div className="character-preview-frame">
          {activeCharacter?.previewUrl && draft && previewStyle ? (
            <div
              aria-label={`${activeCharacter.displayName} ${activeCharacter.atlas?.previewFrame?.name ?? draft.defaultExpression}`}
              className="character-preview-crop"
              role="img"
              style={previewStyle}
            />
          ) : activeCharacter?.previewUrl && draft ? (
            <img
              alt={activeCharacter.displayName}
              className="character-preview-sprite"
              src={activeCharacter.previewUrl}
              style={{
                transform: `translate(${draft.offset.x ?? 0}px, ${draft.offset.y ?? 0}px) scale(${draft.scale})`,
              }}
            />
          ) : (
            <span>No sprite preview</span>
          )}
        </div>
        <dl className="character-atlas-facts">
          <div>
            <dt>Atlas</dt>
            <dd>{activeCharacter?.atlasPath || 'Not configured'}</dd>
          </div>
          <div>
            <dt>Frames</dt>
            <dd>{activeCharacter?.atlas?.frameNames.join(', ') || 'No atlas frames read'}</dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd>{activeCharacter?.atlas?.tags.join(', ') || 'No frame tags'}</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}
