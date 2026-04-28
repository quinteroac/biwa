import type { VnPluginDescriptor } from './plugins.d.ts';

export type GameConfigLazyModule = () => Promise<Record<string, unknown>>;
export type DistributionMode = 'standalone' | 'portal' | 'static' | 'embedded';

export interface GameThemeConfig {
  font?: string;
  dialogBg?: string;
  accent?: string;
  cssVars?: Record<string, string>;
  [key: string]: unknown;
}

export interface GameConfig {
  id: string;
  title: string;
  version: string;
  description?: string;
  cover?: string;
  story: {
    defaultLocale: string;
    locales: Record<string, string>;
  };
  data?: {
    characters?: string;
    scenes?: string;
    audio?: string;
    minigames?: string;
    [key: string]: string | undefined;
  };
  minigames?: Record<string, GameConfigLazyModule | string>;
  plugins?: VnPluginDescriptor[];
  theme?: GameThemeConfig;
  saves?: {
    slots?: number;
    autoSave?: boolean;
  };
  diagnostics?: {
    suppress?: Array<{
      code?: string;
      path?: string;
      message?: string;
      reason: string;
    }>;
  };
  endScreen?: {
    title?: string;
    message?: string;
  };
  distribution?: {
    mode?: DistributionMode;
    basePath?: string;
  };
}

declare const config: GameConfig;
export default config;
