import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import { VISUAL_THEME } from '../config/VisualTheme';
import type { EndingDefinition } from '../systems/EndingSystem';
import { UI_THEME } from '../ui/Theme';

interface EndingSceneData {
  ending?: EndingDefinition;
}

/** 正式结局画面；结局后不再返回地图漫游。 */
export class EndingScene extends Phaser.Scene {
  private ending?: EndingDefinition;

  constructor() {
    super('EndingScene');
  }

  init(data: EndingSceneData): void {
    this.ending = data.ending;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#303235');
    const g = this.add.graphics();
    g.fillStyle(0x303235).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(VISUAL_THEME.murmur.grayViolet, 0.3).fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT + 20, 820, 300);
    for (let index = 0; index < 34; index += 1) {
      g.fillStyle(index % 3 === 0 ? VISUAL_THEME.accent.spiritWhite : VISUAL_THEME.murmur.coldGrayBlue, 0.16);
      g.fillRect((index * 97) % GAME_WIDTH, 80 + ((index * 53) % 390), 2, 2);
    }

    this.add.text(GAME_WIDTH / 2, 112, this.ending?.name ?? '科马拉保持沉默', {
      fontFamily: UI_THEME.fonts.display,
      fontSize: '36px',
      color: UI_THEME.colors.chalk,
      align: 'center',
    }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, 157, 360, 1, UI_THEME.colors.dust, 0.7);
    this.add.text(GAME_WIDTH / 2, 205, this.ending?.description ?? '没有一个声音替这段旅程作证。', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '18px',
      color: '#c8c8bd',
      align: 'center',
      lineSpacing: 9,
      wordWrap: { width: 620 },
    }).setOrigin(0.5, 0);

    const returnText = this.add.text(GAME_WIDTH / 2, 420, '返回标题', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '19px',
      color: '#e4e1d4',
      backgroundColor: '#4b5052cc',
      padding: { x: 22, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    returnText.on('pointerover', () => returnText.setColor('#ffffff'));
    returnText.on('pointerout', () => returnText.setColor('#e4e1d4'));
    returnText.on('pointerdown', () => {
      this.cameras.main.fadeOut(450, 217, 208, 180);
      this.time.delayedCall(480, () => this.scene.start('MenuScene'));
    });
    this.add.text(GAME_WIDTH / 2, 492, '结局已写入记忆。', {
      fontFamily: UI_THEME.fonts.mono,
      fontSize: '12px',
      color: '#899594',
    }).setOrigin(0.5);
    this.cameras.main.fadeIn(800, 48, 50, 53);
  }
}
