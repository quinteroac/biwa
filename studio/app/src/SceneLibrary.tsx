import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSceneFile, createSceneFolder, deleteSceneBackground, deleteSceneFile, fetchAssets, fetchScene, fetchScenes, generateSceneBackground, saveScene, uploadSceneBackground, uploadSceneFile } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioAssetItem, StudioProjectSummary, StudioSceneBackgroundAsset, StudioSceneDraft, StudioSceneItem } from '../../shared/types.ts'

type SceneAudioSlot = 'ambience' | 'music' | 'sfx'

function backgroundImage(scene: StudioSceneDraft): string {
  const background = scene.background
  if (typeof background['image'] === 'string') return background['image']
  if (typeof background['poster'] === 'string') return background['poster']
  return ''
}

function updateBackgroundImage(scene: StudioSceneDraft, image: string): StudioSceneDraft {
  return {
    ...scene,
    background: {
      ...scene.background,
      type: typeof scene.background['type'] === 'string' ? scene.background['type'] : 'static',
      image,
    },
  }
}

function assetName(path: string): string {
  return path.split('/').at(-1) ?? path
}

function assetSizeLabel(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

function sceneFolderFromPath(path: string): string {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'Scenes'
}

function audioAssets(assets: StudioAssetItem[]): StudioAssetItem[] {
  return assets.filter(asset => ['audio', 'music'].includes(asset.kind))
}

function assetFileUrl(projectId: string, path: string): string {
  return `/api/projects/${projectId}/assets/file?path=${encodeURIComponent(path)}`
}

function audioAssetMatchesSlot(asset: StudioAssetItem, slot: SceneAudioSlot): boolean {
  const path = asset.path.toLowerCase()
  if (slot === 'music') return asset.kind === 'music' || path.includes('/bgm/') || path.includes('/music/')
  if (slot === 'sfx') return path.includes('/sfx/')
  return path.includes('/ambience/') || path.includes('/ambient/') || (!path.includes('/bgm/') && !path.includes('/music/') && !path.includes('/sfx/'))
}

function audioCue(scene: StudioSceneDraft, slot: SceneAudioSlot): Record<string, unknown> | null {
  const cue = scene.audio[slot]
  return cue && typeof cue === 'object' && !Array.isArray(cue) ? cue as Record<string, unknown> : null
}

function audioCueFile(scene: StudioSceneDraft, slot: SceneAudioSlot): string {
  const cue = scene.audio[slot]
  if (typeof cue === 'string') return cue
  const record = audioCue(scene, slot)
  if (typeof record?.['file'] === 'string') return record['file']
  if (typeof record?.['id'] === 'string') return record['id']
  return ''
}

function audioIdFromPath(path: string): string {
  const name = assetName(path)
  return name.replace(/\.[^.]+$/, '') || path
}

function updateSceneAudioFile(scene: StudioSceneDraft, slot: SceneAudioSlot, file: string): StudioSceneDraft {
  const previous = audioCue(scene, slot) ?? {}
  return {
    ...scene,
    audio: {
      ...scene.audio,
      [slot]: {
        ...previous,
        id: audioIdFromPath(file),
        file,
        volume: typeof previous['volume'] === 'number' ? previous['volume'] : slot === 'sfx' ? 1 : 0.5,
      },
    },
  }
}

function clearSceneAudioSlot(scene: StudioSceneDraft, slot: SceneAudioSlot): StudioSceneDraft {
  const audio = { ...scene.audio }
  delete audio[slot]
  return { ...scene, audio }
}

function sceneAudioSlotLabel(slot: SceneAudioSlot): string {
  if (slot === 'sfx') return 'Scene'
  return slot[0] ? `${slot[0].toUpperCase()}${slot.slice(1)}` : slot
}

function draftFromScene(scene: StudioSceneItem): StudioSceneDraft {
  return {
    id: scene.id,
    displayName: scene.displayName,
    description: scene.description,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    mood: scene.mood,
    prompt: scene.prompt,
    thumbnail: scene.thumbnail,
    background: scene.background ?? { type: 'static', image: '' },
    audio: scene.audio ?? {},
    body: scene.body,
  }
}

export function SceneLibrary(props: {
  project: StudioProjectSummary
  activeSection: 'Scenes' | 'Assets'
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [draft, setDraft] = useState<StudioSceneDraft | null>(null)
  const [selectedBackgroundFolder, setSelectedBackgroundFolder] = useState('Main')
  const [selectedBackgroundPath, setSelectedBackgroundPath] = useState<string | null>(null)
  const [backgroundGenerateOpen, setBackgroundGenerateOpen] = useState(false)
  const [backgroundGeneratePrompt, setBackgroundGeneratePrompt] = useState('')
  const [sceneSearch, setSceneSearch] = useState('')
  const [selectedSceneFolder, setSelectedSceneFolder] = useState('Scenes')
  const [sceneMenuOpen, setSceneMenuOpen] = useState(false)
  const [newSceneFolder, setNewSceneFolder] = useState<string | null>(null)
  const [openSceneMenu, setOpenSceneMenu] = useState<string | null>(null)
  const [selectedAudioSlot, setSelectedAudioSlot] = useState<SceneAudioSlot>('ambience')
  const [audioPickerSlot, setAudioPickerSlot] = useState<SceneAudioSlot | null>(null)
  const [audioPickerSearch, setAudioPickerSearch] = useState('')
  const [previewAudioPath, setPreviewAudioPath] = useState<string | null>(null)
  const backgroundUploadInputRef = useRef<HTMLInputElement | null>(null)
  const sceneUploadInputRef = useRef<HTMLInputElement | null>(null)
  const scenesQuery = useQuery({
    queryKey: ['studio-scenes', props.project.id],
    queryFn: () => fetchScenes(props.project.id),
  })
  const assetsQuery = useQuery({
    queryKey: ['studio-assets', props.project.id],
    queryFn: () => fetchAssets(props.project.id),
  })
  const scenes = scenesQuery.data?.scenes ?? []
  const activePath = selectedPath ?? scenes[0]?.path ?? null
  const sceneQuery = useQuery({
    queryKey: ['studio-scene', props.project.id, activePath],
    queryFn: () => fetchScene(props.project.id, activePath ?? ''),
    enabled: Boolean(activePath),
  })
  const assets = assetsQuery.data?.assets ?? []
  const sceneFolders = useMemo(() => {
    const folders = new Set<string>(['Scenes'])
    for (const folder of scenesQuery.data?.folders ?? []) folders.add(folder.path)
    for (const scene of scenes) folders.add(sceneFolderFromPath(scene.path))
    return [...folders].sort((a, b) => a === 'Scenes' ? -1 : b === 'Scenes' ? 1 : a.localeCompare(b))
  }, [scenes, scenesQuery.data?.folders])
  const filteredScenes = useMemo(() => {
    const query = sceneSearch.trim().toLowerCase()
    if (!query) return scenes
    return scenes.filter(scene => [scene.displayName, scene.id, scene.path].some(value => value.toLowerCase().includes(query)))
  }, [sceneSearch, scenes])
  const scenesByFolder = useMemo(() => {
    const map = new Map<string, typeof scenes>()
    for (const folder of sceneFolders) map.set(folder, [])
    for (const scene of filteredScenes) {
      const folder = sceneFolderFromPath(scene.path)
      map.set(folder, [...(map.get(folder) ?? []), scene])
    }
    return map
  }, [filteredScenes, sceneFolders])
  const sceneAudioAssets = audioAssets(assets)
  const activeAudioPickerSlot = audioPickerSlot ?? selectedAudioSlot
  const audioPickerAssets = useMemo(() => {
    const query = audioPickerSearch.trim().toLowerCase()
    return sceneAudioAssets
      .filter(asset => audioAssetMatchesSlot(asset, activeAudioPickerSlot))
      .filter(asset => !query || asset.path.toLowerCase().includes(query))
  }, [activeAudioPickerSlot, audioPickerSearch, sceneAudioAssets])
  const sceneBackgroundAssets = sceneQuery.data?.scene.backgrounds ?? []
  const selectedBackground = sceneBackgroundAssets.find(asset => asset.path === selectedBackgroundPath)
    ?? sceneBackgroundAssets.find(asset => asset.isActive)
    ?? sceneBackgroundAssets[0]
    ?? null
  const saveMutation = useMutation({
    mutationFn: () => saveScene(props.project.id, activePath ?? '', draft as StudioSceneDraft),
    onSuccess: response => {
      setDraft(draftFromScene(response.scene))
      queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const sceneFolderMutation = useMutation({
    mutationFn: (folder: string) => createSceneFolder(props.project.id, folder),
    onSuccess: response => {
      setSelectedSceneFolder(response.folder || 'Scenes')
      setNewSceneFolder(null)
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const sceneCreateMutation = useMutation({
    mutationFn: (name: string) => createSceneFile(props.project.id, selectedSceneFolder === 'Scenes' ? '' : selectedSceneFolder, name),
    onSuccess: response => {
      setSelectedPath(response.scene.path)
      setSelectedSceneFolder(sceneFolderFromPath(response.scene.path))
      queryClient.setQueryData(['studio-scene', props.project.id, response.scene.path], { scene: response.scene })
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const sceneUploadMutation = useMutation({
    mutationFn: (file: File) => uploadSceneFile(props.project.id, selectedSceneFolder === 'Scenes' ? '' : selectedSceneFolder, file),
    onSuccess: response => {
      setSelectedPath(response.scene.path)
      setSelectedSceneFolder(sceneFolderFromPath(response.scene.path))
      setSceneMenuOpen(false)
      queryClient.setQueryData(['studio-scene', props.project.id, response.scene.path], { scene: response.scene })
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const sceneDeleteMutation = useMutation({
    mutationFn: (path: string) => deleteSceneFile(props.project.id, path),
    onSuccess: response => {
      const next = response.scenes[0]?.path ?? null
      setSelectedPath(next)
      setOpenSceneMenu(null)
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const backgroundUploadMutation = useMutation({
    mutationFn: (file: File) => uploadSceneBackground(props.project.id, activePath ?? '', draft as StudioSceneDraft, file, selectedBackgroundFolder),
    onSuccess: response => {
      setDraft(draftFromScene(response.scene))
      setSelectedBackgroundPath(response.path)
      queryClient.setQueryData(['studio-scene', props.project.id, response.scene.path], { scene: response.scene })
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-scene', props.project.id, response.scene.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const backgroundGenerateMutation = useMutation({
    mutationFn: () => generateSceneBackground(props.project.id, activePath ?? '', draft as StudioSceneDraft, {
      folder: selectedBackgroundFolder,
      prompt: backgroundGeneratePrompt,
    }),
    onSuccess: response => {
      setDraft(draftFromScene(response.scene))
      setSelectedBackgroundPath(response.path)
      setBackgroundGenerateOpen(false)
      setBackgroundGeneratePrompt('')
      queryClient.setQueryData(['studio-scene', props.project.id, response.scene.path], { scene: response.scene })
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-scene', props.project.id, response.scene.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const backgroundDeleteMutation = useMutation({
    mutationFn: (assetPath: string) => deleteSceneBackground(props.project.id, activePath ?? '', draft as StudioSceneDraft, assetPath),
    onSuccess: response => {
      setDraft(draftFromScene(response.scene))
      setSelectedBackgroundPath(response.scene.backgrounds.find(asset => asset.isActive)?.path ?? response.scene.backgrounds[0]?.path ?? null)
      queryClient.setQueryData(['studio-scene', props.project.id, response.scene.path], { scene: response.scene })
      void queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-scene', props.project.id, response.scene.path] })
      void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })

  useEffect(() => {
    if (!selectedPath && scenes[0]) setSelectedPath(scenes[0].path)
  }, [scenes, selectedPath])

  useEffect(() => {
    if (activePath) setSelectedSceneFolder(sceneFolderFromPath(activePath))
  }, [activePath])

  useEffect(() => {
    setPreviewAudioPath(null)
  }, [audioPickerSlot])

  useEffect(() => {
    if (!sceneQuery.data) return
    const scene = sceneQuery.data.scene
    setDraft(draftFromScene(scene))
    setSelectedBackgroundPath(scene.backgrounds.find(asset => asset.isActive)?.path ?? scene.backgrounds[0]?.path ?? null)
    setSelectedBackgroundFolder(scene.backgrounds.find(asset => asset.isActive)?.folder ?? scene.backgrounds[0]?.folder ?? 'Main')
  }, [sceneQuery.data])

  const activeBackground = draft ? backgroundImage(draft) : ''
  const uploadBackground = (file: File | undefined) => {
    if (!file || !draft || !activePath) return
    backgroundUploadMutation.mutate(file)
  }
  const applyBackground = (asset: StudioSceneBackgroundAsset) => {
    if (!draft) return
    setDraft(updateBackgroundImage({ ...draft, thumbnail: draft.thumbnail || asset.path }, asset.path))
    setSelectedBackgroundPath(asset.path)
    setSelectedBackgroundFolder(asset.folder)
  }
  const createGeneralSceneFolder = () => {
    const folder = newSceneFolder?.trim()
    if (!folder) {
      setNewSceneFolder(null)
      return
    }
    sceneFolderMutation.mutate(folder)
  }
  const uploadScene = (file: File | undefined) => {
    if (!file) return
    sceneUploadMutation.mutate(file)
  }

  return (
    <div className="scene-workspace">
      <aside className="scene-list-panel">
        <div className="scene-panel-heading">
          <strong>Scenes</strong>
          <input
            accept=".md,text/markdown,text/plain"
            className="scene-upload-input"
            onChange={event => {
              uploadScene(event.target.files?.[0])
              event.currentTarget.value = ''
            }}
            ref={sceneUploadInputRef}
            type="file"
          />
          <div className="scene-create-menu">
            <button
              aria-expanded={sceneMenuOpen}
              aria-haspopup="menu"
              className="ghost-button"
              onClick={() => setSceneMenuOpen(open => !open)}
              type="button"
            >
              New Scene
            </button>
            {sceneMenuOpen ? (
              <div className="scene-menu" role="menu">
                <button
                  onClick={() => {
                    sceneCreateMutation.mutate('New Scene')
                    setSceneMenuOpen(false)
                  }}
                  role="menuitem"
                  type="button"
                >
                  <StudioIcon name="add" size={16} />
                  Blank scene
                </button>
                <button
                  onClick={() => {
                    setNewSceneFolder('New Folder')
                    setSceneMenuOpen(false)
                  }}
                  role="menuitem"
                  type="button"
                >
                  <StudioIcon name="assets" size={16} />
                  Folder
                </button>
                <button
                  disabled={sceneUploadMutation.isPending}
                  onClick={() => sceneUploadInputRef.current?.click()}
                  role="menuitem"
                  type="button"
                >
                  <StudioIcon name="file" size={16} />
                  {sceneUploadMutation.isPending ? 'Uploading Scene' : 'Upload Scene'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <label className="scene-search">
          <span>Search scenes</span>
          <input onChange={event => setSceneSearch(event.target.value)} placeholder="Search scenes..." type="search" value={sceneSearch} />
        </label>
        <div className="scene-list" role="tree" aria-label="Scene tree">
          {newSceneFolder !== null ? (
            <form
              className="scene-folder-form"
              onSubmit={event => {
                event.preventDefault()
                createGeneralSceneFolder()
              }}
            >
              <StudioIcon name="assets" size={16} />
              <input
                autoFocus
                onBlur={createGeneralSceneFolder}
                onChange={event => setNewSceneFolder(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') setNewSceneFolder(null)
                }}
                value={newSceneFolder}
              />
            </form>
          ) : null}
          {sceneFolders.map(folder => {
            const folderScenes = scenesByFolder.get(folder) ?? []
            const selectedFolder = selectedSceneFolder === folder
            return (
              <div className="scene-folder" key={folder}>
                <div
                  aria-expanded="true"
                  className={`scene-folder-row ${selectedFolder ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedSceneFolder(folder)
                    const first = folderScenes[0]
                    if (first) setSelectedPath(first.path)
                  }}
                  role="treeitem"
                >
                  <span>
                    <StudioIcon name="dropdown" size={14} />
                    <StudioIcon name="scenes" size={16} />
                    <strong>{folder}</strong>
                  </span>
                  <small>{folderScenes.length}</small>
                </div>
                <div className="scene-folder-children" role="group">
                  {folderScenes.length > 0 ? folderScenes.map(scene => (
                    <div className={`scene-file ${scene.path === activePath ? 'is-active' : ''}`} key={scene.path}>
                      <button
                        className="scene-file-open"
                        onClick={() => setSelectedPath(scene.path)}
                        type="button"
                      >
                        <span className="scene-list-thumb">
                          {scene.previewUrl ? <img alt="" src={scene.previewUrl} /> : scene.id.slice(0, 2)}
                        </span>
                        <span>
                          <strong>{scene.displayName}</strong>
                          <small>{scene.id}</small>
                        </span>
                      </button>
                      <button
                        aria-expanded={openSceneMenu === scene.path}
                        aria-label={`More options for ${scene.displayName}`}
                        className="scene-file-more"
                        onClick={() => setOpenSceneMenu(current => current === scene.path ? null : scene.path)}
                        type="button"
                      >
                        <StudioIcon name="more" size={16} />
                      </button>
                      {openSceneMenu === scene.path ? (
                        <div className="scene-file-menu" role="menu">
                          <button
                            className="is-danger"
                            disabled={sceneDeleteMutation.isPending}
                            onClick={() => sceneDeleteMutation.mutate(scene.path)}
                            role="menuitem"
                            type="button"
                          >
                            <StudioIcon name="remove" size={16} />
                            {sceneDeleteMutation.isPending ? 'Deleting' : 'Delete'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )) : (
                    <span className="scene-empty-folder">Empty folder</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {sceneFolderMutation.error ? <p className="scene-list-error">{sceneFolderMutation.error.message}</p> : null}
        {sceneCreateMutation.error ? <p className="scene-list-error">{sceneCreateMutation.error.message}</p> : null}
        {sceneUploadMutation.error ? <p className="scene-list-error">{sceneUploadMutation.error.message}</p> : null}
        {sceneDeleteMutation.error ? <p className="scene-list-error">{sceneDeleteMutation.error.message}</p> : null}
      </aside>

      <section className="scene-editor-panel">
        <header className="scene-editor-header">
          <div>
            <h2>{draft?.displayName ?? sceneQuery.data?.scene.displayName ?? 'Scene'}</h2>
            <p>{draft?.id ?? sceneQuery.data?.scene.id ?? activePath ?? 'No scene selected'}</p>
          </div>
          <div className="scene-header-actions">
            <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
              Doctor
            </button>
            <button className="ghost-button" disabled={!draft || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
              {saveMutation.isPending ? 'Saving' : 'Save Scene'}
            </button>
          </div>
        </header>

        {draft ? (
          <div className="scene-design-workspace">
            <div className="scene-design-column scene-design-main">
              <section className="scene-field-panel scene-metadata-panel">
                <div className="scene-asset-heading">
                  <strong>Scene Metadata</strong>
                </div>
                <div className="scene-form">
                  <label>
                    <span>Display Name</span>
                    <input value={draft.displayName} onChange={event => setDraft({ ...draft, displayName: event.target.value })} />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} />
                  </label>
                  <div className="scene-form-grid">
                    <label>
                      <span>Location</span>
                      <input value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} />
                    </label>
                    <label>
                      <span>Time Of Day</span>
                      <input value={draft.timeOfDay} onChange={event => setDraft({ ...draft, timeOfDay: event.target.value })} />
                    </label>
                    <label>
                      <span>Weather</span>
                      <input value={draft.weather} onChange={event => setDraft({ ...draft, weather: event.target.value })} />
                    </label>
                    <label>
                      <span>Mood</span>
                      <input value={draft.mood} onChange={event => setDraft({ ...draft, mood: event.target.value })} />
                    </label>
                  </div>
                  <label>
                    <span>Active Background Asset</span>
                    <input value={activeBackground} onChange={event => setDraft(updateBackgroundImage(draft, event.target.value))} />
                  </label>
                  <label>
                    <span>Thumbnail</span>
                    <input value={draft.thumbnail} onChange={event => setDraft({ ...draft, thumbnail: event.target.value })} />
                  </label>
                  <div className="scene-tag-row">
                    {[draft.location, draft.timeOfDay, draft.weather, draft.mood].filter(Boolean).map(tag => (
                      <span key={tag}>{tag}</span>
                    ))}
                    <button type="button">+</button>
                  </div>
                </div>
              </section>

              <section className="scene-audio-panel scene-design-audio-panel">
              <div className="scene-asset-heading">
                <strong>Scene Audio</strong>
                <span>{draft.id}</span>
              </div>
              <div className="scene-audio-slots">
                {(['ambience', 'sfx', 'music'] as const).map(slot => (
                  <div
                    className={selectedAudioSlot === slot ? 'is-active' : ''}
                    key={slot}
                  >
                    <button
                      onClick={() => {
                        setSelectedAudioSlot(slot)
                        setAudioPickerSlot(slot)
                        setAudioPickerSearch('')
                      }}
                      type="button"
                    >
                      <span>{sceneAudioSlotLabel(slot)}</span>
                      <strong>{audioCueFile(draft, slot) || 'Not assigned'}</strong>
                    </button>
                    {audioCueFile(draft, slot) ? (
                      <button
                        aria-label={`Clear ${sceneAudioSlotLabel(slot)} audio`}
                        className="scene-audio-clear"
                        onClick={() => setDraft(clearSceneAudioSlot(draft, slot))}
                        type="button"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              </section>
            </div>

            <div className="scene-design-column scene-design-side">
              <section className="scene-background-panel scene-design-background-panel">
              <div className="scene-asset-heading">
                <strong>Background Assets</strong>
                <span>{sceneBackgroundAssets.length} files</span>
              </div>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="scene-background-upload-input"
                onChange={event => {
                  uploadBackground(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
                ref={backgroundUploadInputRef}
                type="file"
              />
              <div className="scene-design-background-preview">
                {selectedBackground?.url ? <img alt="" src={selectedBackground.url} /> : <span>No background asset selected</span>}
              </div>
              <div className="scene-design-actions">
                <button
                  className="ghost-button"
                  disabled={backgroundUploadMutation.isPending}
                  onClick={() => backgroundUploadInputRef.current?.click()}
                  type="button"
                >
                  Upload Asset
                </button>
                <button
                  className="ghost-button"
                  disabled={backgroundGenerateMutation.isPending}
                  onClick={() => setBackgroundGenerateOpen(true)}
                  type="button"
                >
                  {backgroundGenerateMutation.isPending ? 'Generating' : 'Generate Asset'}
                </button>
                <button
                  className="ghost-button"
                  disabled={!selectedBackground}
                  onClick={() => {
                    if (selectedBackground) applyBackground(selectedBackground)
                  }}
                  type="button"
                >
                  Set Active
                </button>
                <button
                  className="ghost-button is-danger"
                  disabled={!selectedBackground || backgroundDeleteMutation.isPending}
                  onClick={() => {
                    if (selectedBackground) backgroundDeleteMutation.mutate(selectedBackground.path)
                  }}
                  type="button"
                >
                  {backgroundDeleteMutation.isPending ? 'Deleting' : 'Delete'}
                </button>
              </div>
              {backgroundGenerateOpen ? (
                <div className="scene-design-generate-row">
                  <textarea
                    autoFocus
                    onChange={event => setBackgroundGeneratePrompt(event.target.value)}
                    placeholder="Night cafe exterior, rain, neon signage..."
                    value={backgroundGeneratePrompt}
                  />
                  <div>
                    <button className="ghost-button" onClick={() => setBackgroundGenerateOpen(false)} type="button">Cancel</button>
                    <button
                      className="ghost-button"
                      disabled={backgroundGenerateMutation.isPending}
                      onClick={() => backgroundGenerateMutation.mutate()}
                      type="button"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="scene-background-grid scene-design-asset-strip">
                {sceneBackgroundAssets.map(asset => (
                  <button
                    className={selectedBackground?.path === asset.path ? 'is-active' : ''}
                    key={asset.path}
                    onClick={() => {
                      setSelectedBackgroundPath(asset.path)
                      setSelectedBackgroundFolder(asset.folder)
                    }}
                    type="button"
                  >
                    {asset.url ? <img alt="" src={asset.url} /> : null}
                    <span>{assetName(asset.path)}</span>
                    <small>{asset.isActive ? 'active' : asset.folder}</small>
                  </button>
                ))}
              </div>
              {backgroundUploadMutation.error ? <p className="scene-background-error">{backgroundUploadMutation.error.message}</p> : null}
              {backgroundGenerateMutation.error ? <p className="scene-background-error">{backgroundGenerateMutation.error.message}</p> : null}
              {backgroundDeleteMutation.error ? <p className="scene-background-error">{backgroundDeleteMutation.error.message}</p> : null}
              </section>

              <section className="scene-field-panel scene-design-lighting-panel">
                <div className="scene-asset-heading">
                  <strong>Lighting & Mood</strong>
                </div>
                <div className="scene-form">
                  <label>
                    <span>Weather</span>
                    <input value={draft.weather} onChange={event => setDraft({ ...draft, weather: event.target.value })} />
                  </label>
                  <label>
                    <span>Time Of Day</span>
                    <input value={draft.timeOfDay} onChange={event => setDraft({ ...draft, timeOfDay: event.target.value })} />
                  </label>
                  <label>
                    <span>Mood</span>
                    <input value={draft.mood} onChange={event => setDraft({ ...draft, mood: event.target.value })} />
                  </label>
                  <label>
                    <span>Background Type</span>
                    <input
                      value={typeof draft.background['type'] === 'string' ? draft.background['type'] : 'static'}
                      onChange={event => setDraft({ ...draft, background: { ...draft.background, type: event.target.value } })}
                    />
                  </label>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <p className="muted">Select a scene to edit its metadata.</p>
        )}
        {draft && audioPickerSlot ? (
          <div className="story-dialog-scrim" onClick={() => setAudioPickerSlot(null)}>
            <section
              aria-label={`${sceneAudioSlotLabel(audioPickerSlot)} audio picker`}
              className="story-dialog scene-audio-picker-dialog"
              onClick={event => event.stopPropagation()}
            >
              <div className="scene-audio-picker-heading">
                <div>
                  <strong>{sceneAudioSlotLabel(audioPickerSlot)} Audio</strong>
                  <span>{audioPickerAssets.length} options</span>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => setAudioPickerSlot(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <label className="scene-audio-search">
                <span>Search audio</span>
                <input
                  autoFocus
                  onChange={event => setAudioPickerSearch(event.target.value)}
                  placeholder={`Search ${sceneAudioSlotLabel(audioPickerSlot).toLowerCase()} assets...`}
                  value={audioPickerSearch}
                />
              </label>
              {previewAudioPath ? (
                <div className="scene-audio-preview">
                  <strong>{assetName(previewAudioPath)}</strong>
                  <audio controls src={assetFileUrl(props.project.id, previewAudioPath)} />
                </div>
              ) : null}
              <div className="scene-audio-list scene-audio-picker-list">
                {audioPickerAssets.map(asset => (
                  <article
                    className={audioCueFile(draft, audioPickerSlot) === asset.path ? 'is-active' : ''}
                    key={asset.path}
                  >
                    <div>
                      <span>{asset.extension.toUpperCase()}</span>
                      <strong>{asset.path}</strong>
                      <small>{audioCueFile(draft, audioPickerSlot) === asset.path ? 'assigned' : assetSizeLabel(asset.size)}</small>
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => setPreviewAudioPath(current => current === asset.path ? null : asset.path)}
                      type="button"
                    >
                      {previewAudioPath === asset.path ? 'Hide' : 'Preview'}
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setDraft(updateSceneAudioFile(draft, audioPickerSlot, asset.path))
                        setSelectedAudioSlot(audioPickerSlot)
                        setAudioPickerSlot(null)
                      }}
                      type="button"
                    >
                      Assign
                    </button>
                  </article>
                ))}
                {audioPickerAssets.length === 0 ? <p className="muted">No matching audio assets.</p> : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>

    </div>
  )
}
