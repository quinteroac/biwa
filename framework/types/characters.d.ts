export type Position = 'left' | 'center' | 'right';

export interface Offset {
  x: number;
  y: number;
}

// Animation variants
export interface SpritesAnimation {
  type: 'sprites';
  sprites: Record<string, string>;
}

export interface SpritesheetAnimation {
  type: 'spritesheet';
  file: string;
  atlas: string;
  expressions: Record<string, string>;
}

export interface SpineAnimation {
  type: 'spine';
  file: string;
  atlas: string;
  expressions: Record<string, string>;
  idle?: string;
}

export interface RiveAnimation {
  type: 'rive';
  file: string;
  stateMachine: string;
  expressions: Record<string, string>;
}

export type Animation = SpritesAnimation | SpritesheetAnimation | SpineAnimation | RiveAnimation;

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
