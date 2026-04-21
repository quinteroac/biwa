export type IntegrationMode = 'fullscreen' | 'overlay' | 'reactive';

export interface ResultConfig {
  inkVariable: string;
  type: 'number' | 'boolean' | 'string';
  description?: string;
}

export interface MinigameDifficulty {
  default: string;
  presets: Record<string, Record<string, any>>; // shallow overrides merged into `config`
}

export interface MinigameAudioConfig {
  bgm?: string; // id of a bgm track
  fadeIn?: number;
  fadeOut?: number;
  restorePrevious?: boolean;
}

export interface MinigameFrontmatter {
  id: string;
  displayName: string;
  description?: string;
  entry: string; // path to minigame implementation

  integration: IntegrationMode;

  config?: Record<string, any>;

  difficulty?: MinigameDifficulty;

  results: Record<string, ResultConfig>;

  thresholds?: Record<string, number>;

  audio?: MinigameAudioConfig;

  // allow extensions for implementation-specific fields
  [key: string]: any;
}

declare const frontmatter: MinigameFrontmatter;
export default frontmatter;
