import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteArtStyleImage, editArtStyleImage, fetchArtStyle, fetchProjects, generateArtStyleImage, runDoctor, saveProjectIdentity, uploadArtStyleImage, uploadProjectCover } from './api.ts'
import { AuthoringTools } from './AuthoringTools.tsx'
import { BuildPreview } from './BuildPreview.tsx'
import { CharacterDesigner } from './CharacterDesigner.tsx'
import { PluginManager } from './PluginManager.tsx'
import { SceneLibrary } from './SceneLibrary.tsx'
import { StudioSettings } from './StudioSettings.tsx'
import { StudioIcon } from './StudioIcon.tsx'
import { StoryEditor } from './StoryEditor.tsx'
import type { StudioIconName } from './StudioIcon.tsx'
import type { StudioArtStyleSlot, StudioProjectIdentityDraft, StudioProjectSummary } from '../../shared/types.ts'

const sections = ['Overview', 'Story', 'Characters', 'Scenes', 'Assets', 'Plugins', 'Tools', 'Settings', 'Build/Preview']

function sectionLabel(section: string): string {
  return section === 'Build/Preview' ? 'Build' : section
}

function sectionIcon(section: string): StudioIconName {
  return ({
    Overview: 'overview',
    Story: 'story',
    Characters: 'characters',
    Scenes: 'scenes',
    Assets: 'assets',
    Plugins: 'plugins',
    Tools: 'settings',
    Settings: 'settings',
    'Build/Preview': 'build',
  } as Record<string, StudioIconName>)[section] ?? 'overview'
}

function statusLabel(project: StudioProjectSummary): string {
  if (project.status === 'error') return `${project.diagnostics.summary.error} errors`
  if (project.status === 'warning') return `${project.diagnostics.summary.warning} warnings`
  return 'Ready'
}

function countItems(project: StudioProjectSummary): Array<[string, number]> {
  return [
    ['Story', project.counts.storyFiles],
    ['Characters', project.counts.characterFiles],
    ['Scenes', project.counts.sceneFiles],
    ['Assets', project.counts.assetFiles],
    ['Plugins', project.counts.plugins],
  ]
}

function countIcon(label: string): StudioIconName {
  return ({
    Story: 'story',
    Characters: 'characters',
    Scenes: 'scenes',
    Assets: 'assets',
    Plugins: 'plugins',
  } as Record<string, StudioIconName>)[label] ?? 'overview'
}

function countColor(label: string): string {
  return ({
    Story: '#38B2F6',
    Characters: '#22C55E',
    Scenes: '#A855F7',
    Assets: '#FACC15',
    Plugins: '#EC4899',
  } as Record<string, string>)[label] ?? '#E5E7EB'
}

