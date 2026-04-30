import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteCharacterSheetConcept, editCharacterSheetConcept, fetchCharacter, fetchCharacters, generateCharacterAtlas, generateCharacterSheetConcept, saveCharacter, uploadCharacterSheetConcept } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioCharacterDraft, StudioCharacterItem, StudioCharacterSheetArtType, StudioProjectSummary } from '../../shared/types.ts'

const genderOptions = ['Male', 'Female', 'Transgender', 'Non-binary', 'Other']
const NEW_CHARACTER_PATH = '__new_character__.md'
const characterTabs = ['Character Sheet', 'Spritesheet', 'Sprites', 'Animations'] as const
const characterSheetArtOptions = Object.freeze([
  { id: 'conceptArt', label: 'Concept Art', uploadLabel: 'Upload concept art', icon: 'assets', slug: 'concept-art' },
  { id: 'silhouetteSketch', label: 'Silhouette Sketch', uploadLabel: 'Upload silhouette sketch', icon: 'characters', slug: 'silhouette-sketch' },
  { id: 'characterSheet', label: 'Character Sheet', uploadLabel: 'Upload character sheet', icon: 'file', slug: 'character-sheet' },
  { id: 'actionPoses', label: 'Action Poses', uploadLabel: 'Upload action poses', icon: 'run-doctor', slug: 'action-poses' },
] satisfies Array<{ id: StudioCharacterSheetArtType; label: string; uploadLabel: string; icon: 'characters' | 'assets' | 'file' | 'run-doctor'; slug: string }>)

type CharacterTab = typeof characterTabs[number]
type StudioCharacter = NonNullable<Awaited<ReturnType<typeof fetchCharacter>>['character']>

function newCharacterDraft(): StudioCharacterDraft {
  return {
    id: 'new-character',
    displayName: 'New Character',
    role: '',
    age: '',
    gender: '',
    tags: [],
    physicalDescription: '',
    expressionsText: ['neutral'],
    personality: '',
    traits: [],
    motivations: '',
    fears: '',
    internalConflict: '',
    backstory: '',
    keyEvents: [],
    arcInitial: '',
    arcBreak: '',
    arcFinal: '',
    relationships: [],
    authorNotes: '',
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
      file: 'characters/new-character/new-character_spritesheet.png',
      atlas: 'characters/new-character/new-character_atlas.json',
    },
    expressions: ['neutral', 'happy', 'sad', 'angry'],
    characterSheet: {
      main: '',
      concepts: [],
      generated: [],
    },
    body: '',
  }
}

function sanitizeCharacterId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function characterPathForDraft(draft: StudioCharacterDraft, activePath: string | null): string {
  if (activePath && activePath !== NEW_CHARACTER_PATH) return activePath
  const id = sanitizeCharacterId(draft.id) || 'new-character'
  return `${id}.md`
}

