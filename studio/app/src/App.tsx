import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProjects, runDoctor } from './api.ts'
import { SceneLibrary } from './SceneLibrary.tsx'
import { StoryEditor } from './StoryEditor.tsx'
import type { StudioProjectSummary } from '../../shared/types.ts'

const sections = ['Overview', 'Story', 'Characters', 'Scenes', 'Assets', 'Plugins', 'Build/Preview']

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

function ProjectList(props: {
  projects: StudioProjectSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <aside className="studio-sidebar" aria-label="Projects">
      <div className="studio-mark">
        <span>VN</span>
        <strong>Studio</strong>
      </div>
      <div className="studio-sidebar-header">Projects</div>
      <div className="studio-project-list">
        {props.projects.map(project => (
          <button
            className={`studio-project-button ${project.id === props.selectedId ? 'is-active' : ''}`}
            key={project.id}
            onClick={() => props.onSelect(project.id)}
            type="button"
          >
            <span>{project.title}</span>
            <small>{project.id}</small>
            <em data-status={project.status}>{statusLabel(project)}</em>
          </button>
        ))}
      </div>
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
        <span>{props.project.diagnostics.summary.error} errors</span>
        <span>{props.project.diagnostics.summary.warning} warnings</span>
        <span>{props.project.diagnostics.summary.info} info</span>
      </div>
      {issues.length === 0 ? (
        <p className="muted">No diagnostics reported for this project.</p>
      ) : (
        <div className="issue-list">
          {issues.slice(0, 8).map((issue, index) => (
            <article className="issue-row" key={`${issue.path}-${issue.code}-${index}`}>
              <strong>{issue.severity}</strong>
              <span>{issue.code}</span>
              <p>{issue.message}</p>
              <small>{issue.path}</small>
            </article>
          ))}
        </div>
      )}
    </section>
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
  const isSceneLibrary = props.activeSection === 'Scenes' || props.activeSection === 'Assets'
  return (
    <main className="studio-main">
      <header className="project-header">
        <div>
          <span className="eyebrow">Authoring Project</span>
          <h1>{props.project.title}</h1>
          <p>{props.project.id} · v{props.project.version}</p>
        </div>
        <div className="status-block" data-status={props.project.status}>
          <span>Status</span>
          <strong>{statusLabel(props.project)}</strong>
        </div>
      </header>

      <nav className="section-tabs" aria-label="Project sections">
        {sections.map(section => (
          <button
            className={section === props.activeSection ? 'is-active' : ''}
            key={section}
            onClick={() => props.setActiveSection(section)}
            type="button"
          >
            {section}
          </button>
        ))}
      </nav>

      {isStory ? (
        <StoryEditor
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
                <span>{label}</span>
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
      <ProjectList
        onSelect={(id) => {
          setSelectedId(id)
          setActiveSection('Overview')
        }}
        projects={projects}
        selectedId={selectedProject?.id ?? null}
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
