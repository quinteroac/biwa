import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAssets, fetchScene, fetchScenes, saveScene } from './api.ts'
import type { StudioAssetKind, StudioProjectSummary, StudioSceneDraft } from '../../shared/types.ts'

const assetKinds: Array<StudioAssetKind | 'all'> = ['all', 'scenes', 'characters', 'audio', 'gallery', 'music', 'spritesheets', 'other']

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

export function SceneLibrary(props: {
  project: StudioProjectSummary
  activeSection: 'Scenes' | 'Assets'
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [assetFilter, setAssetFilter] = useState<StudioAssetKind | 'all'>('all')
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

  return (
    <div className="scene-workspace">
      <aside className="studio-panel scene-list-panel">
        <div className="studio-panel-heading">
          <span>Scenes</span>
          <small>{scenes.length} files</small>
        </div>
        <div className="scene-list">
          {scenes.map(scene => (
            <button
              className={scene.path === activePath ? 'is-active' : ''}
              key={scene.path}
              onClick={() => setSelectedPath(scene.path)}
              type="button"
            >
              <span>{scene.displayName}</span>
              <small>{scene.id}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="studio-panel scene-editor-panel">
        <div className="studio-panel-heading">
          <span>{props.activeSection === 'Scenes' ? 'Scene Metadata' : 'Asset Library'}</span>
          <div className="story-actions">
            <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
              Doctor
            </button>
            <button className="ghost-button" disabled={!draft || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
              {saveMutation.isPending ? 'Saving' : 'Save Scene'}
            </button>
          </div>
        </div>

        {draft ? (
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
              <input value={backgroundImage(draft)} onChange={event => setDraft(updateBackgroundImage(draft, event.target.value))} />
            </label>
            <label>
              <span>Thumbnail</span>
              <input value={draft.thumbnail} onChange={event => setDraft({ ...draft, thumbnail: event.target.value })} />
            </label>
            <label>
              <span>Prompt Base</span>
              <textarea value={draft.prompt} onChange={event => setDraft({ ...draft, prompt: event.target.value })} />
            </label>
          </div>
        ) : (
          <p className="muted">Select a scene to edit its metadata.</p>
        )}
      </section>

      <aside className="studio-panel scene-preview-panel">
        <div className="studio-panel-heading">
          <span>Preview</span>
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
