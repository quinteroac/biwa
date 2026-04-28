import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProjects, runDoctor } from './api.ts'
import { CharacterDesigner } from './CharacterDesigner.tsx'
import { PluginManager } from './PluginManager.tsx'
import { SceneLibrary } from './SceneLibrary.tsx'
import { StudioIcon } from './StudioIcon.tsx'
import { StoryEditor } from './StoryEditor.tsx'
import type { StudioIconName } from './StudioIcon.tsx'
import type { StudioProjectSummary } from '../../shared/types.ts'

const sections = ['Overview', 'Story', 'Characters', 'Scenes', 'Assets', 'Plugins', 'Build/Preview']

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

function diagnosticIcon(severity: string): StudioIconName {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
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
        <strong>Studio</strong>
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

function DiagnosticsPanel(props: {
  project: StudioProjectSummary
  isRunning: boolean
  onRun: () => void
}) {
  const issues = props.project.diagnostics.issues
  return (
    <section className="studio-panel diagnostics-panel">
      <div className="studio-panel-heading">
        <span>Diagnostics</span>
        <button className="ghost-button" disabled={props.isRunning} onClick={props.onRun} type="button">
          {props.isRunning ? 'Running' : 'Run Doctor'}
        </button>
      </div>
      <div className="diagnostics-summary">
        <span data-severity="error"><StudioIcon name="error" size={16} />{props.project.diagnostics.summary.error} errors</span>
        <span data-severity="warning"><StudioIcon name="warning" size={16} />{props.project.diagnostics.summary.warning} warnings</span>
        <span data-severity="info"><StudioIcon name="info" size={16} />{props.project.diagnostics.summary.info} info</span>
      </div>
      {issues.length === 0 ? (
        <p className="muted">No diagnostics reported for this project.</p>
      ) : (
        <div className="issue-list">
          {issues.slice(0, 8).map((issue, index) => (
            <article className={`issue-row is-${issue.severity}`} key={`${issue.path}-${issue.code}-${index}`}>
              <div className="issue-row-heading">
                <span className="issue-icon">
                  <StudioIcon name={diagnosticIcon(issue.severity)} size={18} />
                </span>
                <div>
                  <strong>{issue.severity}</strong>
                  <span>{issue.code}</span>
                </div>
              </div>
              <p>{issue.message}</p>
              <small>{issue.path}</small>
            </article>
          ))}
        </div>
      )}
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
            <button className="ghost-button" type="button">
              Edit
            </button>
          </div>
          <p className="muted">Basic information about your visual novel.</p>
          <div className="overview-identity-grid">
            <div className="overview-cover-frame">
              <ProjectCover project={props.project} />
            </div>
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

      <DiagnosticsPanel
        isRunning={props.isRunningDoctor}
        onRun={props.onRunDoctor}
        project={props.project}
      />
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

        <DiagnosticsPanel
          isRunning={props.isRunningDoctor}
          onRun={props.onRunDoctor}
          project={props.project}
        />
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
    return <div className="studio-loading">Loading Studio</div>
  }

  if (projectsQuery.isError) {
    return (
      <div className="studio-loading">
        <span>Studio API unavailable</span>
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
