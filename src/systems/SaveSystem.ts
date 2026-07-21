import type { AchievementSaveData } from './AchievementSystem';
import type { EndingSaveData } from './EndingSystem';
import type { InventorySaveData } from './InventorySystem';
import type { QuestSaveData } from './QuestSystem';
import type { SerializedStoryState } from './StoryStateSystem';

export interface SaveData {
  version: 3;
  player: { x: number; y: number };
  currentMap: string;
  triggeredEvents: string[];
  inventory: InventorySaveData;
  story: SerializedStoryState;
  quests: QuestSaveData;
  achievements: AchievementSaveData;
  endings: EndingSaveData;
  updatedAt: string;
}

interface LegacySaveData {
  version: number;
  player: { x: number; y: number };
  currentMap: string;
  triggeredEvents?: string[];
  items?: string[];
  story?: SerializedStoryState & { reachedEndings?: string[] };
}

/** LocalStorage v3 存档，读取时自动迁移 v1/v2 数据。 */
export class SaveSystem {
  private readonly storageKey = 'pixel-town-story.save.v1';

  Save(data: Omit<SaveData, 'version' | 'updatedAt'>): boolean {
    try {
      const payload: SaveData = { ...data, version: 3, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('保存失败', error);
      return false;
    }
  }

  Load(): SaveData | null {
    try {
      const rawText = localStorage.getItem(this.storageKey);
      if (!rawText) return null;
      const raw = JSON.parse(rawText) as Partial<SaveData> & LegacySaveData;
      if (![1, 2, 3].includes(raw.version) || !raw.player || !raw.currentMap) return null;

      const legacyEntries = (raw.items ?? []).map((itemId) => ({ itemId, quantity: 1 }));
      const legacyEndings = raw.story?.reachedEndings ?? [];
      const currentEnding = raw.story?.variables?.current_ending;
      return {
        version: 3,
        player: raw.player,
        currentMap: raw.currentMap,
        triggeredEvents: raw.triggeredEvents ?? [],
        inventory: raw.inventory ?? { entries: legacyEntries },
        story: { variables: raw.story?.variables ?? {} },
        quests: raw.quests ?? { states: {} },
        achievements: raw.achievements ?? { unlocked: [], progress: {} },
        endings: raw.endings ?? {
          reached: legacyEndings,
          currentEnding: typeof currentEnding === 'string' ? currentEnding : '',
        },
        updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
      };
    } catch (error) {
      console.error('读取存档失败', error);
      return null;
    }
  }

  hasSave(): boolean {
    return this.Load() !== null;
  }
}
