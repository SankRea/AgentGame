import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { DustSystem } from '../effects/DustSystem';
import { HeatHazeEffect } from '../effects/HeatHazeEffect';
import { MemoryBleedEffect } from '../effects/MemoryBleedEffect';
import { MurmurEffect } from '../effects/MurmurEffect';
import { ComalaMap, type ComalaMapRuntime } from '../maps/ComalaMap';
import { AchievementSystem } from '../systems/AchievementSystem';
import { ambientAudio } from '../systems/AmbientAudioSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { EndingSystem, type EndingDefinition } from '../systems/EndingSystem';
import { EventSystem } from '../systems/EventSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { ItemSystem } from '../systems/ItemSystem';
import { NarrativeStatusSystem } from '../systems/NarrativeStatusSystem';
import { QuestSystem, type ProgressEvent } from '../systems/QuestSystem';
import { SaveSystem, type GameSettings } from '../systems/SaveSystem';
import { StoryStateSystem } from '../systems/StoryStateSystem';
import type { VoiceStyle } from '../types/content';
import { GameHUD } from '../ui/GameHUD';

interface SceneData {
  loadSave?: boolean;
}

interface NPCData {
  id: string;
  map: string;
  name: string;
  dialogueId: string;
  texture: string;
  voice?: VoiceStyle;
  x?: number;
  y?: number;
  enabled: boolean;
}

