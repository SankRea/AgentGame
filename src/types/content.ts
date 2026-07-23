import type { StoryCondition, StoryEffect, StoryValue } from '../systems/StoryStateSystem';

export type TimeLayer = 'embers' | 'past' | 'grave' | 'subjective';
export type Perspective = 'juan' | 'pedro' | 'susana' | 'dorotea' | 'collective';
export type VoiceStyle = 'living' | 'ghost' | 'memory' | 'narration';

export interface ContentManifest {
  id: string;
  title: string;
  subtitle: string;
  saveVersion: number;
  startChapter: string;
  startMap: string;
  chapters: Array<{ id: string; title: string; dialogue: string[]; maps: string[] }>;
  content: {
    dialogues: string[];
    events: string[];
    characters: string[];
    items: string[];
    memories: string[];
    quests: string[];
    achievements: string[];
    endings: string[];
  };
}

export interface DialogueChoice {
  id: string;
  text: string;
  intent?: string;
  next?: string;
  conditions?: StoryCondition[];
  effects?: StoryEffect[];
  actions?: string[];
}

export interface DialogueBranch {
  conditions: StoryCondition[];
  next: string;
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  voice?: VoiceStyle;
  text: string;
  next?: string;
  branches?: DialogueBranch[];
  choices?: DialogueChoice[];
  onEnterEffects?: StoryEffect[];
  endingCheck?: boolean;
}

export interface DialogueRecord {
  id: string;
  speaker?: string;
  voice?: VoiceStyle;
  start?: string;
  nodes?: DialogueNode[];
  text?: string[];
}

export interface NarrativeInitialConfig {
  initialVariables: Record<string, StoryValue>;
}

