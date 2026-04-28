import type { VnPluginModule } from '../../../../framework/plugins.ts'

const plugin: VnPluginModule = {
  setup(context) {
    context.eventBus.on('engine:dialog', () => {
      // Tiny CI fixture plugin: proves declared local plugins can subscribe at runtime.
    })
  },
}

export default plugin
