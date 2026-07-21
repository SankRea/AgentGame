import Phaser from 'phaser';
import dialogueData from '../data/dialogue/chapter1.json';
import eventData from '../data/events/chapter1.json';
import itemData from '../data/items/chapter1.json';
import storyData from '../data/cultivation/initial.json';
import karmaData from '../data/cultivation/karma.json';
import questData from '../data/quests/chapter1.json';
import achievementData from '../data/achievements/chapter1.json';
import endingData from '../data/endings/chapter1.json';
import npcData from '../data/npcs/chapter1.json';
import characterSheetUrl from '../assets/sprites/characters-sheet.png?url';
import environmentSheetUrl from '../assets/sprites/environment-sheet.png?url';
import terrainTilesUrl from '../assets/sprites/terrain-tiles.png?url';

/** 加载正式像素 sprite sheet、Tiled 地图与剧情数据。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.spritesheet('characters', characterSheetUrl, {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('environment', environmentSheetUrl, {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image('terrain-tiles', terrainTilesUrl);

    this.cache.json.add('dialogues', dialogueData);
    this.cache.json.add('events', eventData);
    this.cache.json.add('items', itemData);
    this.cache.json.add('story', storyData);
    this.cache.json.add('cultivation', storyData);
    this.cache.json.add('karma', karmaData);
    this.cache.json.add('quests', questData);
    this.cache.json.add('achievements', achievementData);
    this.cache.json.add('endings', endingData);
    this.cache.json.add('npcs', npcData);
  }

  create(): void {
    this.createAnimations();
    this.scene.start('MenuScene');
  }

  private createAnimations(): void {
    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers('characters', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers('characters', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'player-walk-side',
      frames: this.anims.generateFrameNumbers('characters', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'npc-old-man-idle',
      frames: this.anims.generateFrameNumbers('characters', { start: 12, end: 15 }),
      frameRate: 3,
      repeat: -1,
      yoyo: true,
    });

    const environmentAnimations = [
      { key: 'environment-lantern', start: 0, end: 3, frameRate: 7 },
      { key: 'environment-well', start: 4, end: 7, frameRate: 4 },
      { key: 'environment-tree', start: 8, end: 11, frameRate: 2 },
      { key: 'environment-flowers', start: 12, end: 15, frameRate: 3 },
    ];
    environmentAnimations.forEach((animation) => this.anims.create({
      key: animation.key,
      frames: this.anims.generateFrameNumbers('environment', {
        start: animation.start,
        end: animation.end,
      }),
      frameRate: animation.frameRate,
      repeat: -1,
      yoyo: true,
    }));
  }
}
