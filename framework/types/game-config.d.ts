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
  minigames?: Record<string, (() => Promise<any>) | string>;
  theme?: {
    font?: string;
    dialogBg?: string;
    accent?: string;
    cssVars?: Record<string, string>;
    [key: string]: any;
  };
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
    mode?: 'standalone' | 'portal' | 'static' | 'embedded' | string;
    basePath?: string;
  };
  [key: string]: any;
}

declare const config: GameConfig;
export default config;
