import Phaser from 'phaser';
import achievementData from '../data/comala/achievements/chapter1.json';
import characterData from '../data/comala/characters/chapter1.json';
import chapterDialogue from '../data/comala/dialogue/chapter1.json';
import endingDialogue from '../data/comala/dialogue/endings.json';
import endingData from '../data/comala/endings/chapter1.json';
import eventData from '../data/comala/events/chapter1.json';
import itemData from '../data/comala/items/chapter1.json';
import manifest from '../data/comala/manifest.json';
import memoryData from '../data/comala/memories/chapter1.json';
import questData from '../data/comala/quests/chapter1.json';
import storyData from '../data/comala/story/initial.json';

/** 装载科马拉内容包，并生成可替换的原创程序化像素角色。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cache.json.add('manifest', manifest);
    this.cache.json.add('dialogues', [...chapterDialogue, ...endingDialogue]);
    this.cache.json.add('events', eventData);
    this.cache.json.add('items', itemData);
    this.cache.json.add('story', storyData);
    this.cache.json.add('quests', questData);
    this.cache.json.add('achievements', achievementData);
    this.cache.json.add('endings', endingData);
    this.cache.json.add('npcs', characterData);
    this.cache.json.add('memories', memoryData);
    this.createCharacterTextures();
    this.scene.start('MenuScene');
  }

  private createCharacterTextures(): void {
    this.drawPerson('juan-down', 'down', 0x3a3029, 0xb79a72, 0x66533d, 0x28241f);
    this.drawPerson('juan-up', 'up', 0x3a3029, 0xb79a72, 0x66533d, 0x28241f);
    this.drawPerson('juan-side', 'side', 0x3a3029, 0xb79a72, 0x66533d, 0x28241f);
    this.drawPerson('abundio', 'side', 0x2b2722, 0x967b58, 0x594b38, 0x25221f, true);
    this.drawPerson('eduviges', 'down', 0x322b2b, 0x9e8065, 0x5e4b4c, 0x252124, true);
    this.drawPerson('renteria', 'down', 0x171718, 0x9b7e65, 0x28272a, 0x151518, true);
  }

  private drawPerson(
    key: string,
    facing: 'down' | 'up' | 'side',
    hair: number,
    skin: number,
    shirt: number,
    trousers: number,
    faded = false,
  ): void {
    const graphics = this.add.graphics();
    const alpha = faded ? 0.78 : 1;
    graphics.fillStyle(trousers, alpha).fillRect(6, 19, 4, 7).fillRect(12, 19, 4, 7);
    graphics.fillStyle(shirt, alpha).fillRect(5, 10, 12, 11).fillRect(3, 12, 3, 7).fillRect(16, 12, 3, 7);
    graphics.fillStyle(skin, alpha).fillRect(6, 3, 10, 8);
    graphics.fillStyle(hair, alpha).fillRect(6, 2, 10, 3);
    if (facing === 'down') {
      graphics.fillStyle(0x211d1a, alpha).fillRect(8, 6, 2, 2).fillRect(13, 6, 2, 2);
    } else if (facing === 'up') {
      graphics.fillStyle(hair, alpha).fillRect(6, 4, 10, 5);
    } else {
      graphics.fillStyle(0x211d1a, alpha).fillRect(14, 6, 2, 2);
      graphics.fillStyle(skin, alpha).fillRect(16, 6, 2, 3);
    }
    if (faded) {
      graphics.fillStyle(0xc8b8a0, 0.2).fillRect(4, 9, 14, 1).fillRect(7, 17, 10, 1);
    }
    graphics.generateTexture(key, 22, 28);
    graphics.destroy();
  }
}
