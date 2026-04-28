import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBuilds, fetchBuildManifest, runBuild } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioBuildMode, StudioBuildRecord, StudioProjectSummary } from '../../shared/types.ts'

const buildModes: StudioBuildMode[] = ['standalone', 'static', 'portal', 'embedded']

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatBytes(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function manifestString(manifest: Record<string, unknown> | null | undefined, key: string): string {
  const value = manifest?.[key]
  return typeof value === 'string' ? value : ''
}

function manifestObject(manifest: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> {
  const value = manifest?.[key]
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function latestSuccessful(builds: StudioBuildRecord[]): StudioBuildRecord | null {
  return builds.find(build => build.status === 'success') ?? null
}

export function BuildPreview(props: {
  isRunningDoctor: boolean
  onRunDoctor: () => void
  project: StudioProjectSummary
}) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<StudioBuildMode>('standalone')
  const [previewKey, setPreviewKey] = useState(0)
  const buildsQuery = useQuery({
    queryKey: ['studio-builds', props.project.id],
    queryFn: () => fetchBuilds(props.project.id),
  })
  const manifestQuery = useQuery({
    queryKey: ['studio-build-manifest', props.project.id],
    queryFn: () => fetchBuildManifest(props.project.id),
  })
  const buildMutation = useMutation({
    mutationFn: () => runBuild(props.project.id, mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['studio-builds', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-build-manifest', props.project.id] })
      void queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
      setPreviewKey(key => key + 1)
    },
  })
  const builds = buildsQuery.data?.builds ?? []
  const latest = buildsQuery.data?.latest ?? null
  const playable = latestSuccessful(builds)
  const manifest = manifestQuery.data?.manifest ?? buildsQuery.data?.manifest ?? playable?.manifest ?? latest?.manifest ?? null
  const distribution = manifestObject(manifest, 'distribution')
  const sizes = manifestObject(manifest, 'sizes')
  const diagnostics = manifestObject(manifest, 'diagnostics')
  const previewUrl = buildsQuery.data?.previewUrl ?? playable?.previewUrl ?? null
  const iframeUrl = useMemo(() => {
    if (!previewUrl) return null
    return `${previewUrl}?studioPreview=${previewKey}`
  }, [previewKey, previewUrl])

  return (
    <div className="build-workspace">
      <section className="build-control-panel">
        <div className="build-panel-heading">
          <div>
            <strong>Build / Preview</strong>
            <span>{props.project.id}</span>
          </div>
          <div className="build-actions">
            <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
              <StudioIcon name="run-doctor" size={18} />
              Doctor
            </button>
            <button className="ghost-button" disabled={buildMutation.isPending} onClick={() => buildMutation.mutate()} type="button">
              <StudioIcon name="build" size={18} />
              {buildMutation.isPending ? 'Building' : 'Build'}
            </button>
          </div>
        </div>

        <div className="build-mode-row">
          {buildModes.map(item => (
            <button className={mode === item ? 'is-active' : ''} key={item} onClick={() => setMode(item)} type="button">
              {item}
            </button>
          ))}
        </div>

        <div className="build-stats-grid">
          <div>
            <span>Status</span>
            <strong data-status={latest?.status ?? 'idle'}>{latest?.status ?? 'No build'}</strong>
          </div>
          <div>
            <span>Mode</span>
            <strong>{String(distribution['mode'] ?? mode)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatBytes(sizes['total'])}</strong>
          </div>
          <div>
            <span>Warnings</span>
            <strong>{String(manifest?.['warnings'] ?? props.project.diagnostics.summary.warning)}</strong>
          </div>
        </div>

        {buildMutation.isError ? (
          <div className="build-error">
            <StudioIcon name="error" size={18} />
            <span>{buildMutation.error.message}</span>
          </div>
        ) : null}

        <section className="build-history-panel">
          <div className="build-subheading">
            <strong>Local Build History</strong>
            <span>{builds.length} records</span>
          </div>
          <div className="build-history-list">
            {builds.length === 0 ? (
              <p className="muted">No builds yet.</p>
            ) : builds.map(build => (
              <article className="build-history-row" data-status={build.status} key={build.id}>
                <span><StudioIcon name={build.status === 'success' ? 'info' : 'warning'} size={16} />{build.mode}</span>
                <strong>{formatDate(build.createdAt)}</strong>
                <small>{build.status === 'success' ? `${build.durationMs}ms` : build.error}</small>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="build-preview-panel">
        <div className="build-panel-heading">
          <div>
            <strong>Playable Preview</strong>
            <span>{manifestString(manifest, 'title') || props.project.title}</span>
          </div>
          <button className="ghost-button" disabled={!previewUrl} onClick={() => setPreviewKey(key => key + 1)} type="button">
            <StudioIcon name="preview" size={18} />
            Reload
          </button>
        </div>
        <div className="build-preview-frame">
          {iframeUrl ? (
            <iframe key={iframeUrl} src={iframeUrl} title={`${props.project.title} preview`} />
          ) : (
            <div>
              <StudioIcon name="preview" size={46} />
              <span>No build output</span>
            </div>
          )}
        </div>
      </section>

      <aside className="build-runtime-panel">
        <div className="build-panel-heading">
          <div>
            <strong>Runtime</strong>
            <span>{String(distribution['entry'] ?? 'index.html')}</span>
          </div>
        </div>
        <dl className="build-facts">
          <div>
            <dt>Manifest</dt>
            <dd>{manifestQuery.data?.manifestUrl ?? buildsQuery.data?.manifestUrl ?? 'Not generated'}</dd>
          </div>
          <div>
            <dt>Distribution</dt>
            <dd>{String(distribution['strategy'] ?? 'Pending')}</dd>
          </div>
          <div>
            <dt>Wrappers</dt>
            <dd>{Array.isArray(distribution['wrappers']) ? distribution['wrappers'].join(', ') || 'none' : 'none'}</dd>
          </div>
          <div>
            <dt>Diagnostics</dt>
            <dd>{String(diagnostics['summary'] ? 'manifest.json' : 'project doctor')}</dd>
          </div>
        </dl>
        <div className="build-manifest-code">
          <pre>{manifest ? JSON.stringify(manifest, null, 2) : 'manifest.json pending'}</pre>
        </div>
      </aside>
    </div>
  )
}
