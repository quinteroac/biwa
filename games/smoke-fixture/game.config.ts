import type { GameConfig } from '../../framework/types/game-config.d.ts'

const config: GameConfig = {
  id: 'smoke-fixture',
  title: 'Smoke Fixture',
  version: '0.1.0',
  description: 'Small fixture used by CI to validate the framework pipeline.',

  story: {
    defaultLocale: 'en',
    locales: {
      en: './story/en/main.ink',
    },
  },

  data: {
    scenes: './data/scenes/',
    characters: './data/characters/',
    audio: './data/audio/',
  },

  minigames: {},

  theme: {
    font: '"Georgia", serif',
    accent: '#c084fc',
    dialogBg: 'rgba(10, 10, 20, 0.85)',
    cssVars: {},
  },

  saves: {
    slots: 2,
    autoSave: false,
  },

  distribution: {
    mode: 'standalone',
    basePath: '/smoke-fixture',
  },
}

export default config
