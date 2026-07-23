import type { AchievementSaveData } from './AchievementSystem';
import type { EndingSaveData } from './EndingSystem';
import type { InventorySaveData } from './InventorySystem';
import type { QuestSaveData } from './QuestSystem';
import type { SerializedStoryState } from './StoryStateSystem';

export interface GameSettings {
  masterVolume: number;
  environmentVolume: number;
  dialogueVolume: number;
  textSpeed: number;
  autoAdvance: boolean;
  shakeIntensity: number;
  heatHaze: boolean;
  subtleFlashes: boolean;
  highContrastText: boolean;
  directionalCaptions: boolean;
}
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  masterVolume: 0.65,
  environmentVolume: 0.72,
  dialogueVolume: 0.7,
  textSpeed: 24,
  autoAdvance: false,
  shakeIntensity: 0.35,
  heatHaze: true,
  subtleFlashes: false,
  highContrastText: false,
  directionalCaptions: true,
};

export interface SaveData {
  version: 1;
  title: string;
  currentChapter: string;
  currentMap: string;
  spawn: string;
  player: { x: number; y: number };
  triggeredEvents: string[];
  completedDialogues: string[];
  inventory: InventorySaveData;
  story: SerializedStoryState;
  quests: QuestSaveData;
  achievements: AchievementSaveData;
  endings: EndingSaveData;
  settings: GameSettings;
  updatedAt: string;
}

/** 科马拉独立存档与设置；不会读取旧题材存档。 */
export class SaveSystem {
  private readonly storageKey = 'comala-whispers.save.v1';
  private readonly settingsKey = 'comala-whispers.settings.v1';

  Save(data: Omit<SaveData, 'version' | 'updatedAt'>): boolean {
    try {
      const payload: SaveData = { ...data, version: 1, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      this.SaveSettings(data.settings);
      return true;
    } catch (error) {
      console.error('无法写入科马拉存档', error);
      return false;
    }
  }

  Load(): SaveData | null {
    try {
      const text = localStorage.getItem(this.storageKey);
      if (!text) return null;
      const raw = JSON.parse(text) as Partial<SaveData> & {
        settings?: Partial<GameSettings> & { muted?: boolean };
      };
      if (raw.version !== 1 || !raw.player || raw.currentMap !== 'comala' || !raw.story) return null;
      const settings = this.normalizeSettings(raw.settings);
      return {
        version: 1,
        title: raw.title ?? '科马拉 · 一段未说完的话',
        currentChapter: raw.currentChapter ?? 'chapter_1_descent',
        currentMap: 'comala',
        spawn: raw.spawn ?? 'last_position',
        player: raw.player,
        triggeredEvents: raw.triggeredEvents ?? [],
        completedDialogues: raw.completedDialogues ?? [],
        inventory: raw.inventory ?? { entries: [] },
        story: raw.story,
        quests: raw.quests ?? { states: {} },
        achievements: raw.achievements ?? { unlocked: [], progress: {} },
        endings: raw.endings ?? { reached: [], currentEnding: '' },
        settings,
        updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
      };
    } catch (error) {
      console.error('科马拉存档损坏，已回退到新旅程', error);
      return null;
    }
  }

  LoadSettings(): GameSettings {
    try {
      const text = localStorage.getItem(this.settingsKey);
      if (text) return this.normalizeSettings(JSON.parse(text) as Partial<GameSettings>);
      return this.Load()?.settings ?? { ...DEFAULT_GAME_SETTINGS };
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  SaveSettings(settings: GameSettings): void {
    localStorage.setItem(this.settingsKey, JSON.stringify(this.normalizeSettings(settings)));
  }

  hasSave(): boolean {
    return this.Load() !== null;
  }

  deleteSave(): void {
    localStorage.removeItem(this.storageKey);
  }

  private normalizeSettings(
    settings?: Partial<GameSettings> & { muted?: boolean },
  ): GameSettings {
    return {
      ...DEFAULT_GAME_SETTINGS,
      ...settings,
      masterVolume: settings?.muted ? 0 : settings?.masterVolume ?? DEFAULT_GAME_SETTINGS.masterVolume,
      environmentVolume: settings?.environmentVolume ?? DEFAULT_GAME_SETTINGS.environmentVolume,
      dialogueVolume: settings?.dialogueVolume ?? DEFAULT_GAME_SETTINGS.dialogueVolume,
      textSpeed: settings?.textSpeed ?? DEFAULT_GAME_SETTINGS.textSpeed,
      shakeIntensity: settings?.shakeIntensity ?? DEFAULT_GAME_SETTINGS.shakeIntensity,
    };
  }
}
