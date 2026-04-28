import type { VnPluginDescriptor, VnPluginModule } from '../../types/plugins.d.ts'
import type { RuntimeDiagnosticsSnapshot } from '../../types/diagnostics.d.ts'

export const DEVTOOLS_PLUGIN_ID = 'official-devtools'

interface DiagnosticsEngine {
  getDiagnosticsSnapshot?: () => RuntimeDiagnosticsSnapshot
}

function emitDiagnostics(context: Parameters<NonNullable<VnPluginModule['setup']>>[0]): void {
  const snapshot = (context.engine as DiagnosticsEngine).getDiagnosticsSnapshot?.()
  if (!snapshot) return
  context.eventBus.emit('engine:diagnostics', {
    source: 'devtools',
    snapshot,
  })
}

let disposeCurrent: (() => void) | null = null

export const devtoolsModule: VnPluginModule = {
  setup(context) {
    const events = [
      'engine:state',
      'engine:scene',
      'engine:character',
      'engine:bgm',
      'engine:ambience',
      'engine:voice',
      'engine:backlog',
      'engine:unlocks',
      'engine:diagnostics:request',
    ]
    const unsubs = events.map(event => context.eventBus.on(event, () => emitDiagnostics(context)))
    disposeCurrent = () => {
      for (const unsub of unsubs) unsub()
      disposeCurrent = null
    }
    queueMicrotask(() => emitDiagnostics(context))
  },
  dispose() {
    disposeCurrent?.()
  },
}

export function devtoolsPlugin(): VnPluginDescriptor {
  return {
    id: DEVTOOLS_PLUGIN_ID,
    name: 'Official Runtime Devtools',
    version: '0.1.0',
    type: 'plugin',
    capabilities: ['overlay', 'engine-event'],
    compatibility: { pluginApi: 'vn-plugin-api-v1' },
    loader: () => devtoolsModule,
  }
}
