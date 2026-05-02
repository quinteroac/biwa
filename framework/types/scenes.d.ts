export type Fit = 'cover' | 'contain' | 'fill';

export interface StaticVariant {
  image: string;
  fit?: Fit;
  position?: string;
}

export interface StaticBackground {
  type: 'static';
  // either `image` (single) or `variants` (map)
  image?: string;
  fit?: Fit;
  position?: string;
  variants?: Record<string, StaticVariant>;
  defaultVariant?: string;
}

export interface VideoBackground {
  type: 'video';
  file: string;
  poster?: string;
  fit?: Fit;
}

export interface ParallaxLayer {
  image: string;
  depth: number;
  fit?: Fit;
}

export interface ParallaxVariant {
  intensity?: number;
  layers: ParallaxLayer[];
}

export interface ParallaxBackground {
  type: 'parallax';
  layers?: ParallaxLayer[];
  intensity?: number;
  variants?: Record<string, ParallaxVariant>;
  defaultVariant?: string;
}

export interface SpineVariant {
  animation: string;
}

export interface SpineBackground {
  type: 'spine';
  file: string;
  atlas: string;
  idle: string;
  variants?: Record<string, SpineVariant>;
  defaultVariant?: string;
}

export interface CanvasBackground {
  type: 'canvas';
  entry: string;
  config?: Record<string, any>;
}

export interface ThreeBackground {
  type: 'three';
  entry: string;
  config?: Record<string, any>;
}

export type Background =
  | StaticBackground
  | VideoBackground
  | ParallaxBackground
  | SpineBackground
  | CanvasBackground
  | ThreeBackground;

export type TransitionType = 'fade' | 'fade-color' | 'slide' | 'wipe' | 'cut';
export type TransitionDirection = 'left' | 'right' | 'up' | 'down';

export interface TransitionConfig {
  type: TransitionType;
  duration?: number; // seconds
  direction?: TransitionDirection;
  color?: string;
  easing?: string;
}

export type AmbientEffect = 'rain' | 'snow' | 'sakura' | 'dust' | 'none';

export interface SceneAudioCue {
  id?: string;
  file?: string;
  volume?: number;
  fade?: number;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SceneAudioConfig {
  ambience?: string | SceneAudioCue;
  music?: string | SceneAudioCue;
  bgm?: string | SceneAudioCue;
  sfx?: string | SceneAudioCue | Record<string, string | SceneAudioCue>;
}

export interface SceneFrontmatter {
  id: string;
  displayName?: string;
  description?: string;

  background: Background;

  transitions?: {
    in?: TransitionConfig;
    out?: TransitionConfig;
  };

  ambient?: {
    effect?: AmbientEffect;
  };

  audio?: SceneAudioConfig;

  thumbnail?: string;

  [key: string]: any;
}

declare const frontmatter: SceneFrontmatter;
export default frontmatter;
