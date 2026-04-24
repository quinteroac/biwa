export type AudioCategory = 'bgm' | 'sfx' | 'ambience' | 'voice';
export type AudioChannel = 'master' | 'bgm' | 'sfx' | 'voice';

export interface AudioLayer {
  id: string;
  file: string;
  defaultVolume?: number; // 0.0 - 1.0
  intro?: string; // optional intro file path for this layer
  loop?: string;  // optional loop file path for this layer
}

export interface AudioBase {
  id: string;
  category: AudioCategory;
  displayName: string;
  description?: string;

  // Playback controls
  loop?: boolean | string; // `true`/`false` or a path when using intro+loop pattern
  volume?: number; // 0.0 - 1.0
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds

  // Metadata
  tags?: string[];
  bpm?: number;
  mood?: string;

  // Allow extensions
  [key: string]: any;
}

export interface SingleFileTrack extends AudioBase {
  file: string;
  layers?: undefined;
}

export interface AdaptiveTrack extends AudioBase {
  layers: AudioLayer[];
  file?: undefined;
}

export type AudioFrontmatter = SingleFileTrack | AdaptiveTrack;

declare const frontmatter: AudioFrontmatter;
export default frontmatter;
