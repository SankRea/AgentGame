import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { QingxuanTempleMap, type ProceduralMapRuntime } from '../maps/QingxuanTempleMap';
import { AchievementSystem } from '../systems/AchievementSystem';
import { CultivationSystem } from '../systems/CultivationSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { EndingSystem } from '../systems/EndingSystem';
import { EventSystem } from '../systems/EventSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { ItemSystem } from '../systems/ItemSystem';
import { QuestSystem, type ProgressEvent } from '../systems/QuestSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { StoryStateSystem } from '../systems/StoryStateSystem';

interface SceneData {
  loadSave?: boolean;
}

interface NPCData {
  id: string;
  map: string;
  name: string;
  dialogueId: string;
  texture?: string;
  animation?: string;
  x?: number;
  y?: number;
  enabled: boolean;
}

/** 第一章主场景：系统装配与青玄观 Graphics 地图运行时。 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private npcColliders: Phaser.Physics.Arcade.Collider[] = [];
  private mapCollider?: Phaser.Physics.Arcade.Collider;
  private mapRuntime?: ProceduralMapRuntime;
  private readonly mapProvider = new QingxuanTempleMap();
  private dialogue!: DialogueSystem;
  private eventsSystem!: EventSystem;
  private inventory!: InventorySystem;
  private storyState!: StoryStateSystem;
  private cultivation!: CultivationSystem;
  private questSystem!: QuestSystem;
  private achievementSystem!: AchievementSystem;
  private endingSystem!: EndingSystem;
  private readonly saveSystem = new SaveSystem();
  private interactKey!: Phaser.Input.Keyboard.Key;
  private saveKey!: Phaser.Input.Keyboard.Key;
  private useItemKey!: Phaser.Input.Keyboard.Key;
  private statusText!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private horrorOverlay!: Phaser.GameObjects.Rectangle;
  private currentMap = 'qingxuan_temple';
  private shouldLoadSave = false;

  constructor() {
    super('GameScene');
  }

  init(data: SceneData): void {
    this.shouldLoadSave = data.loadSave ?? false;
  }

  create(): void {
    this.player = new Player(this, 0, 0);
    this.storyState = new StoryStateSystem(this.cache.json.get('story'));
    this.cultivation = new CultivationSystem(
      this.storyState,
      this.cache.json.get('karma'),
      this.cache.json.get('cultivation'),
    );
    const itemSystem = new ItemSystem(this.cache.json.get('items'));
    this.inventory = new InventorySystem(itemSystem);

    this.achievementSystem = new AchievementSystem(this.cache.json.get('achievements'), (achievement) => {
      this.showToast(`命书有记：${achievement.title}`);
      if (this.toastText) this.saveGame(false);
    });
    this.endingSystem = new EndingSystem(
      this.cache.json.get('endings'),
      this.storyState,
      (ending) => {
        this.emitProgressEvent({ type: 'ending_reached', target: ending.id });
        this.showToast(`命数已定：${ending.name}`);
      },
    );
    this.dialogue = new DialogueSystem(this, this.storyState, this.endingSystem, (actionId) => {
      this.cultivation.applyKarma(actionId);
      this.refreshStatus();
    });
    this.questSystem = new QuestSystem(
      this.cache.json.get('quests'),
      this.inventory,
      this.storyState,
      (update) => {
        this.refreshQuest();
        if (update.type === 'completed') {
          this.emitProgressEvent({ type: 'quest_completed', target: update.questId });
          this.showToast(`因缘已结：${update.title}`);
        } else if (update.type === 'started') {
          this.showToast(`新因缘：${update.title}`);
        }
        if (this.toastText) this.saveGame(false);
      },
    );
    this.inventory.onChanged((change) => {
      this.refreshInventory();
      if (change.type === 'added') {
        this.emitProgressEvent({ type: 'item_obtained', target: change.itemId, amount: change.amount });
      } else if (change.type === 'used') {
        this.emitProgressEvent({ type: 'item_used', target: change.itemId, amount: change.amount });
      }
      this.refreshStatus();
      if (this.toastText) this.saveGame(false);
    });
    this.eventsSystem = new EventSystem(
      this,
      this.dialogue,
      this.inventory,
      this.storyState,
      (message) => {
        this.refreshInventory();
        this.refreshStatus();
        this.saveGame(false);
        if (message) this.showToast(message);
      },
      (type, target, amount) => this.emitProgressEvent({ type, target, amount }),
    );

    const save = this.shouldLoadSave ? this.saveSystem.Load() : null;
    if (save) {
      this.storyState.restore(save.story);
      this.inventory.restore(save.inventory);
      this.questSystem.restore(save.quests);
      this.achievementSystem.restore(save.achievements);
      this.endingSystem.restore(save.endings);
      this.eventsSystem.restore(save.triggeredEvents);
    }

    const useSavedPosition = save?.currentMap === this.currentMap;
    this.createChapterMap(useSavedPosition ? save?.player : undefined);
    this.createHud();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.saveKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.useItemKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.refreshAllHud();
    if (save) this.showToast('残卷续写，命数未绝。');
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.mapProvider.destroy());
  }

  update(time: number): void {
    const canMove = !this.dialogue.isActive;
    this.player.updateMovement(canMove);
    this.npcs.forEach((npc) => npc.updateIndicator(this.player, canMove && npc.alpha > 0.5));
    this.updateHorrorEffects(time);
    if (!canMove) return;

    this.eventsSystem.update(this.player);
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const npc = this.npcs.find((candidate) => candidate.alpha > 0.5 && candidate.canInteract(this.player));
      if (npc) {
        this.dialogue.start(npc.dialogueId, () => {
          this.emitProgressEvent({ type: 'dialogue_complete', target: npc.dialogueId });
          this.refreshAllHud();
          this.saveGame(false);
        });
      } else if (!this.eventsSystem.investigate(this.player)) {
        this.showToast('香灰未动，此处没有回应。');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.saveKey)) this.saveGame(true);
    if (Phaser.Input.Keyboard.JustDown(this.useItemKey)) {
      const used = this.inventory.use('grave_talisman', this.storyState);
      if (used) this.cultivation.changeSanity(0);
      this.refreshAllHud();
      this.showToast(used ? '黄符燃尽，心魔暂退。' : '你身上没有可用的镇尸黄符。');
    }
  }

  private createChapterMap(savedPosition?: { x: number; y: number }): void {
    this.mapRuntime = this.mapProvider.create(this);
    this.mapCollider = this.physics.add.collider(this.player, this.mapRuntime.obstacles);
    this.eventsSystem.activateDataMap(this.currentMap);
    this.createNPCsFromData();
    this.player.setPosition(savedPosition?.x ?? this.mapRuntime.spawn.x, savedPosition?.y ?? this.mapRuntime.spawn.y);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.emitProgressEvent({ type: 'map_entered', target: this.currentMap });
  }

  private createNPCsFromData(): void {
    const definitions = this.cache.json.get('npcs') as NPCData[];
    this.npcs = definitions
      .filter((npc) => npc.enabled && npc.map === this.currentMap && npc.x !== undefined && npc.y !== undefined)
      .map((npc) => new NPC(this, {
        id: npc.id,
        name: npc.name,
        dialogueId: npc.dialogueId,
        texture: npc.texture ?? 'characters',
        animation: npc.animation ?? 'npc-old-man-idle',
        x: npc.x!,
        y: npc.y!,
      }));
    this.npcColliders = this.npcs.map((npc) => this.physics.add.collider(this.player, npc));
  }

  private createHud(): void {
    const scrollStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'STKaiti, KaiTi, serif', color: '#e1d2aa', backgroundColor: '#17110de6',
      padding: { x: 10, y: 6 },
    };
    this.mapText = this.add.text(18, 16, this.mapRuntime?.name ?? '青玄观', {
      ...scrollStyle, fontSize: '17px', color: '#ba4b3f',
    }).setDepth(10000).setScrollFactor(0);
    this.statusText = this.add.text(GAME_WIDTH - 18, 16, '', {
      ...scrollStyle, fontSize: '14px', align: 'right',
    }).setOrigin(1, 0).setDepth(10000).setScrollFactor(0);
    this.questText = this.add.text(18, 56, '', {
      ...scrollStyle, fontSize: '13px', color: '#c8ba91',
    }).setDepth(10000).setScrollFactor(0);
    this.inventoryText = this.add.text(GAME_WIDTH - 18, 54, '', {
      ...scrollStyle, fontSize: '12px', color: '#afa382', align: 'right',
    }).setOrigin(1, 0).setDepth(10000).setScrollFactor(0);
    this.toastText = this.add.text(GAME_WIDTH / 2, 104, '', {
      ...scrollStyle, fontSize: '16px', color: '#d7b17b',
    }).setOrigin(0.5).setDepth(10020).setAlpha(0).setScrollFactor(0);
    this.add.text(18, GAME_HEIGHT - 16, '行走 WASD / 方向键   探查 E   用符 U   记命 K', {
      ...scrollStyle, fontFamily: 'monospace', fontSize: '12px', color: '#968c75',
    }).setOrigin(0, 1).setDepth(10000).setScrollFactor(0);
    this.horrorOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x4a0808, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(8000).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  private refreshAllHud(): void {
    this.refreshStatus();
    this.refreshInventory();
    this.refreshQuest();
  }

  private refreshStatus(): void {
    if (!this.statusText) return;
    const status = this.cultivation.status;
    this.statusText.setText(
      `命数 ${status.life}   神识 ${status.spiritualSense}   因果 ${status.karma}\n心魔 ${status.innerDemon}`,
    );
  }

  private refreshInventory(): void {
    if (!this.inventoryText) return;
    const names = this.inventory.getOwnedItems().map((item) =>
      item.quantity > 1 ? `${item.name}×${item.quantity}` : item.name,
    );
    this.inventoryText.setText(`行囊：${names.length ? names.join('、') : '空'}`);
  }

  private refreshQuest(): void {
    this.questText?.setText(`因缘：${this.questSystem.getActiveSummary()}`);
  }

  private updateHorrorEffects(time: number): void {
    if (!this.horrorOverlay) return;
    const demon = this.cultivation.status.innerDemon;
    const pulse = (Math.sin(time / 480) + 1) * 0.5;
    this.horrorOverlay.setAlpha(demon >= 25 ? Math.min(0.18, demon / 500) * (0.55 + pulse * 0.45) : 0);
    if (this.cultivation.hasHallucinations()) {
      const visible = Math.sin(time / 290) > -0.78;
      this.npcs.forEach((npc) => npc.setAlpha(visible ? 1 : 0.08));
    } else {
      this.npcs.forEach((npc) => npc.setAlpha(1));
    }
  }

  private emitProgressEvent(event: ProgressEvent): void {
    this.questSystem?.notify(event);
    this.achievementSystem?.notify(event);
  }

  private showToast(message: string): void {
    if (!this.toastText) return;
    this.toastText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 500 });
  }

  private saveGame(showFeedback: boolean): void {
    const success = this.saveSystem.Save({
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      currentMap: this.currentMap,
      triggeredEvents: this.eventsSystem.serialize(),
      inventory: this.inventory.serialize(),
      story: this.storyState.serialize(),
      quests: this.questSystem.serialize(),
      achievements: this.achievementSystem.serialize(),
      endings: this.endingSystem.serialize(),
    });
    if (showFeedback) this.showToast(success ? '命数已记入残卷。' : '残卷受潮，命数未能写下。');
  }
}
