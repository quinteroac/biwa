// games/mi-novela/game.config.ts
import { officialPlugins } from '../../framework/plugins/prebuilt/index.ts'
import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = {

  // — Identity —
  id:          'mi-novela',
  title:       'The Midnight Cafe',
  version:     '1.0.0',
  description: 'A story of impossible encounters in a cafe that should not exist.',
  cover:       './assets/ui/cover.jpg',

  // — Story —
  story: {
    defaultLocale: 'es',
    locales: {
      es: './story/es/main.ink',
      en: './story/en/main.ink',
    }
  },

  // — Datos —
  data: {
    characters: './data/characters/',
    scenes:     './data/scenes/',
    audio:      './data/audio/',
    minigames:  './data/minigames/',
  },

  // — Minigames (lazy load) —
  minigames: {
    match3:          () => import('./minigames/match3/Match3Game.ts'),
    sliding_puzzle:  () => import('./minigames/sliding_puzzle/SlidingPuzzle.ts'),
    tension_timer:   () => import('./minigames/tension_timer/TensionTimer.ts'),
  },

  // — Plugins —
  plugins: [
    officialPlugins.inkWashBackground(),
    officialPlugins.screenEffects(),
    officialPlugins.atmosphereEffects(),
    officialPlugins.devtools(),
  ],

  // — Presentation / Theme —
  theme: {
    font:      '"Georgia", serif',
    dialogBg:  'rgba(10, 10, 20, 0.85)',
    accent:    '#c084fc',
    cssVars: {
      '--vn-choice-hover': 'rgba(192, 132, 252, 0.15)',
      '--vn-name-color':   '#e2e8f0',
    }
  },

  // — Saves —
  saves: {
    slots:    5,
    autoSave: true,
  },
}

export default config