function StudioTopbar(props: {
  projects: StudioProjectSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  selectedProject: StudioProjectSummary | null
  activeSection: string
  setActiveSection: (section: string) => void
  isRunningDoctor: boolean
  onRunDoctor: () => void
}) {
  return (
    <header className="studio-topbar">
      <div className="studio-mark">
        <span><StudioIcon name="app-logo" size={34} /></span>
        <strong>Biwa Studio</strong>
      </div>
      <div className="project-selector-shell">
        <label htmlFor="project-selector">Project</label>
        <select
          id="project-selector"
          onChange={(event) => props.onSelect(event.target.value)}
          value={props.selectedId ?? ''}
        >
          {props.projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </div>
      <div className="topbar-spacer" />
      {props.selectedProject ? (
        <span className="topbar-status" data-status={props.selectedProject.status}>
          {statusLabel(props.selectedProject)}
        </span>
      ) : null}
      <div className="topbar-actions">
        <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
          <StudioIcon name="run-doctor" size={18} />
          {props.isRunningDoctor ? 'Running' : 'Run Doctor'}
        </button>
        <button className="ghost-button" onClick={() => props.setActiveSection('Build/Preview')} type="button">
          <StudioIcon name="preview" size={18} />
          Preview
        </button>
        <button
          className={`ghost-button ${props.activeSection === 'Build/Preview' ? 'is-active' : ''}`}
          onClick={() => props.setActiveSection('Build/Preview')}
          type="button"
        >
          <StudioIcon name="build" size={18} />
          Build
        </button>
      </div>
    </header>
  )
}

function StudioSidebar(props: {
  activeSection: string
  setActiveSection: (section: string) => void
}) {
  return (
    <aside className="studio-sidebar" aria-label="Project sections">
      <div className="studio-sidebar-header">Project</div>
      <nav className="studio-section-list" aria-label="Project sections">
        {sections.map(section => (
          <button
            className={section === props.activeSection ? 'is-active' : ''}
            key={section}
            onClick={() => props.setActiveSection(section)}
            type="button"
          >
            <span className="nav-icon" aria-hidden="true">
              <StudioIcon name={sectionIcon(section)} size={22} />
            </span>
            <span>{sectionLabel(section)}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

function ArtStylePanel(props: { project: StudioProjectSummary }) {
  const queryClient = useQueryClient()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadSlot, setUploadSlot] = useState<number | null>(null)
  const [previewSlot, setPreviewSlot] = useState<StudioArtStyleSlot | null>(null)
  const [promptAction, setPromptAction] = useState<{ kind: 'generate' | 'edit'; slot: StudioArtStyleSlot } | null>(null)
  const [prompt, setPrompt] = useState('')
  const artStyleQuery = useQuery({
    queryKey: ['studio-art-style', props.project.id],
    queryFn: () => fetchArtStyle(props.project.id),
  })
  const invalidateArtStyle = () => {
    void queryClient.invalidateQueries({ queryKey: ['studio-art-style', props.project.id] })
    void queryClient.invalidateQueries({ queryKey: ['studio-assets', props.project.id] })
    void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
  }
  const uploadMutation = useMutation({
    mutationFn: (payload: { index: number; file: File }) => uploadArtStyleImage(props.project.id, payload.index, payload.file),
    onSuccess: invalidateArtStyle,
  })
  const generateMutation = useMutation({
    mutationFn: (payload: { index: number; prompt: string }) => generateArtStyleImage(props.project.id, payload.index, payload.prompt),
    onSuccess: () => {
      setPromptAction(null)
      setPrompt('')
      invalidateArtStyle()
    },
  })
  const editMutation = useMutation({
    mutationFn: (payload: { index: number; prompt: string }) => editArtStyleImage(props.project.id, payload.index, payload.prompt),
    onSuccess: () => {
      setPromptAction(null)
      setPrompt('')
      invalidateArtStyle()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (index: number) => deleteArtStyleImage(props.project.id, index),
    onSuccess: invalidateArtStyle,
  })
  const slots = artStyleQuery.data?.slots ?? Array.from({ length: 5 }, (_, index) => ({ index, path: null, url: null, size: null }))
  const isPromptPending = generateMutation.isPending || editMutation.isPending
  const promptError = generateMutation.error?.message ?? editMutation.error?.message ?? null

  function openPrompt(kind: 'generate' | 'edit', slot: StudioArtStyleSlot): void {
    setPromptAction({ kind, slot })
    setPrompt('')
  }

  function submitPrompt(): void {
    if (!promptAction) return
    const payload = { index: promptAction.slot.index, prompt }
    if (promptAction.kind === 'generate') generateMutation.mutate(payload)
    else editMutation.mutate(payload)
  }

  return (
    <section className="studio-panel art-style-panel">
      <div className="studio-panel-heading">
        <span>Art Style</span>
        <small>Visual reference slots</small>
      </div>
      <input
        accept="image/png,image/jpeg,image/webp"
        className="art-style-upload-input"
        onChange={event => {
          const file = event.target.files?.[0]
          if (file && uploadSlot !== null) uploadMutation.mutate({ index: uploadSlot, file })
          event.currentTarget.value = ''
          setUploadSlot(null)
        }}
        ref={uploadInputRef}
        type="file"
      />
      <div className="art-style-grid">
        {slots.map(slot => (
          <article className={slot.url ? 'art-style-slot has-image' : 'art-style-slot'} key={slot.index}>
            {slot.url ? (
              <>
                <img alt={`Art style reference ${slot.index + 1}`} src={slot.url} />
                <div className="art-style-slot-actions">
                  <button onClick={() => setPreviewSlot(slot)} type="button">View</button>
                  <button onClick={() => openPrompt('edit', slot)} type="button">Edit</button>
                  <button onClick={() => deleteMutation.mutate(slot.index)} type="button">Delete</button>
                </div>
              </>
            ) : (
              <div className="art-style-placeholder">
                <StudioIcon name="assets" size={30} />
                <span>Slot {slot.index + 1}</span>
              </div>
            )}
            <div className="art-style-slot-footer">
              <button
                className="ghost-button"
                onClick={() => {
                  setUploadSlot(slot.index)
                  uploadInputRef.current?.click()
                }}
                type="button"
              >
                Upload
              </button>
              <button className="ghost-button" onClick={() => openPrompt('generate', slot)} type="button">
                Generate
              </button>
            </div>
          </article>
        ))}
      </div>
      {uploadMutation.error ? <p className="story-dialog-error">{uploadMutation.error.message}</p> : null}
      {deleteMutation.error ? <p className="story-dialog-error">{deleteMutation.error.message}</p> : null}
      {previewSlot?.url ? (
        <div className="character-preview-modal" onClick={() => setPreviewSlot(null)}>
          <button className="character-preview-modal-close" onClick={() => setPreviewSlot(null)} type="button">x</button>
          <img alt={`Art style reference ${previewSlot.index + 1}`} src={previewSlot.url} />
        </div>
      ) : null}
      {promptAction ? (
        <div className="story-dialog-scrim" onClick={() => setPromptAction(null)}>
          <section className="story-dialog art-style-prompt-dialog" onClick={event => event.stopPropagation()}>
            <strong>{promptAction.kind === 'generate' ? 'Generate Art Style' : 'Edit Art Style'}</strong>
            <label>
              <span>Prompt</span>
              <textarea
                autoFocus
                onChange={event => setPrompt(event.target.value)}
                placeholder={promptAction.kind === 'generate' ? 'Anime visual novel style, soft lighting, painterly backgrounds...' : 'Refine colors, line weight, rendering mood...'}
                value={prompt}
              />
            </label>
            {promptError ? <p className="story-dialog-error">{promptError}</p> : null}
            <div className="story-dialog-actions">
              <button onClick={() => setPromptAction(null)} type="button">Cancel</button>
              <button disabled={isPromptPending} onClick={submitPrompt} type="button">
                {isPromptPending ? 'Working' : promptAction.kind === 'generate' ? 'Generate' : 'Edit'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function ProjectCover(props: { project: StudioProjectSummary }) {
  if (props.project.coverUrl) {
    return <img alt={`${props.project.title} cover`} src={props.project.coverUrl} />
  }
  const label = props.project.coverPath ? 'Cover Missing' : 'No Cover'
  return (
    <div className="overview-cover-placeholder" aria-label={label} role="img">
      <StudioIcon name="project" size={44} />
      <span>{label}</span>
    </div>
  )
}

function OverviewSection(props: {
  project: StudioProjectSummary
  isRunningDoctor: boolean
  onRunDoctor: () => void
  setActiveSection: (section: string) => void
}) {
  const queryClient = useQueryClient()
  const [isEditingIdentity, setIsEditingIdentity] = useState(false)
  const [identityDraft, setIdentityDraft] = useState<StudioProjectIdentityDraft>({
    title: props.project.title,
    description: props.project.description,
    coverPath: props.project.coverPath,
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const saveIdentityMutation = useMutation({
    mutationFn: async () => {
      let coverPath = identityDraft.coverPath
      if (coverFile) {
        const uploaded = await uploadProjectCover(props.project.id, coverFile)
        coverPath = uploaded.coverPath
      }
      return saveProjectIdentity(props.project.id, { ...identityDraft, coverPath })
    },
    onSuccess: async (response) => {
      setIdentityDraft({
        title: response.project.title,
        description: response.project.description,
        coverPath: response.project.coverPath,
      })
      setCoverFile(null)
      setCoverPreviewUrl(null)
      setIsEditingIdentity(false)
      await queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })

  useEffect(() => {
    setIdentityDraft({
      title: props.project.title,
      description: props.project.description,
      coverPath: props.project.coverPath,
    })
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setIsEditingIdentity(false)
  }, [props.project.coverPath, props.project.description, props.project.id, props.project.title])

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [coverPreviewUrl])

  const coverProject = coverPreviewUrl
    ? { ...props.project, coverUrl: coverPreviewUrl, coverPath: coverFile?.name ?? identityDraft.coverPath }
    : props.project

  return (
    <div className="overview-workspace">
      <div className="overview-content">
        <header className="overview-title-row">
          <div>
            <h1>Overview</h1>
            <p>Project summary and key information.</p>
          </div>
        </header>

        <section className="studio-panel overview-identity-panel">
          <div className="studio-panel-heading">
            <span>Identity</span>
            <div className="overview-identity-actions">
              {isEditingIdentity ? (
                <>
                  <button
                    className="ghost-button"
                    disabled={saveIdentityMutation.isPending}
                    onClick={() => {
                      setIdentityDraft({
                        title: props.project.title,
                        description: props.project.description,
                        coverPath: props.project.coverPath,
                      })
                      setCoverFile(null)
                      setCoverPreviewUrl(null)
                      setIsEditingIdentity(false)
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="ghost-button"
                    disabled={saveIdentityMutation.isPending || !identityDraft.title.trim()}
                    onClick={() => saveIdentityMutation.mutate()}
                    type="button"
                  >
                    {saveIdentityMutation.isPending ? 'Saving' : 'Save'}
                  </button>
                </>
              ) : (
                <button className="ghost-button" onClick={() => setIsEditingIdentity(true)} type="button">
                  Edit
                </button>
              )}
            </div>
          </div>
          <p className="muted">Basic information about your visual novel.</p>
          <div className="overview-identity-grid">
            <div className="overview-cover-editor">
              <div className="overview-cover-frame">
                <ProjectCover project={coverProject} />
              </div>
              {isEditingIdentity ? (
                <label className="overview-cover-upload">
                  <StudioIcon name="assets" size={18} />
                  <span>{coverFile ? coverFile.name : 'Upload Cover'}</span>
                  <input
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={event => {
                      const file = event.target.files?.[0] ?? null
                      setCoverFile(file)
                      setCoverPreviewUrl(previous => {
                        if (previous) URL.revokeObjectURL(previous)
                        return file ? URL.createObjectURL(file) : null
                      })
                    }}
                    type="file"
                  />
                </label>
              ) : null}
            </div>
            {isEditingIdentity ? (
              <div className="overview-identity-form">
                <label>
                  <span>ID</span>
                  <input disabled value={props.project.id} />
                </label>
                <label>
                  <span>Title</span>
                  <input
                    onChange={event => setIdentityDraft({ ...identityDraft, title: event.target.value })}
                    value={identityDraft.title}
                  />
                </label>
                <label>
                  <span>Version</span>
                  <input disabled value={props.project.version} />
                </label>
                <label>
                  <span>Description</span>
                  <textarea
                    onChange={event => setIdentityDraft({ ...identityDraft, description: event.target.value })}
                    value={identityDraft.description}
                  />
                </label>
                <label>
                  <span>Cover</span>
                  <input
                    disabled={Boolean(coverFile)}
                    onChange={event => setIdentityDraft({ ...identityDraft, coverPath: event.target.value })}
                    placeholder="ui/cover.jpg"
                    value={coverFile ? `ui/${coverFile.name}` : identityDraft.coverPath}
                  />
                </label>
                {saveIdentityMutation.isError ? <p className="form-error">{saveIdentityMutation.error.message}</p> : null}
              </div>
            ) : (
              <dl className="overview-meta-list">
              <div>
                <dt>ID</dt>
                <dd><code>{props.project.id}</code></dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{props.project.title}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{props.project.version}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{props.project.description || 'No description configured.'}</dd>
              </div>
              <div>
                <dt>Cover</dt>
                <dd>{props.project.coverPath || 'No cover configured.'}</dd>
              </div>
              </dl>
            )}
          </div>

          <div className="overview-subgrid">
            <section className="overview-subpanel">
              <h2>Localization</h2>
              <dl className="overview-meta-list is-compact">
                <div>
                  <dt>Default Locale</dt>
                  <dd>{props.project.defaultLocale}</dd>
                </div>
                <div>
                  <dt>Locales</dt>
                  <dd>{props.project.locales.join(', ')}</dd>
                </div>
              </dl>
              <button className="ghost-button" onClick={() => props.setActiveSection('Story')} type="button">
                Manage Locales
              </button>
            </section>

            <section className="overview-subpanel">
              <h2>Plugins</h2>
              <dl className="overview-meta-list is-compact">
                <div>
                  <dt>Active Plugins</dt>
                  <dd>{props.project.pluginIds.length ? props.project.pluginIds.join('\n') : 'None declared'}</dd>
                </div>
              </dl>
              <button className="ghost-button" onClick={() => props.setActiveSection('Plugins')} type="button">
                Manage Plugins
              </button>
            </section>
          </div>
        </section>

        <section className="studio-panel overview-stats-panel">
          <div className="studio-panel-heading">
            <span>Statistics</span>
          </div>
          <div className="count-grid">
            {countItems(props.project).map(([label, value]) => (
              <div className="count-card" key={label}>
                <span style={{ color: countColor(label) }}>
                  <StudioIcon name={countIcon(label)} size={20} />
                  {label}
                </span>
                <strong>{value}</strong>
                <small>{label === 'Story' ? 'Chapters' : label === 'Plugins' ? 'Active' : label}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ArtStylePanel project={props.project} />
    </div>
  )
}

function ProjectOverview(props: {
  project: StudioProjectSummary
  activeSection: string
  setActiveSection: (section: string) => void
  isRunningDoctor: boolean
  onRunDoctor: () => void
}) {
  const isStory = props.activeSection === 'Story'
  const isCharacters = props.activeSection === 'Characters'
  const isPlugins = props.activeSection === 'Plugins'
  const isTools = props.activeSection === 'Tools'
  const isSettings = props.activeSection === 'Settings'
  const isBuildPreview = props.activeSection === 'Build/Preview'
  const isSceneLibrary = props.activeSection === 'Scenes' || props.activeSection === 'Assets'
  return (
    <main className="studio-main">
      {props.activeSection === 'Overview' ? (
        <OverviewSection
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
          setActiveSection={props.setActiveSection}
        />
      ) : isStory ? (
        <StoryEditor
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : isCharacters ? (
        <CharacterDesigner
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : isPlugins ? (
        <PluginManager
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : isTools ? (
        <AuthoringTools
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : isSettings ? (
        <StudioSettings
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : isBuildPreview ? (
        <BuildPreview
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : isSceneLibrary ? (
        <SceneLibrary
          activeSection={props.activeSection === 'Scenes' ? 'Scenes' : 'Assets'}
          isRunningDoctor={props.isRunningDoctor}
          onRunDoctor={props.onRunDoctor}
          project={props.project}
        />
      ) : (
      <div className="studio-grid">
        <section className="studio-panel project-card">
          <div className="studio-panel-heading">
            <span>{props.activeSection}</span>
            <small>Framework contracts only</small>
          </div>
          <dl className="project-facts">
            <div>
              <dt>Default Locale</dt>
              <dd>{props.project.defaultLocale}</dd>
            </div>
            <div>
              <dt>Locales</dt>
              <dd>{props.project.locales.join(', ')}</dd>
            </div>
            <div>
              <dt>Plugins</dt>
              <dd>{props.project.pluginIds.length ? props.project.pluginIds.join(', ') : 'None declared'}</dd>
            </div>
          </dl>
          <div className="count-grid">
            {countItems(props.project).map(([label, value]) => (
              <div className="count-card" key={label}>
                <span style={{ color: countColor(label) }}>
                  <StudioIcon name={countIcon(label)} size={20} />
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <ArtStylePanel project={props.project} />
      </div>
      )}
    </main>
  )
}

export function App() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('Overview')
  const projectsQuery = useQuery({
    queryKey: ['studio-projects'],
    queryFn: fetchProjects,
  })
  const projects = useMemo(() => projectsQuery.data?.projects ?? [], [projectsQuery.data])
  const selectedProject = projects.find(project => project.id === selectedId) ?? projects[0] ?? null
  const doctorMutation = useMutation({
    mutationFn: (gameId: string) => runDoctor(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studio-projects'] }),
  })

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id)
  }, [projects, selectedId])

  if (projectsQuery.isLoading) {
    return <div className="studio-loading">Loading Biwa Studio</div>
  }

  if (projectsQuery.isError) {
    return (
      <div className="studio-loading">
        <span>Biwa Studio API unavailable</span>
        <p>{projectsQuery.error.message}</p>
      </div>
    )
  }

  return (
    <div className="studio-shell">
      <StudioTopbar
        activeSection={activeSection}
        isRunningDoctor={doctorMutation.isPending}
        onSelect={(id) => {
          setSelectedId(id)
          setActiveSection('Overview')
        }}
        onRunDoctor={() => selectedProject && doctorMutation.mutate(selectedProject.id)}
        projects={projects}
        selectedId={selectedProject?.id ?? null}
        selectedProject={selectedProject}
        setActiveSection={setActiveSection}
      />
      <StudioSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
      {selectedProject ? (
        <ProjectOverview
          activeSection={activeSection}
          isRunningDoctor={doctorMutation.isPending}
          onRunDoctor={() => doctorMutation.mutate(selectedProject.id)}
          project={selectedProject}
          setActiveSection={setActiveSection}
        />
      ) : (
        <main className="studio-main empty-state">No projects found under games/.</main>
      )}
    </div>
  )
}
