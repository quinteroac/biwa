import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAssets, fetchScene, fetchScenes, saveScene } from './api.ts'
import type { StudioAssetItem, StudioAssetKind, StudioProjectSummary, StudioSceneDraft } from '../../shared/types.ts'

const assetKinds: Array<StudioAssetKind | 'all'> = ['all', 'scenes', 'characters', 'audio', 'gallery', 'music', 'spritesheets', 'other']
const sceneTabs = ['Scene Info', 'Backgrounds / Posters', 'Audio', 'Lighting & Mood', 'Hotspots'] as const

type SceneTab = typeof sceneTabs[number]

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

function backgroundVariants(scene: StudioSceneDraft): Array<{ name: string; image: string }> {
  const variants = scene.background['variants']
  if (typeof variants !== 'object' || variants === null || Array.isArray(variants)) return []
  return Object.entries(variants).flatMap(([name, value]) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
    const image = (value as Record<string, unknown>)['image']
    return typeof image === 'string' ? [{ name, image }] : []
  })
}

function assetName(path: string): string {
  return path.split('/').at(-1) ?? path
}

function assetFolder(path: string): string {
  return path.split('/').slice(0, -1).join('/') || 'assets'
}

function assetSizeLabel(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

function imageAssets(assets: StudioAssetItem[]): StudioAssetItem[] {
  return assets.filter(asset => asset.previewUrl && (asset.kind === 'scenes' || asset.kind === 'gallery'))
}

function audioAssets(assets: StudioAssetItem[]): StudioAssetItem[] {
  return assets.filter(asset => ['audio', 'music'].includes(asset.kind))
}

export function SceneLibrary(props: {
  project: StudioProjectSummary
  activeSection: 'Scenes' | 'Assets'
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [assetFilter, setAssetFilter] = useState<StudioAssetKind | 'all'>('all')
  const [activeTab, setActiveTab] = useState<SceneTab>(props.activeSection === 'Assets' ? 'Backgrounds / Posters' : 'Scene Info')
  const [draft, setDraft] = useState<StudioSceneDraft | null>(null)
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
  const filteredAssets = useMemo(() => {
    const assets = assetsQuery.data?.assets ?? []
    return assetFilter === 'all' ? assets : assets.filter(asset => asset.kind === assetFilter)
  }, [assetFilter, assetsQuery.data])
  const assets = assetsQuery.data?.assets ?? []
  const sceneImageAssets = imageAssets(assets)
  const sceneAudioAssets = audioAssets(assets)
  const saveMutation = useMutation({
    mutationFn: () => saveScene(props.project.id, activePath ?? '', draft as StudioSceneDraft),
    onSuccess: response => {
      setDraft({
        id: response.scene.id,
        displayName: response.scene.displayName,
        description: response.scene.description,
        location: response.scene.location,
        timeOfDay: response.scene.timeOfDay,
        weather: response.scene.weather,
        mood: response.scene.mood,
        prompt: response.scene.prompt,
        thumbnail: response.scene.thumbnail,
        background: response.scene.background ?? { type: 'static', image: '' },
        body: response.scene.body,
      })
      queryClient.invalidateQueries({ queryKey: ['studio-scenes', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })

  useEffect(() => {
    if (!selectedPath && scenes[0]) setSelectedPath(scenes[0].path)
  }, [scenes, selectedPath])

  useEffect(() => {
    if (!sceneQuery.data) return
    const scene = sceneQuery.data.scene
    setDraft({
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
      body: scene.body,
    })
  }, [sceneQuery.data])

  useEffect(() => {
    if (props.activeSection === 'Assets') setActiveTab('Backgrounds / Posters')
  }, [props.activeSection])

  const activeBackground = draft ? backgroundImage(draft) : ''
  const variants = draft ? backgroundVariants(draft) : []
  const featuredBackgrounds = [
    ...sceneImageAssets.filter(asset => asset.path === activeBackground),
    ...sceneImageAssets.filter(asset => asset.path !== activeBackground),
  ].slice(0, 8)

  return (
    <div className="scene-workspace">
      <aside className="scene-list-panel">
        <div className="scene-panel-heading">
          <strong>Scenes</strong>
          <button className="ghost-button" type="button">New Scene</button>
        </div>
        <label className="scene-search">
          <span>Search scenes</span>
          <input placeholder="Search scenes..." type="search" />
        </label>
        <div className="scene-list">
          {scenes.map(scene => (
            <button
              className={scene.path === activePath ? 'is-active' : ''}
              key={scene.path}
              onClick={() => setSelectedPath(scene.path)}
              type="button"
            >
              <span className="scene-list-thumb">
                {scene.previewUrl ? <img alt="" src={scene.previewUrl} /> : scene.id.slice(0, 2)}
              </span>
              <span>{scene.displayName}</span>
              <small>{scene.id}</small>
            </button>
          ))}
        </div>
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

        <nav className="scene-tabs" aria-label="Scene editor tabs">
          {sceneTabs.map(tab => (
            <button className={activeTab === tab ? 'is-active' : ''} key={tab} onClick={() => setActiveTab(tab)} type="button">
              {tab}
            </button>
          ))}
        </nav>

        {draft && activeTab === 'Scene Info' ? (
          <div className="scene-info-grid">
            <section className="scene-field-panel">
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
                  <span>Background Image / Poster</span>
                  <input value={activeBackground} onChange={event => setDraft(updateBackgroundImage(draft, event.target.value))} />
                </label>
                <label>
                  <span>Thumbnail</span>
                  <input value={draft.thumbnail} onChange={event => setDraft({ ...draft, thumbnail: event.target.value })} />
                </label>
                <label>
                  <span>Prompt / Notes</span>
                  <textarea value={draft.prompt} onChange={event => setDraft({ ...draft, prompt: event.target.value })} />
                </label>
                <div className="scene-tag-row">
                  {[draft.location, draft.timeOfDay, draft.weather, draft.mood].filter(Boolean).map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                  <button type="button">+</button>
                </div>
              </div>
            </section>
            <section className="scene-background-panel">
              <div className="scene-asset-heading">
                <strong>Backgrounds / Posters</strong>
                <span>{sceneImageAssets.length} assets</span>
              </div>
              <div className="scene-featured-background">
                {sceneQuery.data?.scene.previewUrl ? <img alt="" src={sceneQuery.data.scene.previewUrl} /> : <span>No preview asset</span>}
              </div>
              <div className="scene-background-actions">
                <button className="ghost-button" type="button">Set as Background</button>
                <button className="ghost-button" type="button">Replace</button>
              </div>
              <div className="scene-background-grid">
                {featuredBackgrounds.slice(0, 6).map(asset => (
                  <button
                    className={asset.path === activeBackground ? 'is-active' : ''}
                    key={asset.path}
                    onClick={() => setDraft(updateBackgroundImage(draft, asset.path))}
                    type="button"
                  >
                    {asset.previewUrl ? <img alt="" src={asset.previewUrl} /> : null}
                    <span>{assetName(asset.path)}</span>
                    <small>{assetFolder(asset.path)}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : draft && activeTab === 'Backgrounds / Posters' ? (
          <section className="scene-background-panel is-full">
            <div className="scene-asset-heading">
              <strong>Backgrounds / Posters</strong>
              <span>{sceneImageAssets.length} assets</span>
            </div>
            <div className="scene-background-grid is-large">
              {sceneImageAssets.map(asset => (
                <button
                  className={asset.path === activeBackground ? 'is-active' : ''}
                  key={asset.path}
                  onClick={() => setDraft(updateBackgroundImage(draft, asset.path))}
                  type="button"
                >
                  {asset.previewUrl ? <img alt="" src={asset.previewUrl} /> : null}
                  <span>{assetName(asset.path)}</span>
                  <small>{assetSizeLabel(asset.size)}</small>
                </button>
              ))}
            </div>
          </section>
        ) : draft && activeTab === 'Audio' ? (
          <section className="scene-audio-panel">
            <div className="scene-asset-heading">
              <strong>Scene Audio</strong>
              <span>{sceneAudioAssets.length} files</span>
            </div>
            <div className="scene-audio-list">
              {sceneAudioAssets.map(asset => (
                <button key={asset.path} type="button">
                  <span>Audio</span>
                  <strong>{asset.path}</strong>
                  <small>{assetSizeLabel(asset.size)}</small>
                </button>
              ))}
            </div>
          </section>
        ) : draft && activeTab === 'Lighting & Mood' ? (
          <section className="scene-field-panel is-single">
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
        ) : draft && activeTab === 'Hotspots' ? (
          <section className="scene-empty-panel">
            <strong>Hotspots</strong>
            <p className="muted">No hotspot contract is defined for this scene yet.</p>
          </section>
        ) : (
          <p className="muted">Select a scene to edit its metadata.</p>
        )}
      </section>

      <aside className="scene-preview-panel">
        <div className="scene-panel-heading">
          <strong>Preview</strong>
          <small>{sceneQuery.data?.scene.background && typeof sceneQuery.data.scene.background['type'] === 'string' ? sceneQuery.data.scene.background['type'] : 'background'}</small>
        </div>
        <div className="scene-preview-frame">
          {sceneQuery.data?.scene.previewUrl ? (
            <img alt={sceneQuery.data.scene.displayName} src={sceneQuery.data.scene.previewUrl} />
          ) : (
            <span>No preview asset</span>
          )}
        </div>

        <div className="asset-filter">
          {assetKinds.map(kind => (
            <button className={assetFilter === kind ? 'is-active' : ''} key={kind} onClick={() => setAssetFilter(kind)} type="button">
              {kind}
            </button>
          ))}
        </div>

        <div className="scene-preview-variants">
          {variants.map(variant => (
            <button
              className={variant.image === activeBackground ? 'is-active' : ''}
              key={variant.name}
              onClick={() => draft && setDraft(updateBackgroundImage(draft, variant.image))}
              type="button"
            >
              {variant.name}
            </button>
          ))}
        </div>

        <div className="asset-list">
          {filteredAssets.slice(0, 36).map(asset => (
            <button
              className="asset-row"
              key={asset.path}
              onClick={() => {
                if (draft && asset.kind === 'scenes') setDraft(updateBackgroundImage(draft, asset.path))
              }}
              type="button"
            >
              {asset.previewUrl ? <img alt="" src={asset.previewUrl} /> : <span>{asset.extension || 'file'}</span>}
              <small>{asset.path}</small>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