function draftFromCharacter(character: StudioCharacter): StudioCharacterDraft {
  return {
    id: character.id,
    displayName: character.displayName,
    role: character.role,
    age: character.age,
    gender: character.gender,
    tags: character.tags,
    physicalDescription: character.physicalDescription,
    expressionsText: character.expressionsText,
    personality: character.personality,
    traits: character.traits,
    motivations: character.motivations,
    fears: character.fears,
    internalConflict: character.internalConflict,
    backstory: character.backstory,
    keyEvents: character.keyEvents,
    arcInitial: character.arcInitial,
    arcBreak: character.arcBreak,
    arcFinal: character.arcFinal,
    relationships: character.relationships,
    authorNotes: character.authorNotes,
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
    characterSheet: character.characterSheet,
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

function listText(items: string[] | undefined): string {
  return (items ?? []).join(', ')
}

function listFromText(text: string): string[] {
  return text.split(',').map(item => item.trim()).filter(Boolean)
}

function updateStringList(items: string[] | undefined, index: number, value: string): string[] {
  const next = [...(items ?? [])]
  next[index] = value
  return next.map(item => item.trim()).filter(Boolean)
}

function appendStringList(items: string[] | undefined, fallback: string): string[] {
  return [...(items ?? []), fallback]
}

function paletteColors(draft: StudioCharacterDraft): string[] {
  const colors = listFromText(draft.palette)
  return [...colors, '#1b1c19', '#444748', '#747878', '#c4c7c7', '#ba1a1a'].slice(0, 5)
}

function updatePaletteColor(draft: StudioCharacterDraft, index: number, color: string): StudioCharacterDraft {
  const colors = paletteColors(draft)
  colors[index] = color
  return { ...draft, palette: colors.join(', ') }
}

function animationFile(draft: StudioCharacterDraft): string {
  return typeof draft.animation['file'] === 'string' ? draft.animation['file'] : ''
}

function spriteFrameStyle(character: StudioCharacter, frame: NonNullable<StudioCharacter['atlas']>['frames'][number], maxWidth: number, maxHeight: number): CSSProperties {
  const sheet = character.atlas?.sheetSize
  if (!character.previewUrl || !sheet || sheet.w <= 0 || sheet.h <= 0) return {}
  const scale = Math.min(1, maxWidth / frame.w, maxHeight / frame.h)
  return {
    width: `${Math.max(1, frame.w * scale)}px`,
    height: `${Math.max(1, frame.h * scale)}px`,
    backgroundImage: `url("${character.previewUrl}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
    backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
  }
}

function animationFrames(character: StudioCharacter, tagName: string): NonNullable<StudioCharacter['atlas']>['frames'] {
  const atlas = character.atlas
  if (!atlas) return []
  const frames = atlas.frames ?? []
  const tags = atlas.frameTags ?? []
  const tag = tags.find(item => item.name === tagName)
  if (!tag) return frames.slice(0, 8)
  return frames.slice(tag.from, tag.to + 1)
}

function characterGroup(character: Pick<StudioCharacterItem, 'role'>): string {
  return character.role || 'Supporting'
}

function characterConceptPreviewUrl(character: Pick<StudioCharacterItem, 'characterSheetUrls' | 'previewUrl'>): string | null {
  return character.characterSheetUrls.concepts[0] ?? character.characterSheetUrls.main ?? character.previewUrl
}

function characterSheetTags(draft: StudioCharacterDraft, fallbackRole: string | null): string[] {
  return [draft.role || fallbackRole || '', ...(draft.tags ?? []), ...draft.expressions].map(tag => tag.trim()).filter(Boolean).slice(0, 5)
}

function initials(name: string): string {
  const parts = name.split(/\s+/).map(part => part.trim()).filter(Boolean)
  return (parts[0]?.[0] ?? 'C') + (parts[1]?.[0] ?? 'H')
}

export function CharacterDesigner(props: {
  project: StudioProjectSummary
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [draft, setDraft] = useState<StudioCharacterDraft | null>(null)
  const [activeTab, setActiveTab] = useState<CharacterTab>('Character Sheet')
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null)
  const [selectedConceptIndex, setSelectedConceptIndex] = useState(0)
  const [generationMessage, setGenerationMessage] = useState('')
  const [generationMenuOpen, setGenerationMenuOpen] = useState(false)
  const [selectedArtTypes, setSelectedArtTypes] = useState<StudioCharacterSheetArtType[]>(['conceptArt'])
  const [editPrompt, setEditPrompt] = useState('')
  const [editPanelOpen, setEditPanelOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 })
  const [previewDragStart, setPreviewDragStart] = useState<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null)
  const [searchText, setSearchText] = useState('')
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
  const visibleCharacters = characters.filter(character => {
    const needle = searchText.trim().toLowerCase()
    if (!needle) return true
    return [character.displayName, character.role, character.id, ...character.tags]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })
  const expressionPreview = useMemo(() => draft?.expressions ?? [], [draft])
  const atlasFrames = activeCharacter?.atlas?.frames ?? []
  const atlasTags = activeCharacter?.atlas?.frameTags ?? []
  const activeAnimationName = selectedAnimation ?? atlasTags[0]?.name ?? activeCharacter?.defaultExpression ?? 'Idle'
  const activeAnimationFrames = activeCharacter ? animationFrames(activeCharacter, activeAnimationName) : []
  const fallbackRole = activeCharacter?.role || activeCharacter?.id || null
  const sheetTags = draft ? characterSheetTags(draft, fallbackRole) : []
  const characterSheetMainUrl = activeCharacter?.characterSheetUrls.main ?? null
  const characterSheetSlots = characterSheetArtOptions.map(option => {
    const generatedPaths = activeCharacter?.characterSheet.generated ?? []
    const generatedUrls = activeCharacter?.characterSheetUrls.generated ?? []
    let matchedIndex = -1
    for (let index = generatedPaths.length - 1; index >= 0; index -= 1) {
      const filename = generatedPaths[index]?.split('/').pop() ?? ''
      if (filename.startsWith(`${option.slug}-`)) {
        matchedIndex = index
        break
      }
    }
    if (matchedIndex >= 0) {
      return {
        ...option,
        path: generatedPaths[matchedIndex] ?? '',
        url: generatedUrls[matchedIndex] ?? null,
      }
    }
    if (option.id === 'conceptArt') {
      const conceptPaths = activeCharacter?.characterSheet.concepts ?? []
      const conceptUrls = activeCharacter?.characterSheetUrls.concepts ?? []
      const conceptIndex = Math.max(0, conceptPaths.length - 1)
      return {
        ...option,
        path: conceptPaths[conceptIndex] ?? '',
        url: conceptUrls[conceptIndex] ?? null,
      }
    }
    return { ...option, path: '', url: null }
  })
  const selectedConceptPath = characterSheetSlots[selectedConceptIndex]?.path ?? ''
  const selectedConceptUrl = characterSheetSlots[selectedConceptIndex]?.url ?? null
  const displayedCharacterSheetUrl = selectedConceptUrl ?? characterSheetMainUrl
  const activeCharacterPreviewUrl = activeCharacter ? characterConceptPreviewUrl(activeCharacter) : null
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
  const conceptUploadMutation = useMutation({
    mutationFn: (payload: { file: File; artType: StudioCharacterSheetArtType }) => {
      const currentDraft = draft as StudioCharacterDraft
      return uploadCharacterSheetConcept(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft, payload.file, payload.artType)
    },
    onSuccess: (data, variables) => {
      setDraft(draftFromCharacter(data.character))
      setSelectedPath(data.character.path)
      setSelectedConceptIndex(Math.max(0, characterSheetArtOptions.findIndex(option => option.id === variables.artType)))
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
    },
  })
  const conceptDeleteMutation = useMutation({
    mutationFn: (assetPath: string) => {
      const currentDraft = draft as StudioCharacterDraft
      return deleteCharacterSheetConcept(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft, assetPath)
    },
    onSuccess: data => {
      setDraft(draftFromCharacter(data.character))
      setSelectedConceptIndex(0)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
    },
  })
  const conceptGenerateMutation = useMutation({
    mutationFn: () => {
      const currentDraft = draft as StudioCharacterDraft
      return generateCharacterSheetConcept(
        props.project.id,
        characterPathForDraft(currentDraft, activePath),
        currentDraft,
        '',
        selectedArtTypes,
      )
    },
    onMutate: () => {
      setGenerationMenuOpen(false)
      setGenerationMessage('Sending request to OpenAI Images...')
    },
    onSuccess: data => {
      setDraft(draftFromCharacter(data.character))
      setSelectedPath(data.character.path)
      setSelectedConceptIndex(Math.max(0, data.character.characterSheet.concepts.length + data.character.characterSheet.generated.length - 1))
      setGenerationMessage(data.generated.length > 1 ? `Generated ${data.generated.length} images` : `Generated ${data.path}`)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
    },
    onError: error => {
      setGenerationMessage(error.message)
    },
  })
  const conceptEditMutation = useMutation({
    mutationFn: (payload: { assetPath: string; prompt: string }) => {
      const currentDraft = draft as StudioCharacterDraft
      return editCharacterSheetConcept(
        props.project.id,
        characterPathForDraft(currentDraft, activePath),
        currentDraft,
        payload.assetPath,
        payload.prompt,
      )
    },
    onMutate: () => {
      setGenerationMessage('Sending edit request to OpenAI Images...')
    },
    onSuccess: data => {
      setDraft(draftFromCharacter(data.character))
      setSelectedPath(data.character.path)
      setSelectedConceptIndex(Math.max(0, data.character.characterSheet.concepts.length + data.character.characterSheet.generated.length - 1))
      setEditPrompt('')
      setEditPanelOpen(false)
      setGenerationMessage(`Edited ${data.path}`)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
    },
    onError: error => {
      setGenerationMessage(error.message)
    },
  })
  const isGeneratingConcept = conceptGenerateMutation.isPending || conceptEditMutation.isPending

  useEffect(() => {
    if (!selectedPath && characters[0]) setSelectedPath(characters[0].path)
  }, [characters, selectedPath])

  useEffect(() => {
    setSelectedConceptIndex(0)
    setPreviewModalOpen(false)
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
    setPreviewDragStart(null)
    setEditPanelOpen(false)
    setEditPrompt('')
  }, [activePath])

  useEffect(() => {
    if (!previewModalOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewModalOpen(false)
    }
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
    setPreviewDragStart(null)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewModalOpen])

  useEffect(() => {
    if (previewZoom <= 1) setPreviewPan({ x: 0, y: 0 })
  }, [previewZoom])

  useEffect(() => {
    if (selectedConceptIndex >= characterSheetSlots.length) setSelectedConceptIndex(Math.max(0, characterSheetSlots.length - 1))
  }, [characterSheetSlots.length, selectedConceptIndex])

  useEffect(() => {
    if (isNewCharacter) return
    if (!characterQuery.data) return
    setDraft(draftFromCharacter(characterQuery.data.character))
  }, [characterQuery.data, isNewCharacter])

  return (
    <div className={`character-workspace ${isGeneratingConcept ? 'is-generating-concept' : ''}`} aria-busy={isGeneratingConcept}>
      <aside className="character-list-panel">
        <div className="character-panel-heading">
          <strong>Characters</strong>
          <button
            className="ghost-button"
            disabled={isGeneratingConcept}
            onClick={() => {
              setSelectedPath(NEW_CHARACTER_PATH)
              setDraft(newCharacterDraft())
              setActiveTab('Character Sheet')
            }}
            type="button"
          >
            <StudioIcon name="add" size={16} />
            New
          </button>
        </div>
        <label className="character-search">
          <span>Search characters</span>
          <StudioIcon name="search" size={17} />
          <input
            onChange={event => setSearchText(event.target.value)}
            placeholder="Search characters..."
            type="search"
            value={searchText}
          />
        </label>
        <div className="character-list">
          {isNewCharacter ? (
            <button className="is-active" type="button">
              <span className="character-list-avatar">New</span>
              <span>{draft?.displayName ?? 'New Character'}</span>
              <small>unsaved</small>
            </button>
          ) : null}
          {visibleCharacters.map(character => {
            const characterPreviewUrl = characterConceptPreviewUrl(character)
            return (
              <button
                className={character.path === activePath ? 'is-active' : ''}
                key={character.path}
                disabled={isGeneratingConcept}
                onClick={() => setSelectedPath(character.path)}
                type="button"
              >
                <span className="character-list-avatar">
                  {characterPreviewUrl ? <img alt="" src={characterPreviewUrl} /> : character.displayName.slice(0, 2)}
                </span>
                <span>{character.displayName}</span>
                <small>{characterGroup(character)}</small>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="character-editor-panel">
        <header className="character-editor-header">
          <div className="character-editor-title">
            <span className="character-editor-portrait">
              {activeCharacterPreviewUrl ? <img alt="" src={activeCharacterPreviewUrl} /> : initials(draft?.displayName ?? 'Character')}
            </span>
            <div>
              <h2>{draft?.displayName ?? activeCharacter?.displayName ?? 'Character'}</h2>
              {sheetTags.length ? (
                <div className="character-hero-tags" aria-label="Character tags">
                  {sheetTags.map((tag, index) => <span className={index === 0 ? 'is-primary' : ''} key={`${tag}-${index}`}>{tag}</span>)}
                </div>
              ) : null}
            </div>
          </div>
          <div className="character-header-actions">
            <button className="ghost-button" disabled={!draft || saveMutation.isPending || isGeneratingConcept} onClick={() => saveMutation.mutate()} type="button">
              <StudioIcon name="build" size={16} />
              {saveMutation.isPending ? 'Saving' : 'Save Character'}
            </button>
          </div>
        </header>

        <nav className="character-tabs" aria-label="Character editor tabs">
          {characterTabs.map(tab => (
            <button className={activeTab === tab ? 'is-active' : ''} key={tab} onClick={() => setActiveTab(tab)} type="button">
              {tab}
            </button>
          ))}
        </nav>

        {draft && activeTab === 'Character Sheet' ? (
          <div className="character-sheet-workspace scene-form">
            <div className="character-sheet-editor">
              <section className="character-sheet-card">
                <div className="character-sheet-card-heading">
                  <strong>Identity</strong>
                </div>
                <div className="character-identity-grid">
                  <label>
                    <span>ID</span>
                    <input
                      readOnly={!isNewCharacter}
                      value={draft.id}
                      onChange={event => setDraft({ ...draft, id: sanitizeCharacterId(event.target.value) })}
                    />
                  </label>
                  <label>
                    <span>Name</span>
                    <input value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} />
                  </label>
                  <label>
                    <span>Role</span>
                    <select value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}>
                      <option value="">No role</option>
                      <option value="Protagonist">Protagonist</option>
                      <option value="Antagonist">Antagonist</option>
                      <option value="Supporting">Supporting</option>
                      <option value="Narrator">Narrator</option>
                    </select>
                  </label>
                  <label>
                    <span>Age</span>
                    <input value={draft.age ?? ''} onChange={event => setDraft({ ...draft, age: event.target.value })} />
                  </label>
                  <label>
                    <span>Gender</span>
                    <select value={draft.gender ?? ''} onChange={event => setDraft({ ...draft, gender: event.target.value })}>
                      <option value="">Unset</option>
                      {genderOptions.map(gender => <option key={gender} value={gender}>{gender}</option>)}
                    </select>
                  </label>
                </div>
                <span className="character-tags-label">Tags</span>
                <div className="expression-list" aria-label="Expression map">
                  {(draft.tags ?? []).map((tag, index) => (
                    <span key={`${tag}-${index}`}>
                      {tag}
                      <button
                        aria-label={`Remove ${tag}`}
                        onClick={() => setDraft({ ...draft, tags: (draft.tags ?? []).filter((_, tagIndex) => tagIndex !== index) })}
                        type="button"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <button
                    className="character-chip-add"
                    onClick={() => setDraft({ ...draft, tags: appendStringList(draft.tags, 'New tag') })}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </section>

              <section className="character-sheet-card">
                <div className="character-sheet-card-heading">
                  <strong><StudioIcon name="preview" size={16} /> Appearance</strong>
                </div>
                <div className="character-appearance-grid">
                  <label>
                    <span>Physical description</span>
                    <textarea value={draft.physicalDescription} onChange={event => setDraft({ ...draft, physicalDescription: event.target.value })} />
                  </label>
                  <label>
                    <span>Expressions</span>
                    <input value={listText(draft.expressionsText?.length ? draft.expressionsText : draft.expressions)} onChange={event => setDraft({ ...draft, expressionsText: listFromText(event.target.value) })} />
                  </label>
                  <label>
                    <span>Outfit</span>
                    <input value={draft.outfit} onChange={event => setDraft({ ...draft, outfit: event.target.value })} />
                  </label>
                  <div className="character-palette-control" aria-label="Color palette">
                    <span>Color palette</span>
                    <div>
                      {paletteColors(draft).map((color, index) => (
                        <input
                          aria-label={`Palette color ${index + 1}`}
                          key={`${index}-${color}`}
                          onChange={event => setDraft(updatePaletteColor(draft, index, event.target.value))}
                          type="color"
                          value={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="character-sheet-card">
                <div className="character-sheet-card-heading">
                  <strong><StudioIcon name="story" size={16} /> Personality and Narrative</strong>
                </div>
                <div className="character-narrative-compact">
                  <div className="character-narrative-column">
                    <strong>Personality</strong>
                    <label>
                      <span>Short description</span>
                      <textarea value={draft.personality} onChange={event => setDraft({ ...draft, personality: event.target.value })} />
                    </label>
                    <div className="character-trait-control">
                      <span>Traits</span>
                      <div className="expression-list" aria-label="Character traits">
                        {(draft.traits ?? []).map((trait, index) => (
                          <span key={`${trait}-${index}`}>
                            {trait}
                            <button
                              aria-label={`Remove ${trait}`}
                              onClick={() => setDraft({ ...draft, traits: (draft.traits ?? []).filter((_, traitIndex) => traitIndex !== index) })}
                              type="button"
                            >
                              x
                            </button>
                          </span>
                        ))}
                        <button
                          className="character-chip-add"
                          onClick={() => setDraft({ ...draft, traits: appendStringList(draft.traits, 'New trait') })}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <label>
                      <span>Motivations</span>
                      <textarea value={draft.motivations ?? ''} onChange={event => setDraft({ ...draft, motivations: event.target.value })} />
                    </label>
                    <label>
                      <span>Fears</span>
                      <input value={draft.fears ?? ''} onChange={event => setDraft({ ...draft, fears: event.target.value })} />
                    </label>
                    <label>
                      <span>Internal conflict</span>
                      <textarea value={draft.internalConflict ?? ''} onChange={event => setDraft({ ...draft, internalConflict: event.target.value })} />
                    </label>
                  </div>

                  <div className="character-narrative-column">
                    <strong>History</strong>
                    <label>
                      <span>Backstory</span>
                      <textarea value={draft.backstory ?? ''} onChange={event => setDraft({ ...draft, backstory: event.target.value })} />
                    </label>
                    <div className="character-event-list">
                      <span>Key events</span>
                      {(draft.keyEvents ?? []).map((eventItem, index) => (
                        <label className="character-event-row" key={`${eventItem}-${index}`}>
                          <StudioIcon name="characters" size={14} />
                          <input
                            value={eventItem}
                            onChange={event => setDraft({ ...draft, keyEvents: updateStringList(draft.keyEvents, index, event.target.value) })}
                          />
                        </label>
                      ))}
                      <button
                        className="ghost-button"
                        onClick={() => setDraft({ ...draft, keyEvents: appendStringList(draft.keyEvents, 'New event') })}
                        type="button"
                      >
                        <StudioIcon name="add" size={15} />
                        Add event
                      </button>
                    </div>
                    <div className="character-arc-compact">
                      <strong>Character arc</strong>
                      <div>
                        <label>
                          <span><StudioIcon name="preview" size={14} /> Initial state</span>
                          <textarea value={draft.arcInitial ?? ''} onChange={event => setDraft({ ...draft, arcInitial: event.target.value })} />
                        </label>
                        <label>
                          <span><StudioIcon name="warning" size={14} /> Turning point</span>
                          <textarea value={draft.arcBreak ?? ''} onChange={event => setDraft({ ...draft, arcBreak: event.target.value })} />
                        </label>
                        <label>
                          <span><StudioIcon name="build" size={14} /> Final state</span>
                          <textarea value={draft.arcFinal ?? ''} onChange={event => setDraft({ ...draft, arcFinal: event.target.value })} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            <aside className="character-sheet-preview-card" aria-label="Character sheet preview">
              <div className="character-sheet-card-heading">
                <strong><StudioIcon name="file" size={16} /> Character Sheet</strong>
              </div>
              <span className="character-sheet-preview-label">Main image</span>
              <div className="character-concept-preview">
                {displayedCharacterSheetUrl ? (
                  <>
                    <img alt={`${draft.displayName} character sheet`} src={displayedCharacterSheetUrl} />
                    <button
                      aria-label="Open full size preview"
                      className="character-concept-zoom"
                      onClick={() => setPreviewModalOpen(true)}
                      title="Open full size preview"
                      type="button"
                    >
                      <StudioIcon name="zoom" size={22} />
                    </button>
                  </>
                ) : (
                  <span>
                    <StudioIcon name="assets" size={34} />
                    No concept image
                  </span>
                )}
                {displayedCharacterSheetUrl ? (
                  <div className="character-concept-preview-actions">
                    <button
                      disabled={!selectedConceptPath || isGeneratingConcept}
                      onClick={() => setEditPanelOpen(open => !open)}
                      type="button"
                    >
                      <StudioIcon name="rename" size={15} />
                      Edit with AI
                    </button>
                    <button
                      className="is-danger"
                      disabled={!selectedConceptPath || conceptDeleteMutation.isPending}
                      onClick={() => {
                        if (selectedConceptPath) conceptDeleteMutation.mutate(selectedConceptPath)
                      }}
                      type="button"
                    >
                      <StudioIcon name="remove" size={15} />
                      {conceptDeleteMutation.isPending ? 'Deleting' : 'Delete'}
                    </button>
                  </div>
                ) : null}
                {displayedCharacterSheetUrl && editPanelOpen ? (
                  <form
                    className="character-concept-edit-panel"
                    onSubmit={event => {
                      event.preventDefault()
                      const prompt = editPrompt.trim()
                      if (selectedConceptPath && prompt) conceptEditMutation.mutate({ assetPath: selectedConceptPath, prompt })
                    }}
                  >
                    <textarea
                      aria-label="Edit intention"
                      disabled={isGeneratingConcept}
                      onChange={event => setEditPrompt(event.target.value)}
                      placeholder="Type here your edition instructions."
                      rows={3}
                      value={editPrompt}
                    />
                    <div>
                      <button disabled={isGeneratingConcept} onClick={() => setEditPanelOpen(false)} type="button">Cancel</button>
                      <button disabled={!selectedConceptPath || !editPrompt.trim() || isGeneratingConcept} type="submit">
                        {conceptEditMutation.isPending ? 'Editing' : 'Apply edit'}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>

              <div className="character-sheet-gallery">
                <strong>Concept images</strong>
                <div>
                  {characterSheetSlots.map((slot, index) => (
                    slot.url ? (
                      <button
                        className={index === selectedConceptIndex ? 'is-active' : ''}
                        key={slot.id}
                        onClick={() => setSelectedConceptIndex(index)}
                        type="button"
                      >
                        <span className="character-sheet-thumb-image">
                          <img alt="" src={slot.url} />
                        </span>
                      </button>
                    ) : (
                      <label className="character-sheet-gallery-upload" key={slot.id}>
                        <span className="character-concept-thumb-placeholder">
                          <StudioIcon name={slot.icon} size={20} />
                          <small>{conceptUploadMutation.isPending && conceptUploadMutation.variables?.artType === slot.id ? 'Uploading image' : slot.uploadLabel}</small>
                        </span>
                        <input
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          disabled={!draft || conceptUploadMutation.isPending || isGeneratingConcept}
                          onChange={event => {
                            const file = event.currentTarget.files?.[0]
                            event.currentTarget.value = ''
                            if (file) conceptUploadMutation.mutate({ file, artType: slot.id })
                          }}
                          type="file"
                        />
                      </label>
                    )
                  ))}
                </div>
              </div>

              <div className="character-sheet-manage">
                <strong>Manage concept images</strong>
                <div>
                  <div className="character-sheet-generate-menu">
                    <button
                      aria-expanded={generationMenuOpen}
                      className="character-sheet-generate"
                      disabled={!draft || isGeneratingConcept}
                      onClick={() => setGenerationMenuOpen(open => !open)}
                      type="button"
                    >
                      <span>
                        <strong>{conceptGenerateMutation.isPending ? 'Generating image' : 'Generate with AI'}</strong>
                        <small>{selectedArtTypes.length > 0 ? `${selectedArtTypes.length} art type${selectedArtTypes.length === 1 ? '' : 's'} selected` : 'Select art types'}</small>
                      </span>
                      <span className="character-sheet-generate-count">{selectedArtTypes.length}</span>
                      <span className="character-sheet-generate-caret">{generationMenuOpen ? '^' : 'v'}</span>
                    </button>
                    {generationMenuOpen ? (
                      <div className="character-sheet-generate-popover">
                        {characterSheetArtOptions.map(option => {
                          const checked = selectedArtTypes.includes(option.id)
                          return (
                            <label className={checked ? 'is-selected' : ''} key={option.id}>
                              <input
                                checked={checked}
                                onChange={() => setSelectedArtTypes(current => (
                                  current.includes(option.id)
                                    ? current.filter(item => item !== option.id)
                                    : [...current, option.id]
                                ))}
                                type="checkbox"
                              />
                              <StudioIcon name={option.icon} size={18} />
                              <span>{option.label}</span>
                            </label>
                          )
                        })}
                        <button
                          disabled={!draft || selectedArtTypes.length === 0 || isGeneratingConcept}
                          onClick={() => conceptGenerateMutation.mutate()}
                          type="button"
                        >
                          Generate
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                {generationMessage ? (
                  <p className={conceptGenerateMutation.isError ? 'character-sheet-upload-error' : 'character-sheet-generate-status'}>
                    {generationMessage}
                  </p>
                ) : null}
                {conceptUploadMutation.error ? (
                  <p className="character-sheet-upload-error">{conceptUploadMutation.error.message}</p>
                ) : null}
                {conceptGenerateMutation.error ? (
                  <p className="character-sheet-upload-error">{conceptGenerateMutation.error.message}</p>
                ) : null}
                {conceptEditMutation.error ? (
                  <p className="character-sheet-upload-error">{conceptEditMutation.error.message}</p>
                ) : null}
                {conceptDeleteMutation.error ? (
                  <p className="character-sheet-upload-error">{conceptDeleteMutation.error.message}</p>
                ) : null}
              </div>
            </aside>
          </div>
        ) : draft && activeTab === 'Spritesheet' ? (
          <div className="character-asset-grid">
            <section className="character-asset-panel is-sheet">
              <div className="character-asset-heading">
                <strong>Spritesheet Image</strong>
                <span>{activeCharacter?.atlas?.sheetSize.w ?? 0} x {activeCharacter?.atlas?.sheetSize.h ?? 0}</span>
              </div>
              <div className="character-spritesheet-stage">
                {activeCharacter?.previewUrl ? (
                  <img alt={`${activeCharacter.displayName} spritesheet`} src={activeCharacter.previewUrl} />
                ) : (
                  <span>No spritesheet configured</span>
                )}
              </div>
              <div className="character-asset-meta">
                <strong>{animationFile(draft) || 'No spritesheet path'}</strong>
                <span>{atlasFrames.length} sprites</span>
                <span>{atlasTags.length} animations</span>
              </div>
            </section>
            <section className="character-asset-panel">
              <div className="character-asset-heading">
                <strong>Sprites</strong>
                <span>{atlasFrames.length} sprites</span>
              </div>
              <div className="character-sprite-grid is-compact">
                {activeCharacter ? atlasFrames.slice(0, 12).map(frame => (
                  <article className="character-sprite-card" key={frame.key}>
                    <div className="character-sprite-thumb">
                      <span style={spriteFrameStyle(activeCharacter, frame, 92, 130)} />
                    </div>
                    <small>{frame.name}</small>
                  </article>
                )) : null}
              </div>
            </section>
          </div>
        ) : draft && activeTab === 'Sprites' ? (
          <section className="character-asset-panel is-full">
            <div className="character-asset-heading">
              <strong>Sprites</strong>
              <span>{atlasFrames.length} sprites</span>
            </div>
            <div className="character-sprite-grid">
              {activeCharacter ? atlasFrames.map(frame => (
                <article className="character-sprite-card" key={frame.key}>
                  <div className="character-sprite-thumb">
                    <span style={spriteFrameStyle(activeCharacter, frame, 128, 168)} />
                  </div>
                  <small>{frame.name}</small>
                </article>
              )) : null}
            </div>
          </section>
        ) : draft && activeTab === 'Animations' ? (
          <div className="character-animation-workspace">
            <aside className="character-animation-list">
              <div className="character-asset-heading">
                <strong>Animations</strong>
                <button className="ghost-button" type="button">New Animation</button>
              </div>
              {(atlasTags.length ? atlasTags : expressionPreview.map((name, index) => ({ name, from: index, to: index, direction: 'forward' }))).map(tag => (
                <button
                  className={activeAnimationName === tag.name ? 'is-active' : ''}
                  key={tag.name}
                  onClick={() => setSelectedAnimation(tag.name)}
                  type="button"
                >
                  <span>{tag.name}</span>
                  <small>{tag.direction}</small>
                </button>
              ))}
            </aside>
            <section className="character-animation-strip">
              <div className="character-asset-heading">
                <strong>{activeAnimationName}</strong>
                <span>{activeAnimationFrames.length} frames</span>
              </div>
              <div className="character-animation-frames">
                {activeCharacter ? activeAnimationFrames.map((frame, index) => (
                  <article className="character-animation-frame" key={`${frame.key}-${index}`}>
                    <div className="character-sprite-thumb">
                      <span style={spriteFrameStyle(activeCharacter, frame, 142, 190)} />
                    </div>
                    <small>{index + 1}</small>
                    <span>{frame.duration}ms</span>
                  </article>
                )) : null}
              </div>
            </section>
          </div>
        ) : (
          <p className="muted">Select a character to edit its sheet and runtime metadata.</p>
        )}
      </section>
      {isGeneratingConcept ? (
        <div className="character-generation-blocker" role="status" aria-live="polite">
          <div>
            <StudioIcon name="add" size={24} />
            <strong>{conceptEditMutation.isPending ? 'Editing concept art' : 'Generating concept art'}</strong>
            <span>{generationMessage || 'Waiting for OpenAI Images...'}</span>
          </div>
        </div>
      ) : null}
      {previewModalOpen && displayedCharacterSheetUrl && draft ? (
        <div
          aria-label={`${draft.displayName} full size character sheet preview`}
          aria-modal="true"
          className="character-preview-modal"
          onClick={() => setPreviewModalOpen(false)}
          onWheel={event => {
            event.preventDefault()
            event.stopPropagation()
            setPreviewZoom(current => {
              const next = current + (event.deltaY < 0 ? 0.2 : -0.2)
              return Math.min(4, Math.max(0.5, Number(next.toFixed(2))))
            })
          }}
          role="dialog"
        >
          <div className="character-preview-modal-tools" onClick={event => event.stopPropagation()}>
            <button aria-label="Zoom out" onClick={() => setPreviewZoom(current => Math.max(0.5, Number((current - 0.25).toFixed(2))))} type="button">-</button>
            <button
              aria-label="Reset zoom"
              onClick={() => {
                setPreviewZoom(1)
                setPreviewPan({ x: 0, y: 0 })
              }}
              type="button"
            >
              {Math.round(previewZoom * 100)}%
            </button>
            <button aria-label="Zoom in" onClick={() => setPreviewZoom(current => Math.min(4, Number((current + 0.25).toFixed(2))))} type="button">+</button>
          </div>
          <button
            aria-label="Close full size preview"
            className="character-preview-modal-close"
            onClick={() => setPreviewModalOpen(false)}
            type="button"
          >
            x
          </button>
          <img
            alt={`${draft.displayName} character sheet full size`}
            onClick={event => event.stopPropagation()}
            onPointerCancel={() => setPreviewDragStart(null)}
            onPointerDown={event => {
              event.preventDefault()
              event.stopPropagation()
              if (previewZoom <= 1) return
              event.currentTarget.setPointerCapture(event.pointerId)
              setPreviewDragStart({
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                panX: previewPan.x,
                panY: previewPan.y,
              })
            }}
            onPointerMove={event => {
              if (!previewDragStart || previewDragStart.pointerId !== event.pointerId) return
              event.preventDefault()
              event.stopPropagation()
              setPreviewPan({
                x: previewDragStart.panX + event.clientX - previewDragStart.x,
                y: previewDragStart.panY + event.clientY - previewDragStart.y,
              })
            }}
            onPointerUp={event => {
              if (previewDragStart?.pointerId === event.pointerId) setPreviewDragStart(null)
            }}
            src={displayedCharacterSheetUrl}
            style={{ transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom})` }}
          />
        </div>
      ) : null}

    </div>
  )
}
