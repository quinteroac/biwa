import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCharacterSpritesheetFolder, deleteCharacter, deleteCharacterSheetConcept, deleteCharacterSpritesheet, editCharacterSheetConcept, fetchCharacter, fetchCharacters, generateCharacterSpritesheet, generateCharacterAtlas, generateCharacterSheetConcept, saveCharacter, uploadCharacterSheetConcept, uploadCharacterSpritesheet } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioCharacterDraft, StudioCharacterItem, StudioCharacterSheetArtType, StudioCharacterSpritesheetGenerateRequest, StudioProjectSummary } from '../../shared/types.ts'

const genderOptions = ['Male', 'Female', 'Transgender', 'Non-binary', 'Other']
const NEW_CHARACTER_PATH = '__new_character__.md'
const spritesheetSizeOptions = [
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '2048x1024',
  '1024x2048',
  '2048x2048',
  '3072x1024',
  '1024x3072',
  '3840x1280',
  '1280x3840',
  '3840x2160',
  '2160x3840',
] as const
const characterTabs = ['Character Sheet', 'Spritesheet', 'Sprites', 'Animations'] as const
const characterSheetArtOptions = Object.freeze([
  { id: 'conceptArt', label: 'Concept Art', uploadLabel: 'Upload concept art', icon: 'assets', slug: 'concept-art' },
  { id: 'silhouetteSketch', label: 'Silhouette Sketch', uploadLabel: 'Upload silhouette sketch', icon: 'characters', slug: 'silhouette-sketch' },
  { id: 'characterSheet', label: 'Character Sheet', uploadLabel: 'Upload character sheet', icon: 'file', slug: 'character-sheet' },
  { id: 'actionPoses', label: 'Action Poses', uploadLabel: 'Upload action poses', icon: 'run-doctor', slug: 'action-poses' },
] satisfies Array<{ id: StudioCharacterSheetArtType; label: string; uploadLabel: string; icon: 'characters' | 'assets' | 'file' | 'run-doctor'; slug: string }>)

type CharacterTab = typeof characterTabs[number]
type StudioCharacter = NonNullable<Awaited<ReturnType<typeof fetchCharacter>>['character']>
type StudioCharacterAtlasFrame = NonNullable<StudioCharacter['atlas']>['frames'][number]
type StudioCharacterAtlasSheetSize = NonNullable<StudioCharacter['atlas']>['sheetSize']
type StudioCharacterAtlasTag = NonNullable<StudioCharacter['atlas']>['frameTags'][number]
type StudioCharacterSpritesheet = StudioCharacter['spritesheets'][number]
interface CharacterAnimationOption {
  key: string
  asset: StudioCharacterSpritesheet
  tag: StudioCharacterAtlasTag
}
type SpritesheetContextMenu = {
  assetPath: string
  x: number
  y: number
} | null

const defaultSpritesheetGeneration = Object.freeze({
  atlasKind: 'Visual Novel',
  size: '2048x2048',
  spritesheetType: 'Half Body',
  spriteCount: 4,
  layoutDirection: 'Horizontal',
  columns: 0,
  spriteNames: ['neutral', 'happy', 'sad', 'angry'],
  animationFramesPerTag: 4,
  frameDuration: 100,
  folder: 'Main',
  prompt: '',
} satisfies StudioCharacterSpritesheetGenerateRequest)
const DEFAULT_SPRITE_PREVIEW_ZOOM = 0.85
const SPRITE_PREVIEW_ZOOM_STEP = 0.05
const DEFAULT_ANIMATION_PREVIEW_ZOOM = 0.85
const ANIMATION_PREVIEW_ZOOM_STEP = 0.05
const DEFAULT_ANIMATION_PLAYBACK_SPEED = 1

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
      type: 'spritesheet-library',
      defaultStateSheet: 'Main',
      defaultAnimationSheet: 'Main',
      defaultState: 'neutral',
      defaultAction: '',
      states: {},
      animationSheets: {},
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

