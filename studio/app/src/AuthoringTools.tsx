import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuthoringAnalysis } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioAuthoringAnalysisResponse, StudioProjectSummary } from '../../shared/types.ts'

function percent(value: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function shortNode(id: string): string {
  return id.replace(/^[^/]+\//, '')
}

function emptyAnalysis(): StudioAuthoringAnalysisResponse {
  return {
    graph: { nodes: [], edges: [] },
    coverage: { totalKnots: 0, reachableKnots: 0, unreachableKnots: [], unresolvedEdges: [] },
    search: [],
    notes: [],
    localization: [],
    branches: [],
    debug: {
      diagnostics: { error: 0, warning: 0, info: 0, suppressed: 0 },
      buildStatus: 'none',
      buildMode: null,
      manifestUrl: null,
    },
  }
}

export function AuthoringTools(props: {
  isRunningDoctor: boolean
  onRunDoctor: () => void
  project: StudioProjectSummary
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const analysisQuery = useQuery({
    queryKey: ['studio-authoring', props.project.id, deferredQuery],
    queryFn: () => fetchAuthoringAnalysis(props.project.id, deferredQuery),
  })
  const data = analysisQuery.data ?? emptyAnalysis()
  const graphNodes = data.graph.nodes.filter(node => node.kind === 'knot')
  const previewEdges = data.graph.edges.slice(0, 18)

  return (
    <div className="authoring-workspace">
      <section className="authoring-panel authoring-search-panel">
        <div className="authoring-panel-heading">
          <div>
            <strong>Global Search</strong>
            <span>Dialogue, speakers, tags, variables and assets</span>
          </div>
          <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
            <StudioIcon name="run-doctor" size={18} />
            Doctor
          </button>
        </div>
        <label className="authoring-search-box">
          <span>Search project</span>
          <input
            onChange={event => setQuery(event.target.value)}
            placeholder="speaker, #tag, variable, asset..."
            value={query}
          />
        </label>
        <div className="authoring-search-results">
          {analysisQuery.isLoading ? (
            <p className="muted">Scanning project...</p>
          ) : data.search.length === 0 ? (
            <p className="muted">{query.trim() ? 'No matches.' : 'Type to search across framework files.'}</p>
          ) : data.search.map((result, index) => (
            <article key={`${result.path}-${result.line}-${index}`}>
              <strong>{result.kind}</strong>
              <span>{result.path}:{result.line}</span>
              <p>{result.snippet}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="authoring-panel authoring-coverage-panel">
        <div className="authoring-panel-heading">
          <div>
            <strong>Narrative Coverage</strong>
            <span>{percent(data.coverage.reachableKnots, data.coverage.totalKnots)} reachable</span>
          </div>
        </div>
        <div className="authoring-stat-grid">
          <div>
            <span>Knots</span>
            <strong>{data.coverage.totalKnots}</strong>
          </div>
          <div>
            <span>Reachable</span>
            <strong>{data.coverage.reachableKnots}</strong>
          </div>
          <div>
            <span>Unreachable</span>
            <strong>{data.coverage.unreachableKnots.length}</strong>
          </div>
          <div>
            <span>Broken Links</span>
            <strong>{data.coverage.unresolvedEdges.length}</strong>
          </div>
        </div>
        <div className="authoring-issue-list">
          {data.coverage.unresolvedEdges.slice(0, 8).map(edge => (
            <article key={`${edge.path}-${edge.line}-${edge.target}`}>
              <StudioIcon name="warning" size={16} />
              <span>{edge.path}:{edge.line}</span>
              <strong>{shortNode(edge.from)} {'->'} {edge.target}</strong>
            </article>
          ))}
          {data.coverage.unreachableKnots.slice(0, 8).map(node => (
            <article key={node.id}>
              <StudioIcon name="info" size={16} />
              <span>{node.path}:{node.line}</span>
              <strong>{node.title}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="authoring-panel authoring-graph-panel">
        <div className="authoring-panel-heading">
          <div>
            <strong>Story Graph</strong>
            <span>{graphNodes.length} knots · {data.graph.edges.length} links</span>
          </div>
        </div>
        <div className="authoring-graph-grid">
          <div className="authoring-node-list">
            {graphNodes.slice(0, 18).map(node => (
              <article key={node.id}>
                <strong>{node.title}</strong>
                <span>{node.locale} · {node.path}:{node.line}</span>
              </article>
            ))}
          </div>
          <div className="authoring-edge-list">
            {previewEdges.map(edge => (
              <article data-resolved={edge.resolved} key={`${edge.path}-${edge.line}-${edge.target}`}>
                <span>{edge.kind}</span>
                <strong>{shortNode(edge.from)} {'->'} {shortNode(edge.to)}</strong>
                <small>{edge.label}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="authoring-panel authoring-branches-panel">
        <div className="authoring-panel-heading">
          <div>
            <strong>Branch Simulation</strong>
            <span>{data.branches.length} sampled paths</span>
          </div>
        </div>
        <div className="authoring-branch-list">
          {data.branches.map(path => (
            <article key={path.id}>
              <strong>{path.id} · {path.stoppedBy}</strong>
              <p>{path.steps.length ? path.steps.map(step => `${shortNode(step.node)} (${step.via})`).join(' -> ') : shortNode(path.terminal)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="authoring-panel authoring-notes-panel">
        <div className="authoring-panel-heading">
          <div>
            <strong>Script Notes</strong>
            <span>{data.notes.length} comments</span>
          </div>
        </div>
        <div className="authoring-note-list">
          {data.notes.length === 0 ? (
            <p className="muted">No TODO, NOTE, FIXME or REVIEW comments found.</p>
          ) : data.notes.map(note => (
            <article key={`${note.path}-${note.line}-${note.tag}`}>
              <strong>{note.tag}</strong>
              <span>{note.path}:{note.line}</span>
              <p>{note.text}</p>
            </article>
          ))}
        </div>
      </section>

      <aside className="authoring-panel authoring-runtime-panel">
        <div className="authoring-panel-heading">
          <div>
            <strong>Localization & Debug</strong>
            <span>{props.project.defaultLocale} default locale</span>
          </div>
        </div>
        <div className="authoring-locale-list">
          {data.localization.map(locale => (
            <article key={locale.locale}>
              <strong>{locale.locale}</strong>
              <span>{locale.storyFiles} files · {locale.knots} knots · {locale.dialogueLines} lines</span>
              <small>{locale.missingFiles.length ? `Missing: ${locale.missingFiles.join(', ')}` : 'Locale file set aligned'}</small>
            </article>
          ))}
        </div>
        <dl className="authoring-debug-list">
          <div>
            <dt>Doctor</dt>
            <dd>{data.debug.diagnostics.error} errors · {data.debug.diagnostics.warning} warnings</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>{data.debug.buildStatus}{data.debug.buildMode ? ` · ${data.debug.buildMode}` : ''}</dd>
          </div>
          <div>
            <dt>Manifest</dt>
            <dd>{data.debug.manifestUrl ?? 'Not generated'}</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}
