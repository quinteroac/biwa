// games/framework-tutorial/game.config.ts
import { officialPlugins } from '../../framework/plugins.ts'
import type { GameConfig } from '../../framework/types.ts'

const config: GameConfig = {
  id:          'framework-tutorial',
  title:       'Tutorial del Framework',
  version:     '0.1.0',
  description: 'Una visual novel corta que enseña los conceptos principales del framework Biwa.',

  story: {
    defaultLocale: 'es',
    locales: {
      es: './story/es/main.ink',
      en: './story/en/main.ink',
    },
  },

  data: {
    characters: './data/characters/',
    scenes:     './data/scenes/',
    audio:      './data/audio/',
  },

  minigames: {},

  plugins: [
    officialPlugins.screenEffects(),
    officialPlugins.atmosphereEffects(),
  ],

  theme: {
    font:     '"Inter", "Segoe UI", sans-serif',
    dialogBg: 'rgba(13, 18, 28, 0.88)',
    accent:   '#38bdf8',
    cssVars:  {
      '--vn-choice-hover': 'rgba(56, 189, 248, 0.18)',
      '--vn-name-color':   '#e0f2fe',
      '--vn-menu-bg':      'linear-gradient(160deg, #09111f 0%, #123047 58%, #1d3b2f 100%)',
      '--vn-menu-text':    '#e6f6ff',
      '--vn-stage-bg':     '#07111c',
    },
  },

  saves: {
    slots:    5,
    autoSave: true,
  },

  distribution: {
    mode:     'standalone',
    basePath: '/framework-tutorial',
  },
}

export default config
