import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/GameConfig';
import type { DirectionalCaption as CaptionData } from '../systems/AmbientAudioSystem';
import { UI_THEME } from './Theme';

/** 重要环境声的可选方向字幕。 */
export class DirectionalCaption {
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add.text(GAME_WIDTH / 2, 118, '', {
      fontFamily: UI_THEME.fonts.ui,
      fontSize: '12px',
      color: '#f0eee6',
      backgroundColor: '#303438d9',
      padding: { x: 9, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10025).setAlpha(0);
  }

  show(caption: CaptionData): void {
    const position = {
      左侧: { x: 74, y: GAME_HEIGHT / 2, originX: 0 },
      右侧: { x: GAME_WIDTH - 74, y: GAME_HEIGHT / 2, originX: 1 },
      前方: { x: GAME_WIDTH / 2, y: 104, originX: 0.5 },
      远处: { x: GAME_WIDTH / 2, y: 78, originX: 0.5 },
      地下: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 82, originX: 0.5 },
    }[caption.direction];
    this.text.setPosition(position.x, position.y)
      .setOrigin(position.originX, 0.5)
      .setText(`[${caption.direction}] ${caption.text}`)
      .setAlpha(0.9);
    this.scene.tweens.killTweensOf(this.text);
    this.scene.tweens.add({ targets: this.text, alpha: 0, delay: 2100, duration: 650 });
  }
}
