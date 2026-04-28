import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPlugins, installPlugin, removePlugin } from './api.ts'
import type { StudioPluginCatalogItem, StudioProjectSummary } from '../../shared/types.ts'

const categories = ['all', 'renderer', 'effects', 'player', 'devtools', 'asset', 'local']
const statuses = ['all', 'stable', 'experimental', 'planned', 'local']
const contracts = ['all', 'runtime', 'profile', 'local']

function capabilityText(plugin: StudioPluginCatalogItem): string {
  return plugin.capabilities.length > 0 ? plugin.capabilities.join(', ') : 'none'
}

function rendererText(plugin: StudioPluginCatalogItem): string {
  const parts = Object.entries(plugin.renderers).flatMap(([kind, values]) => values.map(value => `${kind}:${value}`))
  return parts.length > 0 ? parts.join(', ') : 'none'
}

function tagText(plugin: StudioPluginCatalogItem): string {
  return plugin.tags.length > 0 ? plugin.tags.join(', ') : 'none'
}

export function PluginManager(props: {
  project: StudioProjectSummary
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [contract, setContract] = useState('all')
  const pluginsQuery = useQuery({
    queryKey: ['studio-plugins', props.project.id],
    queryFn: () => fetchPlugins(props.project.id),
  })
  const installMutation = useMutation({
    mutationFn: (importName: string) => installPlugin(props.project.id, importName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-plugins', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const removeMutation = useMutation({
    mutationFn: (importName: string) => removePlugin(props.project.id, importName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-plugins', props.project.id] })
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] })
    },
  })
  const plugins = pluginsQuery.data?.plugins ?? []
  const filtered = useMemo(() => plugins.filter(plugin =>
    (category === 'all' || plugin.category === category) &&
    (status === 'all' || plugin.status === status) &&
    (contract === 'all' || plugin.contract === contract),
  ), [category, contract, plugins, status])

  return (
    <div className="plugin-workspace">
      <section className="studio-panel plugin-filter-panel">
        <div className="studio-panel-heading">
          <span>Plugin Catalog</span>
          <small>{filtered.length} shown</small>
        </div>
        <div className="asset-filter">
          {categories.map(item => (
            <button className={category === item ? 'is-active' : ''} key={item} onClick={() => setCategory(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <div className="asset-filter">
          {statuses.map(item => (
            <button className={status === item ? 'is-active' : ''} key={item} onClick={() => setStatus(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <div className="asset-filter">
          {contracts.map(item => (
            <button className={contract === item ? 'is-active' : ''} key={item} onClick={() => setContract(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <div className="story-actions plugin-actions">
          <button className="ghost-button" disabled={props.isRunningDoctor} onClick={props.onRunDoctor} type="button">
            Doctor
          </button>
        </div>
      </section>

      <section className="plugin-catalog">
        {filtered.map(plugin => (
          <article className="studio-panel plugin-card" key={plugin.id}>
            <div className="plugin-card-heading">
              <div>
                <span className="eyebrow">{plugin.category} · {plugin.status} · {plugin.contract}</span>
                <h2>{plugin.name}</h2>
              </div>
              <strong data-status={plugin.installed ? 'ok' : 'warning'}>{plugin.installed ? 'Installed' : 'Available'}</strong>
            </div>
            <p>{plugin.description}</p>
            <dl className="plugin-facts">
              <div>
                <dt>Capabilities</dt>
                <dd>{capabilityText(plugin)}</dd>
              </div>
              <div>
                <dt>Renderers</dt>
                <dd>{rendererText(plugin)}</dd>
              </div>
              <div>
                <dt>Ink Tags</dt>
                <dd>{tagText(plugin)}</dd>
              </div>
              <div>
                <dt>Compatibility</dt>
                <dd>{plugin.compatibilityMessage}</dd>
              </div>
            </dl>
            {plugin.configExample ? (
              <pre className="plugin-example">{plugin.configExample}</pre>
            ) : null}
            <div className="story-actions">
              {plugin.importName && !plugin.installed ? (
                <button
                  className="ghost-button"
                  disabled={!plugin.compatible || installMutation.isPending}
                  onClick={() => installMutation.mutate(plugin.importName as string)}
                  type="button"
                >
                  {installMutation.isPending ? 'Installing' : 'Install'}
                </button>
              ) : null}
              {plugin.importName && plugin.installed && plugin.removable ? (
                <button
                  className="ghost-button"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(plugin.importName as string)}
                  type="button"
                >
                  {removeMutation.isPending ? 'Removing' : 'Remove'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