/** 科马拉纵向切片：探索、聆听、调查、时间层切换与墓中结局闭环。 */
export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private npcColliders: Phaser.Physics.Arcade.Collider[] = [];
  private mapCollider?: Phaser.Physics.Arcade.Collider;
  private mapRuntime?: ComalaMapRuntime;
  private readonly mapProvider = new ComalaMap();
  private dialogue!: DialogueSystem;
  private eventsSystem!: EventSystem;
  private inventory!: InventorySystem;
  private storyState!: StoryStateSystem;
  private narrative!: NarrativeStatusSystem;
  private questSystem!: QuestSystem;
  private achievementSystem!: AchievementSystem;
  private endingSystem!: EndingSystem;
  private readonly saveSystem = new SaveSystem();
  private settings!: GameSettings;
  private readonly completedDialogues = new Set<string>();
  private hud?: GameHUD;
  private heatHaze?: HeatHazeEffect;
  private dust?: DustSystem;
  private memoryBleed?: MemoryBleedEffect;
  private murmurEffect?: MurmurEffect;
  private removeCaptionListener?: () => void;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private saveKey!: Phaser.Input.Keyboard.Key;
  private journalKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private currentMap = 'comala';
  private shouldLoadSave = false;
  private lastTimeLayer = '';
  private pendingEnding?: EndingDefinition;
  private endingTransition = false;
  private suppressPauseUntil = 0;

  constructor() {
    super('GameScene');
  }

  init(data: SceneData): void {
    this.shouldLoadSave = data.loadSave ?? false;
    this.pendingEnding = undefined;
    this.endingTransition = false;
    this.completedDialogues.clear();
    this.lastTimeLayer = '';
    this.suppressPauseUntil = 0;
  }

  create(): void {
    const save = this.shouldLoadSave ? this.saveSystem.Load() : null;
    if (!this.shouldLoadSave) this.saveSystem.deleteSave();
    this.settings = save?.settings ?? this.saveSystem.LoadSettings();
    ambientAudio.setMuted(false);
    ambientAudio.setVolume(this.settings.masterVolume);
    ambientAudio.setEnvironmentVolume(this.settings.environmentVolume);
    ambientAudio.setDialogueVolume(this.settings.dialogueVolume);

    this.player = new Player(this, 0, 0);
    this.storyState = new StoryStateSystem(this.cache.json.get('story'));
    this.narrative = new NarrativeStatusSystem(this.storyState);
    this.inventory = new InventorySystem(new ItemSystem(this.cache.json.get('items')));

    this.achievementSystem = new AchievementSystem(this.cache.json.get('achievements'), (achievement) => {
      this.hud?.showToast(`新的回声：${achievement.title}`);
      if (this.hud) this.saveGame(false);
    });
    this.endingSystem = new EndingSystem(
      this.cache.json.get('endings'),
      this.storyState,
      (ending) => {
        this.pendingEnding = ending;
        this.emitProgressEvent({ type: 'ending_reached', target: ending.id });
      },
    );
    this.dialogue = new DialogueSystem(
      this,
      this.storyState,
      this.endingSystem,
      undefined,
      (type, target) => this.handleNarrativeEvent(type, target),
    );
    this.questSystem = new QuestSystem(
      this.cache.json.get('quests'),
      this.inventory,
      this.storyState,
      (update) => {
        if (!this.hud) return;
        if (update.type === 'completed') this.hud.showToast(`遗愿留下回声：${update.title}`);
        this.refreshNarrative();
        this.saveGame(false);
      },
    );
    this.inventory.onChanged((change) => {
      if (change.type === 'added') {
        this.emitProgressEvent({ type: 'item_obtained', target: change.itemId, amount: change.amount });
      }
      if (this.hud) {
        this.refreshNarrative();
        this.saveGame(false);
      }
    });
    this.eventsSystem = new EventSystem(
      this,
      this.dialogue,
      this.inventory,
      this.storyState,
      (message) => {
        this.refreshNarrative();
        this.saveGame(false);
        if (message) this.hud?.showToast(message);
        if (this.pendingEnding) this.finishEnding();
      },
      (type, target, amount) => this.emitProgressEvent({ type, target, amount }),
    );

    if (save) {
      this.storyState.restore(save.story);
      this.inventory.restore(save.inventory);
      this.questSystem.restore(save.quests);
      this.achievementSystem.restore(save.achievements);
      this.endingSystem.restore(save.endings);
      this.eventsSystem.restore(save.triggeredEvents);
      save.completedDialogues.forEach((id) => this.completedDialogues.add(id));
    }

    this.createChapterMap(save?.player);
    this.heatHaze = new HeatHazeEffect(this);
    this.dust = new DustSystem(this, this.mapRuntime?.width ?? 1680, this.mapRuntime?.height ?? 1040);
    this.memoryBleed = new MemoryBleedEffect(this);
    this.murmurEffect = new MurmurEffect(this);
    this.hud = new GameHUD(this, this.settings, {
      onSettingsChanged: (settings) => this.applySettings(settings),
      onReturnToTitle: () => {
        this.saveGame(false);
        this.scene.start('MenuScene');
      },
      onDeleteSave: () => {
        this.saveSystem.deleteSave();
        this.scene.start('MenuScene');
      },
    });
    this.applySettings(this.settings);
    this.removeCaptionListener = ambientAudio.onCaption((caption) => this.hud?.showDirectionalCaption(caption));
    this.hud.setLocation(this.mapRuntime?.name ?? '科马拉');
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.saveKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.journalKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.keyboard?.on('keydown', this.handleHudKey, this);
    this.refreshNarrative();
    void ambientAudio.start();

    if (save) {
      this.hud.showToast('脚步回到上一次停下的地方。');
    } else {
      this.time.delayedCall(420, () => {
        this.dialogue.start('prologue_mothers_wish', () => {
          this.completedDialogues.add('prologue_mothers_wish');
          this.refreshNarrative();
          this.saveGame(false);
        });
      });
    }
    this.cameras.main.fadeIn(750, 222, 215, 188);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(): void {
    if (!this.hud || this.endingTransition) return;
    if (
      !this.dialogue.isActive
      && this.time.now > this.suppressPauseUntil
      && Phaser.Input.Keyboard.JustDown(this.pauseKey)
    ) {
      this.hud.togglePause();
    }
    if (!this.dialogue.isActive && Phaser.Input.Keyboard.JustDown(this.journalKey)) {
      this.hud.toggleJournal();
    }

    const canMove = !this.dialogue.isActive && !this.hud.isBlocking;
    this.player.updateMovement(canMove);
    const nearbyNpc = this.npcs.find((npc) => npc.alpha > 0.3 && npc.canInteract(this.player));
    this.npcs.forEach((npc) => npc.updateIndicator(this.player, canMove && npc.alpha > 0.3));
    this.updatePrompt(nearbyNpc);
    this.applyNarrativePresentation();
    if (!canMove) return;

    this.eventsSystem.update(this.player);
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (nearbyNpc) {
        this.dialogue.start(nearbyNpc.dialogueId, () => {
          this.refreshNarrative();
          this.saveGame(false);
        });
      } else if (!this.eventsSystem.investigate(this.player)) {
        this.hud.showToast('这里没有回答，只有热风贴着墙移动。');
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.saveKey)) this.saveGame(true);
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
        texture: npc.texture,
        voice: npc.voice,
        x: npc.x!,
        y: npc.y!,
      }));
    this.npcColliders = this.npcs.map((npc) => this.physics.add.collider(this.player, npc));
  }

  private handleNarrativeEvent(type: string, target: string): void {
    if (type === 'dialogue_completed') {
      this.completedDialogues.add(target);
      this.emitProgressEvent({ type: 'dialogue_complete', target });
    } else {
      this.emitProgressEvent({ type, target });
    }
    this.refreshNarrative();
  }

  private updatePrompt(nearbyNpc?: NPC): void {
    if (!this.hud) return;
    if (nearbyNpc) {
      this.hud.setPrompt(`与${nearbyNpc.displayName}交谈`);
      return;
    }
    this.hud.setPrompt(this.eventsSystem.getInteractionPrompt(this.player));
  }

  private refreshNarrative(): void {
    if (!this.hud || !this.narrative) return;
    const status = this.narrative.status;
    const items = this.inventory.getOwnedItems().map((item) => item.name);
    this.hud.updateNarrative(status, this.narrative.objectiveLine, this.narrative.sensoryLine, items);
    const layerNames = { embers: '空街', past: '往昔覆影', grave: '墓中', subjective: '主观记忆' };
    this.hud.setLocation(`科马拉 · ${layerNames[status.currentTimeLayer]}`);
    ambientAudio.setSceneMix({
      murmurs: status.murmurs,
      timeLayer: status.currentTimeLayer,
      location: this.currentMap,
    });
  }

  private applyNarrativePresentation(): void {
    const status = this.narrative.status;
    this.heatHaze?.update(this.player.x);
    this.murmurEffect?.update(status.murmurs, status.isDead);
    this.player.setDead(status.isDead);
    if (this.lastTimeLayer === status.currentTimeLayer) return;
    this.lastTimeLayer = status.currentTimeLayer;
    this.mapRuntime?.setTimeLayer(status.currentTimeLayer);
    this.memoryBleed?.transitionTo(status.currentTimeLayer);
    this.dust?.setMutedByLayer(status.currentTimeLayer === 'grave');
    this.npcs.forEach((npc) => {
      npc.setLayerVisibility(npc.voice !== 'memory' || status.currentTimeLayer === 'past');
    });
    if (this.settings.subtleFlashes) this.cameras.main.flash(90, 217, 208, 180, false);
    if (this.settings.shakeIntensity > 0 && status.currentTimeLayer === 'grave') {
      this.cameras.main.shake(160, 0.0014 * this.settings.shakeIntensity);
    }
    this.refreshNarrative();
    if (status.currentTimeLayer === 'past') this.hud?.showToast('同一面墙短暂显出了过去。');
    if (status.currentTimeLayer === 'grave') this.hud?.showToast('叙述的位置已经移到土下。');
  }

  private emitProgressEvent(event: ProgressEvent): void {
    this.questSystem?.notify(event);
    this.achievementSystem?.notify(event);
  }

  private saveGame(showFeedback: boolean): void {
    if (!this.player || !this.eventsSystem) return;
    const success = this.saveSystem.Save({
      title: this.createSaveTitle(),
      currentChapter: this.narrative.status.currentChapter,
      currentMap: this.currentMap,
      spawn: 'last_position',
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      triggeredEvents: this.eventsSystem.serialize(),
      completedDialogues: [...this.completedDialogues],
      inventory: this.inventory.serialize(),
      story: this.storyState.serialize(),
      quests: this.questSystem.serialize(),
      achievements: this.achievementSystem.serialize(),
      endings: this.endingSystem.serialize(),
      settings: this.settings,
    });
    if (showFeedback) {
      this.hud?.showToast(success ? '记忆已经写入。' : '记忆没有留下，请稍后再试。');
    }
  }

  private finishEnding(): void {
    if (!this.pendingEnding || this.endingTransition) return;
    this.endingTransition = true;
    const ending = this.pendingEnding;
    this.saveGame(false);
    this.cameras.main.fadeOut(700, 48, 50, 53);
    this.time.delayedCall(730, () => this.scene.start('EndingScene', { ending }));
  }

  private shutdown(): void {
    this.input.keyboard?.off('keydown', this.handleHudKey, this);
    this.removeCaptionListener?.();
    this.removeCaptionListener = undefined;
    this.heatHaze?.destroy();
    this.dust?.destroy();
    this.memoryBleed?.destroy();
    this.murmurEffect?.destroy();
    this.heatHaze = undefined;
    this.dust = undefined;
    this.memoryBleed = undefined;
    this.murmurEffect = undefined;
    this.mapCollider?.destroy();
    this.npcColliders.forEach((collider) => collider.destroy());
    this.npcColliders = [];
    this.mapProvider.destroy();
    void ambientAudio.pause();
  }

  private handleHudKey(event: KeyboardEvent): void {
    if (this.hud?.handleKey(event)) {
      this.suppressPauseUntil = this.time.now + 80;
      event.preventDefault();
    }
  }

  private applySettings(settings: GameSettings): void {
    this.settings = settings;
    this.saveSystem.SaveSettings(settings);
    ambientAudio.setVolume(settings.masterVolume);
    ambientAudio.setEnvironmentVolume(settings.environmentVolume);
    ambientAudio.setDialogueVolume(settings.dialogueVolume);
    this.heatHaze?.configure(settings.heatHaze, 0.45);
    this.hud?.applySettings(settings);
  }

  private createSaveTitle(): string {
    const names = {
      embers: '灼热的空街',
      past: '墙上的往昔',
      grave: '土下的低语',
      subjective: '无法证实的下午',
    };
    return `科马拉 · ${names[this.narrative.status.currentTimeLayer]}`;
  }
}
