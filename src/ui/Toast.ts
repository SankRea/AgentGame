import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { UI_THEME } from './Theme';

export class Toast {
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add.text(GAME_WIDTH / 2, 92, '', {
      fontFamily: UI_THEME.fonts.body,
      fontSize: '15px',
      color: UI_THEME.colors.chalk,
      backgroundColor: '#2a231ed9',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(10030).setScrollFactor(0).setAlpha(0);
  }

  show(message: string): void {
    this.text.setText(message).setAlpha(1);
    this.scene.tweens.killTweensOf(this.text);
    this.scene.tweens.add({ targets: this.text, alpha: 0, delay: 2100, duration: 550 });
  }
}