function spriteNamesFromText(text: string): string[] {
  return text.split(',').map(name => name.trim()).filter(Boolean)
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

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function activeSpritesheetRecord(draft: StudioCharacterDraft, atlasKind: 'Visual Novel' | 'Animation', folder?: string): Record<string, unknown> | null {
  const animation = draft.animation
  const sheets = recordValue(animation[atlasKind === 'Animation' ? 'animationSheets' : 'states'])
  if (!sheets) return null
  const defaultSheetKey = atlasKind === 'Animation' ? 'defaultAnimationSheet' : 'defaultStateSheet'
  const defaultSheet = typeof animation[defaultSheetKey] === 'string' ? animation[defaultSheetKey] : 'Main'
  if (folder) return recordValue(sheets[folder])
  return recordValue(sheets[defaultSheet]) ?? recordValue(sheets['Main']) ?? recordValue(Object.values(sheets)[0])
}

function animationFile(draft: StudioCharacterDraft, atlasKind: 'Visual Novel' | 'Animation' = 'Visual Novel', folder?: string): string {
  const sheet = activeSpritesheetRecord(draft, atlasKind, folder)
  return typeof sheet?.['file'] === 'string' ? sheet['file'] : ''
}

function spritesheetFolderFromPath(path: string): string {
  const match = path.replace(/\\/g, '/').match(/^characters\/[^/]+\/spritesheets\/([^/]+)\//)
  return match?.[1] ?? 'Main'
}

function spriteFrameStyle(imageUrl: string | null, sheet: StudioCharacterAtlasSheetSize | undefined, frame: StudioCharacterAtlasFrame, maxWidth: number, maxHeight: number): CSSProperties {
  if (!imageUrl || !sheet || sheet.w <= 0 || sheet.h <= 0) return {}
  const scale = Math.min(1, maxWidth / frame.w, maxHeight / frame.h)
  return {
    width: `${Math.max(1, frame.w * scale)}px`,
    height: `${Math.max(1, frame.h * scale)}px`,
    backgroundImage: `url("${imageUrl}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
    backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
  }
}

function animationFrames(atlas: StudioCharacter['atlas'], tagName: string): StudioCharacterAtlasFrame[] {
  if (!atlas) return []
  const frames = atlas.frames ?? []
  const tags = atlas.frameTags ?? []
  const tag = tags.find(item => item.name === tagName)
  if (!tag) return frames.slice(0, 8)
  const sequence = frames.slice(tag.from, tag.to + 1)
  if (tag.direction === 'reverse') return [...sequence].reverse()
  if (tag.direction === 'pingpong' && sequence.length > 1) return [...sequence, ...sequence.slice(1, -1).reverse()]
  return sequence
}

function hasLiveAnimationTags(asset: StudioCharacterSpritesheet | null | undefined): boolean {
  return Boolean(asset?.atlas?.frameTags.some(tag => tag.from !== tag.to))
}

function generationAnimationTags(draft: StudioCharacterSpritesheetGenerateRequest): NonNullable<StudioCharacterSpritesheetGenerateRequest['animationTags']> {
  const names = draft.spriteNames.length > 0 ? draft.spriteNames : ['idle']
  const segmentSize = Math.max(1, Math.floor(draft.animationFramesPerTag ?? draft.spriteCount))
  const frameCount = Math.max(1, names.length * segmentSize)
  return names.map((name, index) => {
    const from = Math.min(frameCount - 1, index * segmentSize)
    const to = Math.min(frameCount - 1, from + segmentSize - 1)
    return { name, from, to, direction: 'forward', color: '#000000ff' }
  })
}

function generationFrameCount(draft: StudioCharacterSpritesheetGenerateRequest): number {
  if (draft.atlasKind !== 'Animation') return Math.max(1, draft.spriteCount)
  const names = draft.spriteNames.length > 0 ? draft.spriteNames : ['idle']
  const framesPerTag = Math.max(1, Math.floor(draft.animationFramesPerTag ?? draft.spriteCount))
  return names.length * framesPerTag
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
  const spritesheetUploadInputRef = useRef<HTMLInputElement | null>(null)
  const spritesheetStageRef = useRef<HTMLDivElement | null>(null)
  const spritesheetDragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const spritePreviewStageRef = useRef<HTMLDivElement | null>(null)
  const spritePreviewDragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const animationPreviewStageRef = useRef<HTMLDivElement | null>(null)
  const animationPreviewDragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
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
  const [deleteCharacterDialogOpen, setDeleteCharacterDialogOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [spritesheetFolders, setSpritesheetFolders] = useState<string[]>([])
  const [selectedSpritesheetFolder, setSelectedSpritesheetFolder] = useState('Main')
  const [selectedSpritesheetPath, setSelectedSpritesheetPath] = useState<string | null>(null)
  const [newSpritesheetFolder, setNewSpritesheetFolder] = useState<string | null>(null)
  const [spritesheetMenuOpen, setSpritesheetMenuOpen] = useState(false)
  const [spritesheetContextMenu, setSpritesheetContextMenu] = useState<SpritesheetContextMenu>(null)
  const [spritesheetZoom, setSpritesheetZoom] = useState(1)
  const [spritesheetNaturalSize, setSpritesheetNaturalSize] = useState({ w: 0, h: 0 })
  const [spritesheetStageSize, setSpritesheetStageSize] = useState({ w: 0, h: 0 })
  const [isSpritesheetDragging, setIsSpritesheetDragging] = useState(false)
  const [spritesheetGenerateOpen, setSpritesheetGenerateOpen] = useState(false)
  const [spritesheetGenerateDraft, setSpritesheetGenerateDraft] = useState<StudioCharacterSpritesheetGenerateRequest>(defaultSpritesheetGeneration)
  const [spritesheetGenerateNameInput, setSpritesheetGenerateNameInput] = useState('')
  const [selectedSpriteKey, setSelectedSpriteKey] = useState<string | null>(null)
  const [spritePreviewZoom, setSpritePreviewZoom] = useState(DEFAULT_SPRITE_PREVIEW_ZOOM)
  const [spritePreviewStageSize, setSpritePreviewStageSize] = useState({ w: 0, h: 0 })
  const [isSpritePreviewDragging, setIsSpritePreviewDragging] = useState(false)
  const [animationPreviewZoom, setAnimationPreviewZoom] = useState(DEFAULT_ANIMATION_PREVIEW_ZOOM)
  const [animationPreviewStageSize, setAnimationPreviewStageSize] = useState({ w: 0, h: 0 })
  const [animationPlaybackSpeed, setAnimationPlaybackSpeed] = useState(DEFAULT_ANIMATION_PLAYBACK_SPEED)
  const [animationFrameIndex, setAnimationFrameIndex] = useState(0)
  const [isAnimationPreviewDragging, setIsAnimationPreviewDragging] = useState(false)
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
  const allSpritesheets = activeCharacter?.spritesheets ?? []
  const activeRegisteredSpritesheet = allSpritesheets.find(item => item.isActive) ?? allSpritesheets[0] ?? null
  const selectedSpritesheetAsset = allSpritesheets.find(item => item.path === selectedSpritesheetPath)
    ?? allSpritesheets.find(item => item.folder === selectedSpritesheetFolder)
    ?? activeRegisteredSpritesheet
  const selectedAtlas = selectedSpritesheetAsset?.atlas ?? (selectedSpritesheetAsset?.isActive ? activeCharacter?.atlas ?? null : null)
  const stateSpritesheetAsset = selectedSpritesheetAsset?.atlas?.atlasKind === 'Visual Novel'
    ? selectedSpritesheetAsset
    : allSpritesheets.find(item => item.atlas?.atlasKind === 'Visual Novel' && item.folder === selectedSpritesheetFolder)
      ?? allSpritesheets.find(item => item.atlas?.atlasKind === 'Visual Novel' && item.isActive)
      ?? allSpritesheets.find(item => item.atlas?.atlasKind === 'Visual Novel')
      ?? null
  const liveAnimationOptions: CharacterAnimationOption[] = allSpritesheets.flatMap(asset => {
    if (asset.atlas?.atlasKind !== 'Animation') return []
    return asset.atlas.frameTags
      .filter(tag => tag.from !== tag.to)
      .map(tag => ({ key: `${asset.path}#${tag.name}`, asset, tag }))
  })
  const preferredAnimationOption = liveAnimationOptions.find(option => option.key === selectedAnimation)
    ?? liveAnimationOptions.find(option => option.asset.path === selectedSpritesheetAsset?.path)
    ?? liveAnimationOptions.find(option => option.asset.folder === selectedSpritesheetFolder)
    ?? liveAnimationOptions[0]
  const stateAtlas = stateSpritesheetAsset?.atlas ?? null
  const animationAtlas = preferredAnimationOption?.asset.atlas ?? null
  const atlasFrames = selectedAtlas?.frames ?? []
  const stateAtlasFrames = stateAtlas?.frames ?? []
  const stateAtlasTags = stateAtlas?.frameTags ?? []
  const stateSpriteFrames = useMemo(() => {
    if (stateAtlas?.atlasKind !== 'Animation') return stateAtlasFrames
    const frames: StudioCharacterAtlasFrame[] = []
    for (const tag of stateAtlasTags) {
      if (tag.from !== tag.to) continue
      const frame = stateAtlasFrames[tag.from]
      if (frame) frames.push(frame)
    }
    return frames
  }, [stateAtlas?.atlasKind, stateAtlasFrames, stateAtlasTags])
  const selectedSpriteFrame = stateSpriteFrames.find(frame => frame.key === selectedSpriteKey) ?? stateSpriteFrames[0] ?? null
  const spritePreviewFitScale = selectedSpriteFrame
    && spritePreviewStageSize.w > 0
    && spritePreviewStageSize.h > 0
    ? Math.min(spritePreviewStageSize.w / selectedSpriteFrame.w, spritePreviewStageSize.h / selectedSpriteFrame.h, 1)
    : 1
  const spritePreviewScale = spritePreviewFitScale * spritePreviewZoom
  const spritePreviewPercent = Math.round(spritePreviewZoom * 100)
  const spritePreviewFrameSize = selectedSpriteFrame
    ? {
        width: Math.max(1, Math.round(selectedSpriteFrame.w * spritePreviewScale)),
        height: Math.max(1, Math.round(selectedSpriteFrame.h * spritePreviewScale)),
      }
    : null
  const defaultSpritesheetPath = draft ? animationFile(draft) : ''
  const defaultSpritesheetFolder = defaultSpritesheetPath ? spritesheetFolderFromPath(defaultSpritesheetPath) : 'Main'
  const visibleSpritesheetFolders = ['Main', ...new Set([...spritesheetFolders, ...(activeCharacter?.spritesheetFolders ?? []), ...allSpritesheets.map(item => item.folder), defaultSpritesheetFolder].filter(folder => folder !== 'Main'))]
  const spritesheetsByFolder = new Map(visibleSpritesheetFolders.map(folder => [folder, allSpritesheets.filter(item => item.folder === folder)]))
  const activeSpritesheetPath = selectedSpritesheetAsset?.path ?? ''
  const activeSpritesheetUrl = selectedSpritesheetAsset?.url ?? null
  const activeStateSpritesheetUrl = stateSpritesheetAsset?.url ?? null
  const activeAnimationSpritesheetUrl = preferredAnimationOption?.asset.url ?? null
  const spritesheetFileCount = allSpritesheets.length
  const hasActiveSpritesheet = Boolean(activeSpritesheetPath && activeSpritesheetUrl)
  const visibleAtlasFrames = hasActiveSpritesheet ? atlasFrames : []
  const spritesheetFitScale = spritesheetNaturalSize.w > 0
    && spritesheetNaturalSize.h > 0
    && spritesheetStageSize.w > 0
    && spritesheetStageSize.h > 0
    ? Math.min(spritesheetStageSize.w / spritesheetNaturalSize.w, spritesheetStageSize.h / spritesheetNaturalSize.h, 1)
    : 1
  const spritesheetPreviewScale = spritesheetFitScale * spritesheetZoom
  const spritesheetPreviewSize = spritesheetNaturalSize.w > 0 && spritesheetNaturalSize.h > 0
    ? {
        width: `${Math.max(1, Math.round(spritesheetNaturalSize.w * spritesheetPreviewScale))}px`,
        height: `${Math.max(1, Math.round(spritesheetNaturalSize.h * spritesheetPreviewScale))}px`,
      }
    : undefined
  const spritesheetZoomPercent = Math.round(spritesheetZoom * 100)
  const activeAnimationName = preferredAnimationOption?.tag.name ?? 'Animation'
  const activeAnimationFrames = preferredAnimationOption ? animationFrames(animationAtlas, activeAnimationName) : []
  const activeAnimationFrame = activeAnimationFrames[animationFrameIndex % Math.max(1, activeAnimationFrames.length)] ?? null
  const activeAnimationPath = preferredAnimationOption?.asset.path ?? ''
  const activeAnimationFitScale = activeAnimationFrame
    && animationPreviewStageSize.w > 0
    && animationPreviewStageSize.h > 0
    ? Math.min(animationPreviewStageSize.w / activeAnimationFrame.w, animationPreviewStageSize.h / activeAnimationFrame.h, 1)
    : 1
  const activeAnimationPreviewScale = activeAnimationFitScale * animationPreviewZoom
  const animationPreviewPercent = Math.round(animationPreviewZoom * 100)
  const activeAnimationPreviewSize = activeAnimationFrame
    ? {
        width: Math.max(1, Math.round(activeAnimationFrame.w * activeAnimationPreviewScale)),
        height: Math.max(1, Math.round(activeAnimationFrame.h * activeAnimationPreviewScale)),
      }
    : null
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
  const characterDeleteMutation = useMutation({
    mutationFn: (path: string) => deleteCharacter(props.project.id, path),
    onSuccess: response => {
      const nextPath = response.characters[0]?.path ?? null
      setSelectedPath(nextPath)
      setDraft(null)
      setDeleteCharacterDialogOpen(false)
      queryClient.setQueryData(['studio-characters', props.project.id], { characters: response.characters })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, response.deletedPath] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
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
  const spritesheetDeleteMutation = useMutation({
    mutationFn: (assetPath: string) => {
      const currentDraft = draft as StudioCharacterDraft
      return deleteCharacterSpritesheet(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft, assetPath)
    },
    onSuccess: data => {
      setDraft(draftFromCharacter(data.character))
      setSpritesheetContextMenu(null)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const spritesheetUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const currentDraft = draft as StudioCharacterDraft
      return uploadCharacterSpritesheet(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft, file, selectedSpritesheetFolder)
    },
    onSuccess: data => {
      setDraft(draftFromCharacter(data.character))
      setSelectedPath(data.character.path)
      setSpritesheetMenuOpen(false)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const spritesheetFolderMutation = useMutation({
    mutationFn: (folder: string) => {
      const currentDraft = draft as StudioCharacterDraft
      return createCharacterSpritesheetFolder(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft, folder)
    },
    onSuccess: data => {
      setSpritesheetFolders(data.character.spritesheetFolders.filter(folder => folder !== 'Main'))
      setSelectedSpritesheetFolder(data.folder)
      setNewSpritesheetFolder(null)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
    },
  })
  const spritesheetGenerateMutation = useMutation({
    mutationFn: () => {
      const currentDraft = draft as StudioCharacterDraft
      return generateCharacterSpritesheet(props.project.id, characterPathForDraft(currentDraft, activePath), currentDraft, {
        ...spritesheetGenerateDraft,
        spriteCount: generationFrameCount(spritesheetGenerateDraft),
        spriteNames: spritesheetGenerateDraft.spriteNames.map(name => name.trim()).filter(Boolean),
        ...(spritesheetGenerateDraft.atlasKind === 'Animation' ? { animationTags: generationAnimationTags(spritesheetGenerateDraft) } : {}),
        folder: selectedSpritesheetFolder,
      })
    },
    onSuccess: data => {
      setDraft(draftFromCharacter(data.character))
      setSelectedPath(data.character.path)
      setSpritesheetGenerateOpen(false)
      queryClient.setQueryData(['studio-character', props.project.id, data.character.path], { character: data.character })
      void queryClient.invalidateQueries({ queryKey: ['studio-characters', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-character', props.project.id, data.character.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
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
    setSelectedSpriteKey(null)
    setSelectedSpritesheetPath(null)
    setPreviewModalOpen(false)
    setPreviewZoom(1)
    setPreviewPan({ x: 0, y: 0 })
    setPreviewDragStart(null)
    setEditPanelOpen(false)
    setEditPrompt('')
  }, [activePath])

  useEffect(() => {
    if (!allSpritesheets.length) {
      if (selectedSpritesheetPath) setSelectedSpritesheetPath(null)
      return
    }
    if (!selectedSpritesheetPath || !allSpritesheets.some(item => item.path === selectedSpritesheetPath)) {
      const next = allSpritesheets.find(item => item.folder === selectedSpritesheetFolder)
        ?? allSpritesheets.find(item => item.isActive)
        ?? allSpritesheets[0]
      setSelectedSpritesheetPath(next?.path ?? null)
      if (next?.folder) setSelectedSpritesheetFolder(next.folder)
    }
  }, [allSpritesheets, selectedSpritesheetFolder, selectedSpritesheetPath])

  useEffect(() => {
    if (!stateSpriteFrames.length) {
      if (selectedSpriteKey) setSelectedSpriteKey(null)
      return
    }
    if (!selectedSpriteKey || !stateSpriteFrames.some(frame => frame.key === selectedSpriteKey)) {
      setSelectedSpriteKey(stateSpriteFrames[0]?.key ?? null)
    }
  }, [stateSpriteFrames, selectedSpriteKey])

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
    const stage = spritesheetStageRef.current
    if (!stage) return

    const measureStage = () => {
      const rect = stage.getBoundingClientRect()
      setSpritesheetStageSize({ w: rect.width, h: rect.height })
    }

    measureStage()
    const observer = new ResizeObserver(measureStage)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [activeTab])

  useEffect(() => {
    const stage = spritePreviewStageRef.current
    if (!stage) return

    const measureStage = () => {
      const rect = stage.getBoundingClientRect()
      setSpritePreviewStageSize({ w: rect.width, h: rect.height })
    }

    measureStage()
    const observer = new ResizeObserver(measureStage)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [activeTab, selectedSpriteKey])

  useEffect(() => {
    const stage = animationPreviewStageRef.current
    if (!stage) return

    const measureStage = () => {
      const rect = stage.getBoundingClientRect()
      setAnimationPreviewStageSize({ w: rect.width, h: rect.height })
    }

    measureStage()
    const observer = new ResizeObserver(measureStage)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [activeTab, activeAnimationName])

  useEffect(() => {
    setSpritesheetZoom(1)
    setSpritesheetNaturalSize({ w: 0, h: 0 })
  }, [activeSpritesheetPath])

  useEffect(() => {
    setSpritePreviewZoom(DEFAULT_SPRITE_PREVIEW_ZOOM)
    spritePreviewDragRef.current = null
    setIsSpritePreviewDragging(false)
    const stage = spritePreviewStageRef.current
    if (stage) {
      stage.scrollLeft = 0
      stage.scrollTop = 0
    }
  }, [selectedSpriteKey, activeSpritesheetPath])

  useEffect(() => {
    setAnimationFrameIndex(0)
    setAnimationPreviewZoom(DEFAULT_ANIMATION_PREVIEW_ZOOM)
    animationPreviewDragRef.current = null
    setIsAnimationPreviewDragging(false)
    const stage = animationPreviewStageRef.current
    if (stage) {
      stage.scrollLeft = 0
      stage.scrollTop = 0
    }
  }, [activeAnimationName, activeAnimationPath])

  useEffect(() => {
    if (activeAnimationFrames.length <= 1) return
    const frame = activeAnimationFrames[animationFrameIndex % activeAnimationFrames.length]
    const timeout = setTimeout(() => {
      setAnimationFrameIndex(current => (current + 1) % activeAnimationFrames.length)
    }, Math.max(16, (frame?.duration ?? 100) / animationPlaybackSpeed))
    return () => clearTimeout(timeout)
  }, [activeAnimationFrames, animationFrameIndex, animationPlaybackSpeed])

  useEffect(() => {
    if (!spritesheetContextMenu) return

    const closeContextMenu = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('.character-spritesheet-context-menu, .character-spritesheet-more')) return
      setSpritesheetContextMenu(null)
    }

    const closeContextMenuWithEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setSpritesheetContextMenu(null)
    }

    document.addEventListener('pointerdown', closeContextMenu, true)
    document.addEventListener('keydown', closeContextMenuWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeContextMenu, true)
      document.removeEventListener('keydown', closeContextMenuWithEscape)
    }
  }, [spritesheetContextMenu])

  useEffect(() => {
    if (selectedConceptIndex >= characterSheetSlots.length) setSelectedConceptIndex(Math.max(0, characterSheetSlots.length - 1))
  }, [characterSheetSlots.length, selectedConceptIndex])

  useEffect(() => {
    if (isNewCharacter) return
    if (!characterQuery.data) return
    const nextDraft = draftFromCharacter(characterQuery.data.character)
    const nextFolders = characterQuery.data.character.spritesheetFolders.filter(folder => folder !== 'Main')
    setDraft(nextDraft)
    setSpritesheetFolders(nextFolders)
    if (animationFile(nextDraft)) setSelectedSpritesheetFolder(spritesheetFolderFromPath(animationFile(nextDraft)))
  }, [characterQuery.data, isNewCharacter])

  function createSpritesheetFolder(): void {
    const name = newSpritesheetFolder?.trim()
    if (!name) {
      setNewSpritesheetFolder(null)
      return
    }
    if (spritesheetFolderMutation.isPending) return
    spritesheetFolderMutation.mutate(name)
  }

  function openSpritesheetContextMenu(assetPath: string, x: number, y: number): void {
    setSpritesheetMenuOpen(false)
    setSpritesheetContextMenu({ assetPath, x, y })
  }

  function deleteActiveSpritesheet(): void {
    if (!spritesheetContextMenu || spritesheetDeleteMutation.isPending) return
    spritesheetDeleteMutation.mutate(spritesheetContextMenu.assetPath)
  }

  function uploadSpritesheet(file: File | undefined): void {
    if (!file || spritesheetUploadMutation.isPending) return
    spritesheetUploadMutation.mutate(file)
  }

  function openSpritesheetGenerateDialog(): void {
    const names = draft?.expressions.length ? draft.expressions : defaultSpritesheetGeneration.spriteNames
    setSpritesheetGenerateDraft({
      ...defaultSpritesheetGeneration,
      folder: selectedSpritesheetFolder,
      spriteCount: names.length,
      spriteNames: [...names],
    })
    setSpritesheetGenerateNameInput('')
    setSpritesheetMenuOpen(false)
    setSpritesheetGenerateOpen(true)
  }

  function updateSpritesheetAtlasKind(value: StudioCharacterSpritesheetGenerateRequest['atlasKind']): void {
    setSpritesheetGenerateDraft(current => {
      if (value === 'Animation') {
        const spriteNames = [current.spriteNames[0] ?? draft?.defaultExpression ?? 'idle']
        const animationFramesPerTag = Math.max(2, current.animationFramesPerTag ?? current.spriteCount)
        return {
          ...current,
          atlasKind: value,
          animationFramesPerTag,
          spriteCount: spriteNames.length * animationFramesPerTag,
          spriteNames,
        }
      }
      return {
        ...current,
        atlasKind: 'Visual Novel',
        spriteNames: draft?.expressions.length ? [...draft.expressions] : current.spriteNames,
      }
    })
  }

  function updateSpritesheetGenerateNumber(key: 'spriteCount' | 'columns' | 'frameDuration' | 'animationFramesPerTag', value: string): void {
    const next = Math.max(key === 'columns' ? 0 : 1, Math.floor(Number(value) || 0))
    setSpritesheetGenerateDraft(current => {
      if (key === 'animationFramesPerTag') {
        const spriteNames = current.spriteNames.length > 0 ? current.spriteNames : ['idle']
        return { ...current, animationFramesPerTag: next, spriteCount: spriteNames.length * next }
      }
      if (key !== 'spriteCount') return { ...current, [key]: next }
      if (current.atlasKind === 'Animation') return { ...current, spriteCount: next, animationFramesPerTag: next }
      const spriteNames = Array.from({ length: next }, (_, index) => current.spriteNames[index] ?? `sprite_${String(index + 1).padStart(2, '0')}`)
      return { ...current, spriteCount: next, spriteNames }
    })
  }

  function addSpritesheetGenerateNames(value: string): void {
    const names = spriteNamesFromText(value)
    if (names.length === 0) return
    setSpritesheetGenerateDraft(current => {
      const existing = new Set(current.spriteNames.map(name => name.toLowerCase()))
      const spriteNames = [...current.spriteNames]
      for (const name of names) {
        if (existing.has(name.toLowerCase())) continue
        existing.add(name.toLowerCase())
        spriteNames.push(name)
      }
      const animationFramesPerTag = Math.max(1, current.animationFramesPerTag ?? current.spriteCount)
      return {
        ...current,
        spriteNames,
        spriteCount: current.atlasKind === 'Animation' ? spriteNames.length * animationFramesPerTag : Math.max(1, spriteNames.length),
      }
    })
    setSpritesheetGenerateNameInput('')
  }

  function removeSpritesheetGenerateName(index: number): void {
    setSpritesheetGenerateDraft(current => {
      const spriteNames = current.spriteNames.filter((_, nameIndex) => nameIndex !== index)
      const animationFramesPerTag = Math.max(1, current.animationFramesPerTag ?? current.spriteCount)
      return {
        ...current,
        spriteNames,
        spriteCount: current.atlasKind === 'Animation' ? Math.max(1, spriteNames.length) * animationFramesPerTag : Math.max(1, spriteNames.length),
      }
    })
  }

  function handleSpritesheetNameKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addSpritesheetGenerateNames(spritesheetGenerateNameInput)
  }

  function startSpritesheetPan(event: PointerEvent<HTMLDivElement>): void {
    if (!hasActiveSpritesheet || event.button !== 0) return
    const stage = event.currentTarget
    spritesheetDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
    }
    stage.setPointerCapture(event.pointerId)
    setIsSpritesheetDragging(true)
  }

  function moveSpritesheetPan(event: PointerEvent<HTMLDivElement>): void {
    const drag = spritesheetDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const stage = event.currentTarget
    stage.scrollLeft = drag.scrollLeft - (event.clientX - drag.x)
    stage.scrollTop = drag.scrollTop - (event.clientY - drag.y)
  }

  function stopSpritesheetPan(event: PointerEvent<HTMLDivElement>): void {
    const drag = spritesheetDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    spritesheetDragRef.current = null
    setIsSpritesheetDragging(false)
  }

  function startSpritePreviewPan(event: PointerEvent<HTMLDivElement>): void {
    if (!selectedSpriteFrame || event.button !== 0) return
    const stage = event.currentTarget
    spritePreviewDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
    }
    stage.setPointerCapture(event.pointerId)
    setIsSpritePreviewDragging(true)
  }

  function moveSpritePreviewPan(event: PointerEvent<HTMLDivElement>): void {
    const drag = spritePreviewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const stage = event.currentTarget
    stage.scrollLeft = drag.scrollLeft - (event.clientX - drag.x)
    stage.scrollTop = drag.scrollTop - (event.clientY - drag.y)
  }

  function stopSpritePreviewPan(event: PointerEvent<HTMLDivElement>): void {
    const drag = spritePreviewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    spritePreviewDragRef.current = null
    setIsSpritePreviewDragging(false)
  }

  function startAnimationPreviewPan(event: PointerEvent<HTMLDivElement>): void {
    if (!activeAnimationFrame || event.button !== 0) return
    const stage = event.currentTarget
    animationPreviewDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop,
    }
    stage.setPointerCapture(event.pointerId)
    setIsAnimationPreviewDragging(true)
  }

  function moveAnimationPreviewPan(event: PointerEvent<HTMLDivElement>): void {
    const drag = animationPreviewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const stage = event.currentTarget
    stage.scrollLeft = drag.scrollLeft - (event.clientX - drag.x)
    stage.scrollTop = drag.scrollTop - (event.clientY - drag.y)
  }

  function stopAnimationPreviewPan(event: PointerEvent<HTMLDivElement>): void {
    const drag = animationPreviewDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    animationPreviewDragRef.current = null
    setIsAnimationPreviewDragging(false)
  }

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
            <button
              className="ghost-button is-danger"
              disabled={!activePath || isNewCharacter || characterDeleteMutation.isPending || isGeneratingConcept}
              onClick={() => setDeleteCharacterDialogOpen(true)}
              type="button"
            >
              <StudioIcon name="remove" size={16} />
              Delete
            </button>
          </div>
        </header>

        {deleteCharacterDialogOpen && activePath && draft ? (
          <div className="story-dialog-scrim" onClick={() => !characterDeleteMutation.isPending && setDeleteCharacterDialogOpen(false)}>
            <section className="story-dialog" onClick={event => event.stopPropagation()}>
              <strong>Delete Character</strong>
              <p>Delete {draft.displayName || draft.id} from character data.</p>
              {characterDeleteMutation.error ? <p className="story-dialog-error">{characterDeleteMutation.error.message}</p> : null}
              <div className="story-dialog-actions">
                <button disabled={characterDeleteMutation.isPending} onClick={() => setDeleteCharacterDialogOpen(false)} type="button">Cancel</button>
                <button disabled={characterDeleteMutation.isPending} onClick={() => characterDeleteMutation.mutate(activePath)} type="submit">
                  {characterDeleteMutation.isPending ? 'Deleting' : 'Delete'}
                </button>
              </div>
            </section>
          </div>
        ) : null}

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
                          key={index}
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
          <div className="character-spritesheet-tab">
            <aside className="character-spritesheet-sidebar" aria-label="Character spritesheets">
              <div className="character-spritesheet-tree-toolbar">
                <strong>Spritesheets <span>{spritesheetFileCount}</span></strong>
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="character-spritesheet-upload-input"
                  onChange={event => {
                    uploadSpritesheet(event.target.files?.[0])
                    event.currentTarget.value = ''
                  }}
                  ref={spritesheetUploadInputRef}
                  type="file"
                />
                <div className="character-spritesheet-create-menu">
                  <button
                    aria-expanded={spritesheetMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Create spritesheet asset"
                    onClick={() => setSpritesheetMenuOpen(open => !open)}
                    type="button"
                  >
                    <StudioIcon name="add" size={16} />
                  </button>
                  {spritesheetMenuOpen ? (
                    <div className="character-spritesheet-menu" role="menu">
                      <button
                        onClick={() => {
                          setNewSpritesheetFolder('New Folder')
                          setSpritesheetMenuOpen(false)
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <StudioIcon name="assets" size={16} />
                        Folder
                      </button>
                      <button
                        disabled={spritesheetUploadMutation.isPending}
                        onClick={() => spritesheetUploadInputRef.current?.click()}
                        role="menuitem"
                        type="button"
                      >
                        <StudioIcon name="file" size={16} />
                        {spritesheetUploadMutation.isPending ? 'Uploading Spritesheet' : 'Upload Spritesheet'}
                      </button>
                      <button
                        disabled={spritesheetGenerateMutation.isPending}
                        onClick={() => {
                          openSpritesheetGenerateDialog()
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <StudioIcon name="run-doctor" size={16} />
                        {spritesheetGenerateMutation.isPending ? 'Generating Spritesheet' : 'Generate Spritesheet'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="character-spritesheet-tree" role="tree" aria-label="Spritesheet tree">
                {newSpritesheetFolder !== null ? (
                  <form
                    className="character-spritesheet-folder-form"
                    onSubmit={event => {
                      event.preventDefault()
                      createSpritesheetFolder()
                    }}
                  >
                    <StudioIcon name="assets" size={16} />
                    <input
                      autoFocus
                      onBlur={createSpritesheetFolder}
                      onChange={event => setNewSpritesheetFolder(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Escape') setNewSpritesheetFolder(null)
                      }}
                      value={newSpritesheetFolder}
                    />
                  </form>
                ) : null}

                {visibleSpritesheetFolders.map(folder => {
                  const folderSpritesheets = spritesheetsByFolder.get(folder) ?? []
                  const containsSpritesheet = folderSpritesheets.length > 0
                  const isSelectedFolder = folder === selectedSpritesheetFolder
                  return (
                    <div className="character-spritesheet-folder is-open" key={folder}>
                      <div
                        aria-expanded="true"
                        className={`character-spritesheet-folder-row ${isSelectedFolder ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedSpritesheetFolder(folder)
                          const first = folderSpritesheets[0]
                          if (first) setSelectedSpritesheetPath(first.path)
                        }}
                        role="treeitem"
                      >
                        <span>
                          <StudioIcon name="dropdown" size={14} />
                          <StudioIcon name="assets" size={16} />
                          <strong>{folder}</strong>
                        </span>
                        <small>{folderSpritesheets.length}</small>
                      </div>
                      <div className="character-spritesheet-folder-children" role="group">
                        {containsSpritesheet ? folderSpritesheets.map(item => (
                          <div
                            className={`character-spritesheet-file ${selectedSpritesheetAsset?.path === item.path ? 'is-active' : ''}`}
                            key={item.path}
                            onContextMenu={event => {
                              event.preventDefault()
                              openSpritesheetContextMenu(item.path, event.clientX, event.clientY)
                            }}
                          >
                            <button
                              className="character-spritesheet-open"
                              onClick={() => {
                                setSelectedSpritesheetFolder(folder)
                                setSelectedSpritesheetPath(item.path)
                              }}
                              type="button"
                            >
                              <span className="character-spritesheet-list-preview">
                                {item.url ? <img alt="" src={item.url} /> : null}
                              </span>
                              <span>
                                <strong>{item.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Spritesheet'}</strong>
                                <small>{item.atlas?.atlasKind ?? 'No atlas'}{item.isActive ? ' - active' : ''}</small>
                                <small>{item.atlas?.sheetSize ? `${item.atlas.sheetSize.w} x ${item.atlas.sheetSize.h} px` : item.path}</small>
                              </span>
                            </button>
                            <button
                              aria-expanded={spritesheetContextMenu?.assetPath === item.path}
                              aria-label={`More options for ${item.path}`}
                              className="character-spritesheet-more"
                              onClick={event => {
                                const rect = event.currentTarget.getBoundingClientRect()
                                openSpritesheetContextMenu(item.path, rect.right, rect.bottom)
                              }}
                              type="button"
                            >
                              <StudioIcon name="more" size={16} />
                            </button>
                          </div>
                        )) : (
                          <span className="character-spritesheet-empty-folder">Empty folder</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {spritesheetContextMenu ? (
                <div
                  className="character-spritesheet-context-menu"
                  role="menu"
                  style={{ left: spritesheetContextMenu.x, top: spritesheetContextMenu.y }}
                >
                  <button
                    className="is-danger"
                    disabled={spritesheetDeleteMutation.isPending}
                    onClick={deleteActiveSpritesheet}
                    role="menuitem"
                    type="button"
                  >
                    <StudioIcon name="remove" size={16} />
                    {spritesheetDeleteMutation.isPending ? 'Deleting' : 'Delete file'}
                  </button>
                </div>
              ) : null}
              {spritesheetDeleteMutation.error ? (
                <p className="character-sheet-upload-error">{spritesheetDeleteMutation.error.message}</p>
              ) : null}
              {spritesheetUploadMutation.error ? (
                <p className="character-sheet-upload-error">{spritesheetUploadMutation.error.message}</p>
              ) : null}
            </aside>

            <section className="character-spritesheet-detail">
              <div className="character-asset-heading">
                <strong>Sprite Preview</strong>
                <div className="character-spritesheet-zoom-tools" aria-label="Spritesheet zoom controls">
                  <button
                    aria-label="Zoom out"
                    disabled={!hasActiveSpritesheet || spritesheetZoom <= 0.25}
                    onClick={() => setSpritesheetZoom(current => Math.max(0.25, Number((current - 0.25).toFixed(2))))}
                    type="button"
                  >
                    -
                  </button>
                  <span>{spritesheetZoomPercent}%</span>
                  <button
                    aria-label="Zoom in"
                    disabled={!hasActiveSpritesheet || spritesheetZoom >= 4}
                    onClick={() => setSpritesheetZoom(current => Math.min(4, Number((current + 0.25).toFixed(2))))}
                    type="button"
                  >
                    <StudioIcon name="add" size={14} />
                  </button>
                  <button
                    aria-label="Fit spritesheet"
                    disabled={!hasActiveSpritesheet || spritesheetZoom === 1}
                    onClick={() => setSpritesheetZoom(1)}
                    type="button"
                  >
                    <StudioIcon name="zoom" size={14} />
                  </button>
                  <small>{selectedAtlas?.atlasKind ?? 'Visual Novel'} - {visibleAtlasFrames.length} sprites</small>
                </div>
              </div>
              <div
                className={`character-spritesheet-stage ${hasActiveSpritesheet ? '' : 'is-empty'} ${isSpritesheetDragging ? 'is-dragging' : ''}`}
                onPointerCancel={stopSpritesheetPan}
                onPointerDown={startSpritesheetPan}
                onPointerMove={moveSpritesheetPan}
                onPointerUp={stopSpritesheetPan}
                ref={spritesheetStageRef}
              >
                {hasActiveSpritesheet && activeSpritesheetUrl ? (
                  <img
                    alt={`${activeCharacter?.displayName ?? draft.displayName} spritesheet`}
                    onLoad={event => {
                      setSpritesheetNaturalSize({
                        w: event.currentTarget.naturalWidth,
                        h: event.currentTarget.naturalHeight,
                      })
                    }}
                    src={activeSpritesheetUrl}
                    style={spritesheetPreviewSize}
                  />
                ) : (
                  <span>No spritesheet configured</span>
                )}
              </div>
            </section>
          </div>
        ) : draft && activeTab === 'Sprites' ? (
          <div className="character-sprite-inspector">
            <aside className="character-sprite-list">
              <div className="character-asset-heading">
                <strong>Sprites</strong>
                <span>{stateSpriteFrames.length}</span>
              </div>
              <div className="character-sprite-list-scroll">
                {activeCharacter ? stateSpriteFrames.map(frame => (
                  <button
                    className={selectedSpriteFrame?.key === frame.key ? 'is-active' : ''}
                    key={frame.key}
                    onClick={() => setSelectedSpriteKey(frame.key)}
                    type="button"
                  >
                    <span className="character-sprite-list-thumb">
                      <span style={spriteFrameStyle(activeStateSpritesheetUrl, stateAtlas?.sheetSize, frame, 42, 56)} />
                    </span>
                    <span>
                      <strong>{frame.name}</strong>
                      <small>{frame.w} x {frame.h}</small>
                    </span>
                  </button>
                )) : null}
                {activeCharacter && stateSpriteFrames.length === 0 ? (
                  <p className="character-sprite-empty">No state sprites in this atlas.</p>
                ) : null}
              </div>
            </aside>
            <section className="character-sprite-preview">
              <div className="character-asset-heading">
                <strong>{selectedSpriteFrame?.name ?? 'Sprite'}</strong>
                <div className="character-sprite-preview-tools" aria-label="Sprite zoom controls">
                  <span>{selectedSpriteFrame ? `${selectedSpriteFrame.w} x ${selectedSpriteFrame.h}` : 'No sprite'}</span>
                  <button
                    aria-label="Zoom out"
                    disabled={!selectedSpriteFrame || spritePreviewZoom <= 0.25}
                    onClick={() => setSpritePreviewZoom(current => Math.max(0.25, Number((current - SPRITE_PREVIEW_ZOOM_STEP).toFixed(2))))}
                    type="button"
                  >
                    -
                  </button>
                  <small>{spritePreviewPercent}%</small>
                  <button
                    aria-label="Zoom in"
                    disabled={!selectedSpriteFrame || spritePreviewZoom >= 4}
                    onClick={() => setSpritePreviewZoom(current => Math.min(4, Number((current + SPRITE_PREVIEW_ZOOM_STEP).toFixed(2))))}
                    type="button"
                  >
                    <StudioIcon name="add" size={14} />
                  </button>
                  <button
                    aria-label="Fit sprite"
                    disabled={!selectedSpriteFrame || spritePreviewZoom === DEFAULT_SPRITE_PREVIEW_ZOOM}
                    onClick={() => setSpritePreviewZoom(DEFAULT_SPRITE_PREVIEW_ZOOM)}
                    type="button"
                  >
                    <StudioIcon name="zoom" size={14} />
                  </button>
                </div>
              </div>
              <div
                className={`character-sprite-preview-stage ${isSpritePreviewDragging ? 'is-dragging' : ''}`}
                onPointerCancel={stopSpritePreviewPan}
                onPointerDown={startSpritePreviewPan}
                onPointerMove={moveSpritePreviewPan}
                onPointerUp={stopSpritePreviewPan}
                ref={spritePreviewStageRef}
              >
                {activeCharacter && selectedSpriteFrame && spritePreviewFrameSize ? (
                  <span
                    style={spriteFrameStyle(
                      activeStateSpritesheetUrl,
                      stateAtlas?.sheetSize,
                      selectedSpriteFrame,
                      spritePreviewFrameSize.width,
                      spritePreviewFrameSize.height,
                    )}
                  />
                ) : (
                  <small>No sprite selected</small>
                )}
              </div>
            </section>
          </div>
        ) : draft && activeTab === 'Animations' ? (
          <div className="character-sprite-inspector">
            <aside className="character-sprite-list">
              <div className="character-asset-heading">
                <strong>Animations</strong>
                <span>{liveAnimationOptions.length}</span>
              </div>
              <div className="character-sprite-list-scroll">
              {liveAnimationOptions.map(option => (
                <button
                  className={`is-animation ${preferredAnimationOption?.key === option.key ? 'is-active' : ''}`}
                  key={option.key}
                  onClick={() => setSelectedAnimation(option.key)}
                  type="button"
                >
                  <span>{option.tag.name}</span>
                  <small>{option.asset.folder} - {option.tag.direction}</small>
                </button>
              ))}
              {activeCharacter && liveAnimationOptions.length === 0 ? (
                <p className="character-sprite-empty">No live animations in this atlas.</p>
              ) : null}
              </div>
            </aside>
            <section className="character-sprite-preview">
              <div className="character-asset-heading">
                <strong>{activeAnimationName}</strong>
                <div className="character-sprite-preview-tools" aria-label="Animation preview controls">
                  <span>{activeAnimationFrame ? `${activeAnimationFrame.w} x ${activeAnimationFrame.h}` : 'No animation'}</span>
                  <button
                    aria-label="Zoom out"
                    disabled={!activeAnimationFrame || animationPreviewZoom <= 0.25}
                    onClick={() => setAnimationPreviewZoom(current => Math.max(0.25, Number((current - ANIMATION_PREVIEW_ZOOM_STEP).toFixed(2))))}
                    type="button"
                  >
                    -
                  </button>
                  <small>{animationPreviewPercent}%</small>
                  <button
                    aria-label="Zoom in"
                    disabled={!activeAnimationFrame || animationPreviewZoom >= 4}
                    onClick={() => setAnimationPreviewZoom(current => Math.min(4, Number((current + ANIMATION_PREVIEW_ZOOM_STEP).toFixed(2))))}
                    type="button"
                  >
                    <StudioIcon name="add" size={14} />
                  </button>
                  <button
                    aria-label="Fit animation"
                    disabled={!activeAnimationFrame || animationPreviewZoom === DEFAULT_ANIMATION_PREVIEW_ZOOM}
                    onClick={() => setAnimationPreviewZoom(DEFAULT_ANIMATION_PREVIEW_ZOOM)}
                    type="button"
                  >
                    <StudioIcon name="zoom" size={14} />
                  </button>
                  <label className="character-animation-speed">
                    <span>{animationPlaybackSpeed.toFixed(2)}x</span>
                    <input
                      aria-label="Playback speed"
                      max={2}
                      min={0.25}
                      onChange={event => setAnimationPlaybackSpeed(Number(event.target.value))}
                      step={0.25}
                      type="range"
                      value={animationPlaybackSpeed}
                    />
                  </label>
                  <small>{activeAnimationFrames.length} frames</small>
                </div>
              </div>
              <div
                className={`character-sprite-preview-stage ${isAnimationPreviewDragging ? 'is-dragging' : ''}`}
                onPointerCancel={stopAnimationPreviewPan}
                onPointerDown={startAnimationPreviewPan}
                onPointerMove={moveAnimationPreviewPan}
                onPointerUp={stopAnimationPreviewPan}
                ref={animationPreviewStageRef}
              >
                {activeCharacter && activeAnimationFrame && activeAnimationPreviewSize ? (
                  <span
                    style={spriteFrameStyle(
                      activeAnimationSpritesheetUrl,
                      animationAtlas?.sheetSize,
                      activeAnimationFrame,
                      activeAnimationPreviewSize.width,
                      activeAnimationPreviewSize.height,
                    )}
                  />
                ) : (
                  <small>No animation selected</small>
                )}
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
      {spritesheetGenerateOpen && draft ? (
        <div className="story-dialog-scrim" role="presentation">
          <form
            aria-label="Generate spritesheet"
            aria-modal="true"
            className="story-dialog character-spritesheet-generate-dialog"
            onSubmit={event => {
              event.preventDefault()
              spritesheetGenerateMutation.mutate()
            }}
            role="dialog"
          >
            <strong>Generate Spritesheet</strong>
            <span className="story-dialog-source">Folder: {selectedSpritesheetFolder}</span>
            <div className="character-spritesheet-generate-grid">
              <label><span>Atlas</span><select onChange={event => updateSpritesheetAtlasKind(event.target.value as StudioCharacterSpritesheetGenerateRequest['atlasKind'])} value={spritesheetGenerateDraft.atlasKind ?? 'Visual Novel'}>
                <option>Visual Novel</option>
                <option>Animation</option>
              </select></label>
              <label><span>Size</span><select onChange={event => setSpritesheetGenerateDraft(current => ({ ...current, size: event.target.value as typeof spritesheetSizeOptions[number] }))} value={spritesheetGenerateDraft.size}>
                {spritesheetSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
              </select></label>
              <label><span>Type</span><select onChange={event => setSpritesheetGenerateDraft(current => ({ ...current, spritesheetType: event.target.value }))} value={spritesheetGenerateDraft.spritesheetType}>
                <option>Half Body</option>
                <option>Full Body</option>
                <option>Face Expressions</option>
              </select></label>
              <label><span>Layout</span><select onChange={event => setSpritesheetGenerateDraft(current => ({ ...current, layoutDirection: event.target.value as StudioCharacterSpritesheetGenerateRequest['layoutDirection'] }))} value={spritesheetGenerateDraft.layoutDirection}>
                <option>Horizontal</option>
                <option>Vertical</option>
                <option>Grid</option>
              </select></label>
              {spritesheetGenerateDraft.atlasKind === 'Animation' ? (
                <label><span>Frames per action</span><input min={1} onChange={event => updateSpritesheetGenerateNumber('animationFramesPerTag', event.target.value)} type="number" value={spritesheetGenerateDraft.animationFramesPerTag ?? spritesheetGenerateDraft.spriteCount} /></label>
              ) : (
                <label><span>Sprites</span><input min={1} onChange={event => updateSpritesheetGenerateNumber('spriteCount', event.target.value)} type="number" value={spritesheetGenerateDraft.spriteCount} /></label>
              )}
              <label><span>Columns</span><input min={0} onChange={event => updateSpritesheetGenerateNumber('columns', event.target.value)} type="number" value={spritesheetGenerateDraft.columns} /></label>
              <label><span>Frame duration</span><input min={1} onChange={event => updateSpritesheetGenerateNumber('frameDuration', event.target.value)} type="number" value={spritesheetGenerateDraft.frameDuration} /></label>
            </div>
            <label>
              <span>{spritesheetGenerateDraft.atlasKind === 'Animation' ? `Action tags (${generationFrameCount(spritesheetGenerateDraft)} total frames)` : 'Sprite names'}</span>
              <div className="character-spritesheet-tag-input">
                {spritesheetGenerateDraft.spriteNames.map((name, index) => (
                  <button
                    aria-label={`Remove ${name}`}
                    key={`${name}-${index}`}
                    onClick={() => removeSpritesheetGenerateName(index)}
                    type="button"
                  >
                    <span>{name}</span>
                    <StudioIcon name="remove" size={13} />
                  </button>
                ))}
                <input
                  onBlur={() => addSpritesheetGenerateNames(spritesheetGenerateNameInput)}
                  onChange={event => {
                    const value = event.target.value
                    if (value.includes(',')) {
                      addSpritesheetGenerateNames(value)
                      return
                    }
                    setSpritesheetGenerateNameInput(value)
                  }}
                  onKeyDown={handleSpritesheetNameKeyDown}
                  placeholder={spritesheetGenerateDraft.spriteNames.length ? (spritesheetGenerateDraft.atlasKind === 'Animation' ? 'Add animation' : 'Add state') : 'neutral'}
                  value={spritesheetGenerateNameInput}
                />
              </div>
            </label>
            <label>
              <span>Prompt</span>
              <textarea onChange={event => setSpritesheetGenerateDraft(current => ({ ...current, prompt: event.target.value }))} value={spritesheetGenerateDraft.prompt} />
            </label>
            {spritesheetGenerateMutation.error ? <p className="story-dialog-error">{spritesheetGenerateMutation.error.message}</p> : null}
            <div className="story-dialog-actions">
              <button disabled={spritesheetGenerateMutation.isPending} onClick={() => setSpritesheetGenerateOpen(false)} type="button">Cancel</button>
              <button disabled={spritesheetGenerateMutation.isPending} type="submit">{spritesheetGenerateMutation.isPending ? 'Generating' : 'Generate'}</button>
            </div>
          </form>
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
