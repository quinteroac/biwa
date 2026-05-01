export type Position = 'left' | 'center' | 'right';

export interface Offset {
  x: number;
  y: number;
}

export interface SpritesheetStateSheet {
  file: string;
  atlas: string;
  sprites: Record<string, string>;
}

export interface SpritesheetAnimationSheet {
  file: string;
  atlas: string;
  actions: Record<string, string>;
}

export interface SpritesheetLibraryAnimation {
  type: 'spritesheet-library';
  defaultStateSheet?: string;
  defaultAnimationSheet?: string;
  defaultState?: string;
  defaultAction?: string;
  states: Record<string, SpritesheetStateSheet>;
  animationSheets: Record<string, SpritesheetAnimationSheet>;
}

export type Animation = SpritesheetLibraryAnimation;

export interface Layer {
  id: string;
  animation: Animation;
  default?: string;
}

export type AudioFormat = 'ogg' | 'mp3' | 'webm';

export interface VoiceConfig {
  folder: string;
  format?: AudioFormat;
  volume?: number; // 0.0 - 1.0
}

export type CharacterGender = 'Male' | 'Female' | 'Transgender' | 'Non-binary' | 'Other' | string;

export interface CharacterSheetAssets {
  main?: string;
  concepts?: string[];
  generated?: string[];
}

export interface CharacterFrontmatter {
  id: string;
  displayName?: string;
  nameColor?: string;
  isNarrator?: boolean;

  // Studio/editorial metadata. The runtime ignores these fields, but Biwa Studio
  // uses them for Character Sheet authoring, concept prompts, and LLM context.
  role?: string;
  age?: string;
  gender?: CharacterGender;
  tags?: string[];
  physicalDescription?: string;
  expressionsText?: string[];
  outfit?: string;
  palette?: string;
  personality?: string;
  traits?: string[];
  motivations?: string;
  fears?: string;
  internalConflict?: string;
  backstory?: string;
  keyEvents?: string[];
  arcInitial?: string;
  arcBreak?: string;
  arcFinal?: string;
  characterSheet?: CharacterSheetAssets;

  // Positioning
  defaultPosition?: Position;
  defaultExpression?: string;
  scale?: number;
  offset?: Offset;

  // Either `animation` or `layers` (mutually exclusive)
  animation?: Animation;
  layers?: Layer[];

  // Voice
  voice?: VoiceConfig;

  // allow extra fields for forward-compatibility
  [key: string]: unknown;
}

declare const frontmatter: CharacterFrontmatter;
export default frontmatter;
