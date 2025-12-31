
export type Subtitle = {
  id: string;
  index: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
};

export type VideoMeta = {
  id: string;
  name: string;
  season?: string;
  episode?: string;
  path: string; // URL or File Path
  subtitleUrl?: string; // URL for cloud subtitles
  duration: number;
  lastPlayedTime: number;
  thumbnail?: string;
  parentId?: string; // ID of the folder containing this video
};

export type Folder = {
  id: string;
  name: string;
  parentId?: string; // ID of the parent folder (null/undefined for root)
  createdAt: number;
};

export type CorpusItem = {
  id: string;
  subtitleId: string;
  videoId: string;
  type: 'vocabulary' | 'grammar' | 'culture';
  content: string; // HTML or Markdown content
  anchor?: string; // The specific text in the subtitle this item refers to
  timestamp: number;
};

export type SavedWord = {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string; // IPA
  contextSentence: string;
  timestamp: number;
  videoId: string;
  subtitleId?: string;
  mastered?: boolean;
};

export type SavedSubtitle = {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  videoId: string;
  timestamp: number;
};

export const ViewStates = {
  LIBRARY: 'LIBRARY',
  PLAYER: 'PLAYER',
  LEARNING: 'LEARNING',
  COMMUNITY: 'COMMUNITY',
  SETTINGS: 'SETTINGS',
  HELP: 'HELP'
} as const;

export type ViewState = (typeof ViewStates)[keyof typeof ViewStates];

export type Theme = 'dark' | 'light';

export type AIProvider = 'gemini' | 'deepseek' | 'qwen' | 'openai';

export type AIConfig = {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
};
